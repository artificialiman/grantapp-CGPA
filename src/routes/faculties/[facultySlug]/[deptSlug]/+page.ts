import { error } from '@sveltejs/kit';
import { getDepartment } from '$lib/catalog';
import type { PageLoad } from './$types';

/**
 * Universal load (+page.ts), zero Supabase calls: runs in the browser on client-side
 * navigation, so this page makes no request at all and works offline once the app is open — same reasoning as the two routes above this
 * one in the browse flow. A student-submitted course only shows up
 * once an admin approves it and the catalog gets regenerated from a
 * fresh migration (see $lib/catalog.ts's own header) — the live
 * "pending, not yet in the bundle" case is exactly what my-submissions
 * is for, not this listing.
 */
export const load: PageLoad = ({ params }) => {
	const found = getDepartment(params.facultySlug, params.deptSlug);
	if (!found) {
		throw error(404, 'Unknown faculty or department');
	}

	const { faculty, department } = found;

	const byYear = new Map<number, typeof department.courses>();
	for (const course of department.courses) {
		if (!byYear.has(course.year)) byYear.set(course.year, []);
		byYear.get(course.year)!.push(course);
	}
	const years = Array.from(byYear.entries())
		.sort(([a], [b]) => a - b)
		.map(([year, courses]) => ({ year, courses }));

	return {
		faculty: { slug: faculty.slug, name: faculty.name },
		department: { slug: department.slug, name: department.name },
		years
	};
};
