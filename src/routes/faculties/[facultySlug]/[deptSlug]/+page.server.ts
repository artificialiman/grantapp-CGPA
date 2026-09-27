import { error } from '@sveltejs/kit';
import { getDepartment, getFaculty } from '$lib/data/faculties';
import type { PageServerLoad } from './$types';

/**
 * cgpa-state-of-play.md onboarding step 3: "Open a Department -> see
 * the course-path-to-graduation, split by year." No auth gate — same
 * doctrine invariant as the two routes above this one in the flow.
 * Only approved courses show here — a student's own pending submission
 * isn't surfaced by this query (that's a separate "my submissions"
 * concern, not built here), matching migration 0001's RLS policy
 * exactly (approval_status = 'approved' is the only readable state).
 *
 * Faculty/department lookup is now static ($lib/data/faculties.ts) --
 * two of the three queries this route used to make (faculty by slug,
 * department by slug) are gone. The courses query itself is
 * unchanged in what it returns -- still a real fetch, since course
 * content genuinely changes as submissions get approved between
 * deploys -- just joined by department slug instead of the
 * now-nonexistent fetched department.id.
 */
export const load: PageServerLoad = async ({ params, locals }) => {
	const faculty = getFaculty(params.facultySlug);
	if (!faculty) {
		throw error(404, 'Unknown faculty');
	}

	const department = getDepartment(params.facultySlug, params.deptSlug);
	if (!department) {
		throw error(404, 'Unknown department');
	}

	type Course = { id: number; year: number; name: string; code: string | null; kind: string };

	const { data: courses, error: coursesError } = await locals.supabase
		.from('courses')
		.select('id, year, name, code, kind, departments!inner(slug)')
		.eq('departments.slug', department.slug)
		.eq('approval_status', 'approved')
		.order('year')
		.order('name');

	if (coursesError) {
		console.error('Failed to load courses:', coursesError);
	}

	// Group by year for the "split by year" tree the spec calls for —
	// simplest to shape this server-side than re-derive it in the
	// template on every render.
	const byYear = new Map<number, Course[]>();
	for (const course of (courses ?? []) as unknown as Course[]) {
		if (!byYear.has(course.year)) byYear.set(course.year, []);
		byYear.get(course.year)!.push(course);
	}
	const years = Array.from(byYear.entries())
		.sort(([a], [b]) => a - b)
		.map(([year, yearCourses]) => ({ year, courses: yearCourses }));

	return { faculty, department, years };
};
