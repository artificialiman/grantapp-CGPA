import { error } from '@sveltejs/kit';
import { resolveCourseId } from '$lib/catalog-resolve.server';
import { packForCourse } from '$lib/offline/available.server';
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
export const load: PageServerLoad = async ({ params, locals, fetch }) => {
	const courseId = await resolveCourseId(
		locals.supabase,
		params.facultySlug,
		params.deptSlug,
		params.courseSlug
	);

	// The test runs from the saved question pack when there is one, so a course the database does
	// not know yet still opens. With neither a pack nor a database course there is nothing to run.
	const pack = await packForCourse(fetch, params.facultySlug, params.deptSlug, params.courseSlug);
	if (!courseId && !pack) {
		throw error(404, 'Unknown or unapproved course');
	}

	return {
		courseId,
		packKey: pack?.key ?? null,
		courseSlug: params.courseSlug,
		facultySlug: params.facultySlug,
		deptSlug: params.deptSlug
	};
};
