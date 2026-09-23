import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * Stable, shallow entry point for "take a test on this course" —
 * built because nothing on the dashboard could link anywhere near a
 * test without knowing the full /faculties/{facultySlug}/{deptSlug}/
 * {courseId}/quick-test path, which the dashboard's own queries never
 * fetch (weakest-mastery only selects course_id + course name). Rather
 * than teach every future caller (dashboard, and eventually
 * notifications) that whole join, this route does the join once,
 * server-side, and redirects.
 *
 * If the course has zero approved questions right now (true for
 * almost every course per the current content audit), redirect to the
 * course's own detail page instead of straight into an empty
 * quick-test. That page already computes and displays questionCount,
 * so the student sees an honest "not ready yet" rather than a test
 * screen with nothing in it.
 */
export const load: PageServerLoad = async ({ params, locals }) => {
	const { data: course } = await locals.supabase
		.from('courses')
		.select('id, department_id')
		.eq('id', params.courseId)
		.eq('approval_status', 'approved')
		.maybeSingle();

	if (!course) {
		throw error(404, 'Unknown course');
	}

	const { data: department } = await locals.supabase
		.from('departments')
		.select('slug, faculty_id')
		.eq('id', course.department_id)
		.maybeSingle();

	if (!department) {
		throw error(404, 'Course has no department');
	}

	const { data: faculty } = await locals.supabase
		.from('faculties')
		.select('slug')
		.eq('id', department.faculty_id)
		.maybeSingle();

	if (!faculty) {
		throw error(404, 'Course has no faculty');
	}

	const { count: questionCount } = await locals.supabase
		.from('keystone_questions')
		.select('id', { count: 'exact', head: true })
		.eq('course_id', course.id)
		.eq('approval_status', 'approved');

	const basePath = `/faculties/${faculty.slug}/${department.slug}/${course.id}`;

	if (!questionCount || questionCount === 0) {
		throw redirect(303, basePath);
	}

	throw redirect(303, `${basePath}/quick-test`);
};
