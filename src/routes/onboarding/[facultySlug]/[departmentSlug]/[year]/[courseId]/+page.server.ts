import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * Onboarding step 5 of 5: "Open a course -> choose: standard global
 * question bank (Quick Test or 100-day Mastery) OR upload content
 * from their own institution instead." This page presents that
 * choice; it does not implement Quick Test/100-day Mastery/upload
 * themselves yet — separate, larger pieces of work (the quiz-UI and
 * the upload-to-WhatsApp pipeline).
 */
export const load: PageServerLoad = async ({ params, locals }) => {
	const { data: course, error: courseError } = await locals.supabase
		.from('courses')
		.select('id, name, code, kind, department_id')
		.eq('id', params.courseId)
		.eq('approval_status', 'approved')
		.maybeSingle();

	if (courseError) throw error(500, 'Failed to load course');
	if (!course) throw error(404, 'Course not found');

	return {
		course,
		facultySlug: params.facultySlug,
		departmentSlug: params.departmentSlug,
		year: params.year
	};
};
