import { safeGetSessionOrDevBypass } from '$lib/auth/devMode';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * Doctrine dashboard content: "Very granular analytics/infographics
 * screen." Permission matrix: "Yes (own data)" for a student — no
 * cohort/drilldown here, that's the admin variant ("mirrors UTME
 * admin model"), a separate, later screen. mastery_state already IS
 * the granular data source: one row per (student, course,
 * cognitive_pattern, information_type), same shape UTME's own
 * getMasteryGrid() reads from (confirmed by checking that function's
 * query directly before building this, not assumed from memory).
 */
export const load: PageServerLoad = async (event) => {
	const { session, user } = await safeGetSessionOrDevBypass(event.locals);
	if (!session || !user) {
		throw redirect(303, '/login?next=/analytics');
	}

	const { data: mastery, error } = await event.locals.supabase
		.from('mastery_state')
		.select('course_id, cognitive_pattern, information_type, attempts, correct, mastery_score, last_attempted_at')
		.eq('student_id', user.id);

	if (error) {
		console.error('Failed to load mastery state:', error);
		return { mastery: [], courseNames: {} };
	}

	const courseIds = [...new Set((mastery ?? []).map((m) => m.course_id))];
	let courseNames: Record<number, string> = {};
	if (courseIds.length > 0) {
		const { data: courses } = await event.locals.supabase
			.from('courses')
			.select('id, name')
			.in('id', courseIds);
		courseNames = Object.fromEntries((courses ?? []).map((c) => [c.id, c.name]));
	}

	return { mastery: mastery ?? [], courseNames };
};
