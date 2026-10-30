// Run with: node --test tests/
// Department listings: General Studies for everybody, electives included, years split in semesters.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATALOG, listCourses, groupByYearAndSemester, withoutRepeatedTitles } from '../src/lib/catalog.ts';
const titleKey = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const departments = CATALOG.flatMap((f) => f.departments.map((d) => ({ f: f.slug, d: d.slug })));
const gst = CATALOG.find((f) => f.slug === 'general-studies').departments[0].courses;

test('every department lists every General Studies title, pointing at its one canonical page', () => {
	for (const { f, d } of departments) {
		const list = listCourses(f, d);
		for (const g of gst) {
			const hit = list.filter((c) => c.year === g.year && titleKey(c.name) === titleKey(g.name) && (f === 'general-studies' || c.shared));
			assert.equal(hit.length, 1, `${g.slug} (${g.name}) listed ${hit.length} times in ${f}/${d}`);
			if (f !== 'general-studies') assert.match(hit[0].href, /^\/faculties\/general-studies\/general-studies\/[a-z0-9-]+$/);
		}
	}
});

test('a title appears once per year in every list (codes differ between universities, titles do not)', () => {
	for (const { f, d } of departments) {
		const seen = new Set();
		for (const c of listCourses(f, d)) {
			const k = `${c.year}|${titleKey(c.name)}`;
			assert.ok(!seen.has(k), `${f}/${d}: "${c.name}" repeated in year ${c.year}`);
			seen.add(k);
		}
	}
	// the later (newer-scheme) entry survives
	const out = withoutRepeatedTitles([
		{ slug: 'a', name: 'Nigerian Peoples and Culture', year: 1 },
		{ slug: 'b', name: 'Nigerian Peoples and Culture!', year: 1 }
	]);
	assert.deepEqual(out.map((c) => c.slug), ['b']);
});

test('year 1 of every department shows the year-1 General Studies courses', () => {
	const year1 = gst.filter((c) => c.year === 1).map((c) => c.slug);
	assert.ok(year1.length > 0);
	for (const { f, d } of departments) {
		const y1 = groupByYearAndSemester(listCourses(f, d)).find((y) => y.year === 1);
		assert.ok(y1, `no year 1 in ${f}/${d}`);
		const titles = y1.semesters.flatMap((s) => s.courses.map((c) => titleKey(c.name)));
		for (const s of year1) assert.ok(titles.includes(titleKey(gst.find((g) => g.slug === s).name)), `${s} missing from year 1 of ${f}/${d}`);
	}
});

test('year 1-2 electives from the curriculum are in the catalog', () => {
	const slug = (d) => CATALOG.flatMap((f) => f.departments).find((x) => x.slug === d).courses;
	assert.ok(slug('common-law').filter((c) => c.kind === 'elective' && c.year === 2).length >= 4);
	assert.ok(slug('economics').filter((c) => c.kind === 'elective' && c.year === 2).length >= 6);
	assert.ok(slug('microbiology').some((c) => c.kind === 'elective' && c.year === 2));
});

test('semester follows the code: odd last digit first, even last digit second', () => {
	for (const c of CATALOG.flatMap((f) => f.departments.flatMap((d) => d.courses))) {
		const m = c.code && c.code.match(/(\d)$/);
		if (m) assert.equal(c.semester, Number(m[1]) % 2 ? 1 : 2, `${c.code}`);
		if (c.semester !== undefined) assert.ok(c.semester === 1 || c.semester === 2);
	}
});

test('grouping drops no course and orders semesters 1, 2, then unassigned', () => {
	for (const { f, d } of departments) {
		const list = listCourses(f, d);
		const groups = groupByYearAndSemester(list);
		assert.equal(groups.reduce((n, y) => n + y.semesters.reduce((m, s) => m + s.courses.length, 0), 0), list.length);
		for (const y of groups) {
			const order = y.semesters.map((s) => (s.semester === null ? 3 : s.semester));
			assert.deepEqual(order, [...order].sort());
			for (const s of y.semesters) {
				const ranks = s.courses.map((c) => (c.shared ? 2 : c.kind === 'core' ? 0 : 1));
				assert.deepEqual(ranks, [...ranks].sort(), `${f}/${d} y${y.year} order`);
			}
		}
	}
});

// Science subjects in the first three years: every chemistry, physics, mathematics, biology,
// zoology and botany course the curriculum data lists for a Science department (years 1-3) is in the
// catalog, and has a database row in some migration, so a student can open it and add it.
import { readFileSync, readdirSync } from 'node:fs';
const SCIENCE = /^(CHM|PHY|MTH|BIO|ZOO|BOT)/;
const migrations = readdirSync('supabase/migrations').map((f) => readFileSync(`supabase/migrations/${f}`, 'utf8')).join('\n');

test('Science departments list their first-three-year science subjects, each with a database row', () => {
	const science = CATALOG.find((f) => f.slug === 'science');
	const missingCatalog = [];
	const missingRow = [];
	for (const dept of science.departments) {
		const doc = JSON.parse(readFileSync(`curriculum/build/${dept.slug}.json`, 'utf8'));
		for (const c of doc.courses) {
			if (!c.code || !SCIENCE.test(c.code) || c.year > 3) continue;
			if (!dept.courses.some((x) => x.slug === c.slug)) missingCatalog.push(`${dept.slug}/${c.code}`);
		}
		for (const c of dept.courses) {
			if (c.code && SCIENCE.test(c.code) && c.year <= 3 && !migrations.includes(`'${c.code}'`)) missingRow.push(`${dept.slug}/${c.code}`);
		}
	}
	assert.deepEqual(missingCatalog, []);
	assert.deepEqual(missingRow, []);
});

test('every Science department has the same 14 compulsory year-1 science courses (chemistry, physics, mathematics, biology)', () => {
	const core = readFileSync('curriculum/shared/science-year1.txt', 'utf8')
		.split('\n')
		.filter((l) => /^1\|(CHM|PHY|MTH|BIO)/.test(l))
		.map((l) => l.split('|')[1]);
	assert.equal(core.length, 14);
	for (const dept of CATALOG.find((f) => f.slug === 'science').departments) {
		for (const code of core) {
			const hit = dept.courses.find((c) => c.code === code);
			assert.ok(hit, `${dept.slug} lacks ${code}`);
			assert.equal(hit.year, 1, `${dept.slug} ${code} year`);
			assert.equal(hit.kind, 'core', `${dept.slug} ${code} kind`);
		}
	}
});
