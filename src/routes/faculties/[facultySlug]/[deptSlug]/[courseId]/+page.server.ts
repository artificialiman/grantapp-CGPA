import { error } from '@sveltejs/kit';
import { safeGetSessionOrDevBypass } from '$lib/auth/devMode';
import type { PageServerLoad } from './$types';

/**
 * cgpa-state-of-play.md onboarding step 5: "Open a course -> choose:
 * standard global question bank (Quick Test or 100-day Mastery) OR
 * upload content from their own institution instead." No auth gate on
 * the page itself — same build-doctrine invariant as every route on
 * this branch so far, and this is genuinely a public browse/catalog
 * page. A session, when one exists, is used only to check whether
 * this student has already added the course to their own record
 * (cgpa.enrollments) — this is the fix for a real gap found while
 * auditing track-progress: nothing in the app UI ever called
 * api/enroll-course, so /transcript and /path-to-first-class were
 * permanently empty for every real user no matter how much they used
 * Quick Test. This page's "Add to My Courses" action (in
 * +page.svelte) is that missing write path.
 */
export const load: PageServerLoad = async (event) => {
	const { params, locals } = event;
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

	// Session is optional here (page has no auth gate) — only used to
	// check existing enrollment status, never to block rendering.
	const { session, user } = await safeGetSessionOrDevBypass(locals);
	let alreadyEnrolled = false;
	if (session && user) {
		const { data: existingEnrollment } = await locals.supabase
			.from('enrollments')
			.select('id')
			.eq('student_id', user.id)
			.eq('course_id', course.id)
			.maybeSingle();
		alreadyEnrolled = !!existingEnrollment;
	}

	return {
		course,
		department,
		facultySlug: params.facultySlug,
		deptSlug: params.deptSlug,
		questionCount: questionCount ?? 0,
		isLoggedIn: !!(session && user),
		alreadyEnrolled
	};
};
