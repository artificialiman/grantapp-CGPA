import { safeGetSessionOrDevBypass } from '$lib/auth/devMode';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * Closes the loop Upload Course Material otherwise leaves dangling:
 * a student can now see what they've submitted and its status,
 * instead of the app forgetting the moment they click through to
 * WhatsApp.
 */
export const load: PageServerLoad = async (event) => {
	const { session, user } = await safeGetSessionOrDevBypass(event.locals);
	if (!session || !user) {
		throw redirect(303, '/login?next=/my-submissions');
	}

	const { data: submissions, error } = await event.locals.supabase
		.from('submissions')
		.select('id, notes_text, status, detected_course_ids, created_at, courses(id, name, code)')
		.eq('student_id', user.id)
		.order('created_at', { ascending: false });

	if (error) {
		console.error('Failed to load submissions:', error);
		return { submissions: [], detectedCourseNames: {} };
	}

	const allDetectedIds = [...new Set((submissions ?? []).flatMap((s) => s.detected_course_ids ?? []))];
	let detectedCourseNames: Record<number, string> = {};
	if (allDetectedIds.length > 0) {
		const { data: detected } = await event.locals.supabase
			.from('courses')
			.select('id, name, code')
			.in('id', allDetectedIds);
		detectedCourseNames = Object.fromEntries(
			(detected ?? []).map((c) => [c.id, c.code ? `${c.name} (${c.code})` : c.name])
		);
	}

	return { submissions: submissions ?? [], detectedCourseNames };
};
