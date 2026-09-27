import { error } from '@sveltejs/kit';
import { getFaculty } from '$lib/catalog';
import type { PageServerLoad } from './$types';

/** Zero Supabase calls — same reasoning as /faculties/+page.server.ts. */
export const load: PageServerLoad = ({ params }) => {
	const faculty = getFaculty(params.facultySlug);
	if (!faculty) {
		throw error(404, 'Unknown faculty');
	}

	const departments = faculty.departments.map((d) => ({
		slug: d.slug,
		name: d.name,
		courseCount: d.courses.length
	}));

	return { faculty: { slug: faculty.slug, name: faculty.name }, departments };
};
