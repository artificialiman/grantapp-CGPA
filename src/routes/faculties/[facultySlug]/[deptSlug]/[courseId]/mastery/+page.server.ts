import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/** No auth gate — build-doctrine invariant, same as every route on this branch. */
export const load: PageServerLoad = async ({ params, locals }) => {
	const { data: course, error: courseError } = await locals.supabase
		.from('courses')
		.select('id, name, code')
		.eq('id', params.courseId)
		.eq('approval_status', 'approved')
		.maybeSingle();

	if (courseError) {
		console.error('Failed to load course:', courseError);
	}
	if (!course) {
		throw error(404, 'Unknown course');
	}

	return {
		courseId: params.courseId,
		courseName: course.name,
		courseCode: course.code,
		facultySlug: params.facultySlug,
		deptSlug: params.deptSlug
	};
};
