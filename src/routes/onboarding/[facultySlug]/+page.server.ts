import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * Onboarding step 2 of 5: "Open a Faculty -> see Departments within
 * it."
 */
export const load: PageServerLoad = async ({ params, locals }) => {
	const { data: faculty, error: facultyError } = await locals.supabase
		.from('faculties')
		.select('id, name, slug')
		.eq('slug', params.facultySlug)
		.maybeSingle();

	if (facultyError) throw error(500, 'Failed to load faculty');
	if (!faculty) throw error(404, 'Faculty not found');

	const { data: departments, error: deptError } = await locals.supabase
		.from('departments')
		.select('id, name, slug')
		.eq('faculty_id', faculty.id)
		.order('name');

	if (deptError) throw error(500, 'Failed to load departments');

	return { faculty, departments: departments ?? [] };
};
