// Run with: node --test tests/
// Every course in the question depot must be listed in the app's catalog under each department it
// names. A course missing from the catalog has no page, so its Quick Test can never open.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { CATALOG } from '../src/lib/catalog.ts';

const depots = [];
for (const faculty of readdirSync('content', { withFileTypes: true }).filter((d) => d.isDirectory())) {
	for (const f of readdirSync(`content/${faculty.name}`).filter((n) => n.endsWith('.json'))) {
		depots.push(JSON.parse(readFileSync(`content/${faculty.name}/${f}`, 'utf8')));
	}
}

test('every approved depot course is in the catalog for each department it names', () => {
	const missing = [];
	for (const doc of depots) {
		if (!doc.questions.some((q) => q.status === 'approved')) continue;
		const named = doc.department_slugs.includes('*')
			? CATALOG.filter((f) => f.slug === doc.faculty_slug).flatMap((f) => f.departments.map((d) => d.slug))
			: doc.department_slugs;
		for (const dept of named) {
			const found = CATALOG.flatMap((f) => f.departments).find((d) => d.slug === dept);
			if (!found || !found.courses.some((c) => c.slug === doc.course_slug)) missing.push(`${doc.faculty_slug}/${doc.course_slug} in ${dept}`);
		}
	}
	assert.deepEqual(missing, []);
});
