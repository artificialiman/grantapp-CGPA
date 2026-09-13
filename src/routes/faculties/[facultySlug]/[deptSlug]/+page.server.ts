import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * cgpa-state-of-play.md onboarding step 3: "Open a Department -> see
 * the course-path-to-graduation, split by year." No auth gate — same
 * doctrine invariant as the two routes above this one in the flow.
 * Only approved courses show here — a student's own pending submission
 * isn't surfaced by this query (that's a separate "my submissions"
 * concern, not built here), matching migration 0001's RLS policy
 * exactly (approval_status = 'approved' is the only readable state).
 */
export const load: PageServerLoad = async ({ params, locals }) => {
	const { data: faculty } = await locals.supabase
		.from('faculties')
		.select('id, name, slug')
		.eq('slug', params.facultySlug)
		.maybeSingle();

	if (!faculty) {
		throw error(404, 'Unknown faculty');
	}

	const { data: department, error: deptError } = await locals.supabase
		.from('departments')
		.select('id, name, slug')
		.eq('faculty_id', faculty.id)
		.eq('slug', params.deptSlug)
		.maybeSingle();

	if (deptError) {
		console.error('Failed to load department:', deptError);
	}
	if (!department) {
		throw error(404, 'Unknown department');
	}

	const { data: courses, error: coursesError } = await locals.supabase
		.from('courses')
		.select('id, year, name, code, kind')
		.eq('department_id', department.id)
		.order('year')
		.order('name');

	if (coursesError) {
		console.error('Failed to load courses:', coursesError);
	}

	// Group by year for the "split by year" tree the spec calls for —
	// simplest to shape this server-side than re-derive it in the
	// template on every render.
	const byYear = new Map<number, typeof courses>();
	for (const course of courses ?? []) {
		if (!byYear.has(course.year)) byYear.set(course.year, []);
		byYear.get(course.year)!.push(course);
	}
	const years = Array.from(byYear.entries())
		.sort(([a], [b]) => a - b)
		.map(([year, yearCourses]) => ({ year, courses: yearCourses }));

	return { faculty, department, years };
};
