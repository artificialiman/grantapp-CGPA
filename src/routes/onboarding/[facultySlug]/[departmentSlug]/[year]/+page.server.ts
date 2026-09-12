import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * Onboarding step 4 of 5: "Pick a year -> see Core + Elective courses
 * for that year — student can add an elective, or a core/extra-credit
 * requirement not already listed." This load only returns approved
 * courses (matching cgpa.courses' RLS policy) — the free-text
 * submission form itself lives in +page.svelte / api/submit-course.
 */
export const load: PageServerLoad = async ({ params, locals }) => {
	const year = parseInt(params.year, 10);
	if (!Number.isFinite(year) || year < 1) throw error(404, 'Invalid year');

	const { data: faculty, error: facultyError } = await locals.supabase
		.from('faculties')
		.select('id, name, slug')
		.eq('slug', params.facultySlug)
		.maybeSingle();

	if (facultyError) throw error(500, 'Failed to load faculty');
	if (!faculty) throw error(404, 'Faculty not found');

	const { data: department, error: deptError } = await locals.supabase
		.from('departments')
		.select('id, name, slug')
		.eq('faculty_id', faculty.id)
		.eq('slug', params.departmentSlug)
		.maybeSingle();

	if (deptError) throw error(500, 'Failed to load department');
	if (!department) throw error(404, 'Department not found');

	const { data: courses, error: coursesError } = await locals.supabase
		.from('courses')
		.select('id, name, code, kind')
		.eq('department_id', department.id)
		.eq('year', year)
		.eq('approval_status', 'approved')
		.order('kind')
		.order('name');

	if (coursesError) throw error(500, 'Failed to load courses');

	return {
		faculty,
		department,
		year,
		coreCourses: (courses ?? []).filter((c) => c.kind === 'core'),
		electiveCourses: (courses ?? []).filter((c) => c.kind !== 'core')
	};
};
