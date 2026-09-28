import { error } from '@sveltejs/kit';
import { resolveCourseId } from '$lib/catalog-resolve.server';
import type { PageServerLoad } from './$types';

/**
 * No auth gate — build-doctrine invariant, same as every route on this
 * branch. This is the one legitimate live touchpoint in the whole
 * browse-to-test path: resolving the real numeric course id, right
 * before the client fetches actual questions
 * (/api/quick-test-session). Exposed as `courseId` in data, same key
 * name the client-side fetch in +page.svelte already reads — that file
 * needed zero changes for this rename.
 */
export const load: PageServerLoad = async ({ params, locals }) => {
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
		facultySlug: params.facultySlug,
		deptSlug: params.deptSlug
	};
};
