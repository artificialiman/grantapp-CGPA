import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * cgpa-state-of-play.md onboarding step 2: "Open a Faculty -> see
 * Departments within it." No auth gate — see faculties/+page.server.ts's
 * comment; authgates/signin come last, not while a feature is still
 * being built.
 */
export const load: PageServerLoad = async ({ params, locals }) => {
	const { data: faculty, error: facultyError } = await locals.supabase
		.from('faculties')
		.select('id, name, slug')
		.eq('slug', params.facultySlug)
		.maybeSingle();

	if (facultyError) {
		console.error('Failed to load faculty:', facultyError);
	}
	if (!faculty) {
		throw error(404, 'Unknown faculty');
	}

	const { data: departments, error: deptError } = await locals.supabase
		.from('departments')
		.select('id, name, slug')
		.eq('faculty_id', faculty.id)
		.order('name');

	if (deptError) {
		console.error('Failed to load departments:', deptError);
	}

	return { faculty, departments: departments ?? [] };
};
