import { error, redirect } from '@sveltejs/kit';
import { getCourse } from '$lib/catalog';
import { resolveCourseId } from '$lib/catalog-resolve.server';
import type { PageServerLoad } from './$types';

/**
 * Stable, shallow entry point for "take a test on this course" — used
 * by the dashboard's Take a Test button and, later, notifications.
 * Takes the same slug triple every other course route uses, validated
 * against the static catalog first (free), then does exactly one live
 * resolve + one count check to decide where to send the student.
 *
 * If the course has zero approved questions right now, redirect to the
 * course's own detail page instead of an empty quick-test — that page
 * already shows the honest "not ready yet" state.
 */
export const load: PageServerLoad = async ({ params, locals }) => {
	const found = getCourse(params.facultySlug, params.deptSlug, params.courseSlug);
	if (!found) {
		throw error(404, 'Unknown course');
	}

	const basePath = `/faculties/${params.facultySlug}/${params.deptSlug}/${params.courseSlug}`;

	const courseId = await resolveCourseId(
		locals.supabase,
		params.facultySlug,
		params.deptSlug,
		params.courseSlug
	);
	if (!courseId) {
		throw redirect(303, basePath);
	}

	const { data: questionCount } = await locals.supabase.rpc('approved_question_count', {
		p_course_id: courseId
	});

	if (!questionCount || questionCount === 0) {
		throw redirect(303, basePath);
	}

	throw redirect(303, `${basePath}/quick-test`);
};
