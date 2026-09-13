import type { PageServerLoad } from './$types';

/** No auth gate — build-doctrine invariant, same as every route on this branch. */
export const load: PageServerLoad = async ({ params }) => {
	return {
		courseId: params.courseId,
		facultySlug: params.facultySlug,
		deptSlug: params.deptSlug
	};
};
