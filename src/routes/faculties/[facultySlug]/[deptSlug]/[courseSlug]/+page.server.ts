import { error } from '@sveltejs/kit';
import { getCourse } from '$lib/catalog';
import { resolveCourseId } from '$lib/catalog-resolve.server';
import { safeGetSessionOrDevBypass } from '$lib/auth/devMode';
import type { PageServerLoad } from './$types';

/**
 * cgpa-state-of-play.md onboarding step 5: "Open a course -> choose:
 * standard global question bank (Quick Test or 100-day Mastery) OR
 * upload content from their own institution instead."
 *
 * Course name/year/code/kind now come from the static catalog — zero
 * cost. This page still makes exactly two live calls, and both are
 * legitimate under the "only questions, analytics, status,
 * notifications" rule: resolving the real numeric course id (needed
 * because keystone_questions/enrollments key on it, not on slug), and
 * the question count itself. A third call (enrollment status) only
 * runs when a session exists, and is the enrollment *status* check the
 * rule explicitly allows.
 */
export const load: PageServerLoad = async (event) => {
	const { params, locals } = event;

	const found = getCourse(params.facultySlug, params.deptSlug, params.courseSlug);
	if (!found) {
		throw error(404, 'Unknown course');
	}
	const { faculty, department, course } = found;

	const courseId = await resolveCourseId(
		locals.supabase,
		params.facultySlug,
		params.deptSlug,
		params.courseSlug
	);

	// A course can exist in the static catalog (it's real curriculum
	// structure) but not yet be approval_status='approved' in the live
	// DB, or not exist there at all yet for a newly-added department —
	// fail soft into "0 questions available" rather than a hard error,
	// since the page itself is still real and worth showing.
	const questionCount = courseId
		? ((
				await locals.supabase.rpc('approved_question_count', {
					p_course_id: courseId
				})
			).data ?? 0)
		: 0;

	const { session, user } = await safeGetSessionOrDevBypass(locals);
	let alreadyEnrolled = false;
	if (session && user && courseId) {
		const { data: existingEnrollment } = await locals.supabase
			.from('enrollments')
			.select('id')
			.eq('student_id', user.id)
			.eq('course_id', courseId)
			.maybeSingle();
		alreadyEnrolled = !!existingEnrollment;
	}

	return {
		course: { id: courseId, slug: course.slug, name: course.name, code: course.code, year: course.year, kind: course.kind },
		department: { name: department.name, slug: department.slug },
		facultySlug: faculty.slug,
		deptSlug: department.slug,
		questionCount,
		isLoggedIn: !!(session && user),
		alreadyEnrolled
	};
};
