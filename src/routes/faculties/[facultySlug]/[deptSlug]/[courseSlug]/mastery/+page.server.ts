import { error } from '@sveltejs/kit';
import { getCourse } from '$lib/catalog';
import { resolveCourseId } from '$lib/catalog-resolve.server';
import type { PageServerLoad } from './$types';

/**
 * No auth gate — build-doctrine invariant, same as every route on this
 * branch. Course name/code come from the static catalog now (zero
 * cost) instead of a live 'courses' select. The one live call left is
 * resolving the real numeric id, needed because
 * /api/mastery-set and /api/submit-mastery-set both key on it.
 */
export const load: PageServerLoad = async ({ params, locals }) => {
	const found = getCourse(params.facultySlug, params.deptSlug, params.courseSlug);
	if (!found) {
		throw error(404, 'Unknown course');
	}

	const courseId = await resolveCourseId(
		locals.supabase,
		params.facultySlug,
		params.deptSlug,
		params.courseSlug
	);

	if (!courseId) {
		throw error(404, 'Unknown or unapproved course');
	}

	return {
		courseId,
		courseSlug: params.courseSlug,
		courseName: found.course.name,
		courseCode: found.course.code,
		facultySlug: params.facultySlug,
		deptSlug: params.deptSlug
	};
};
