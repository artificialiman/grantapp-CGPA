// Run with: node --test tests/
// Department listings: General Studies for everybody, electives included, years split in semesters.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATALOG, listCourses, groupByYearAndSemester } from '../src/lib/catalog.ts';

const departments = CATALOG.flatMap((f) => f.departments.map((d) => ({ f: f.slug, d: d.slug })));
const gst = CATALOG.find((f) => f.slug === 'general-studies').departments[0].courses;

test('every department lists every General Studies course, pointing at its one canonical page', () => {
	for (const { f, d } of departments) {
		const list = listCourses(f, d);
		for (const g of gst) {
			const hit = list.filter((c) => c.slug === g.slug && c.shared);
			if (f === 'general-studies') {
				assert.equal(list.filter((c) => c.slug === g.slug).length, 1, `${g.slug} duplicated in General Studies`);
			} else {
				assert.equal(hit.length, 1, `${g.slug} missing in ${f}/${d}`);
				assert.equal(hit[0].href, `/faculties/general-studies/general-studies/${g.slug}`);
			}
		}
	}
});

test('year 1 of every department shows the year-1 General Studies courses', () => {
	const year1 = gst.filter((c) => c.year === 1).map((c) => c.slug);
	assert.ok(year1.length > 0);
	for (const { f, d } of departments) {
		const y1 = groupByYearAndSemester(listCourses(f, d)).find((y) => y.year === 1);
		assert.ok(y1, `no year 1 in ${f}/${d}`);
		const slugs = y1.semesters.flatMap((s) => s.courses.map((c) => c.slug));
		for (const s of year1) assert.ok(slugs.includes(s), `${s} missing from year 1 of ${f}/${d}`);
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
