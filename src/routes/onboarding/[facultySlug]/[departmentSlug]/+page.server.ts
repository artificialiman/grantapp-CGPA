import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * Onboarding step 3 of 5: "Open a Department -> see the
 * course-path-to-graduation, split by year." Shows only years that
 * actually have approved course content, not a fixed 1-7 range — a
 * department with only years 1-2 seeded shouldn't show empty years
 * 3-7 as clickable dead ends.
 */
export const load: PageServerLoad = async ({ params, locals }) => {
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
		.select('year')
		.eq('department_id', department.id)
		.eq('approval_status', 'approved');

	if (coursesError) throw error(500, 'Failed to load course years');

	const years = [...new Set((courses ?? []).map((c) => c.year))].sort((a, b) => a - b);

	return { faculty, department, years };
};
