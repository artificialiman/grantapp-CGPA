import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * cgpa-state-of-play.md onboarding step 5: "Open a course -> choose:
 * standard global question bank (Quick Test or 100-day Mastery) OR
 * upload content from their own institution instead." No auth gate —
 * same build-doctrine invariant as every route on this branch so far.
 */
export const load: PageServerLoad = async ({ params, locals }) => {
	const { data: course, error: courseError } = await locals.supabase
		.from('courses')
		.select('id, year, name, code, kind, department_id')
		.eq('id', params.courseId)
		.eq('approval_status', 'approved')
		.maybeSingle();

	if (courseError) {
		console.error('Failed to load course:', courseError);
	}
	if (!course) {
		throw error(404, 'Unknown course');
	}

	const { data: department } = await locals.supabase
		.from('departments')
		.select('id, name, slug')
		.eq('id', course.department_id)
		.maybeSingle();

	const { count: questionCount } = await locals.supabase
		.from('keystone_questions')
		.select('id', { count: 'exact', head: true })
		.eq('course_id', course.id)
		.eq('approval_status', 'approved');

	return {
		course,
		department,
		facultySlug: params.facultySlug,
		deptSlug: params.deptSlug,
		questionCount: questionCount ?? 0
	};
};
