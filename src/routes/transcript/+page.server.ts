import { safeGetSessionOrDevBypass } from '$lib/auth/devMode';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * Doctrine dashboard content: "Transcript tracker table." Pulls every
 * enrollment row for the current student, joined to its course, so
 * the table can show semester/year, course, and grade — grouped by
 * year+semester in the UI (grouping logic lives in +page.svelte, this
 * load just returns the flat joined rows).
 */
export const load: PageServerLoad = async (event) => {
	const { session, user } = await safeGetSessionOrDevBypass(event.locals);
	if (!session || !user) {
		throw redirect(303, '/login?next=/transcript');
	}

	const { data: enrollments, error } = await event.locals.supabase
		.from('enrollments')
		.select('id, semester, grade, courses(id, name, code, kind, year)')
		.eq('student_id', user.id);

	if (error) {
		console.error('Failed to load enrollments:', error);
		return { enrollments: [] };
	}

	return { enrollments: enrollments ?? [] };
};
