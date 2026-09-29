import { error } from '@sveltejs/kit';
import { getFaculty } from '$lib/catalog';
import type { PageLoad } from './$types';

/** Universal load (+page.ts), zero Supabase calls: runs in the browser on client-side
 * navigation, so this page makes no request at all and works offline once the app is
 * open — same reasoning as /faculties/+page.ts. */
export const load: PageLoad = ({ params }) => {
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
