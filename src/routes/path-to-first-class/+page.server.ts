import { safeGetSessionOrDevBypass } from '$lib/auth/devMode';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * Doctrine dashboard content: "Full path-to-first-class rendered as a
 * tree/chain SVG (visual graduation-requirement map)." Same
 * enrollment data source as /transcript — this page's job is
 * rendering it as a visual projection toward First Class (>=4.5 on
 * the NUC 5.0 scale) rather than a plain table.
 */
export const load: PageServerLoad = async (event) => {
	const { session, user } = await safeGetSessionOrDevBypass(event.locals);
	if (!session || !user) {
		throw redirect(303, '/login?next=/path-to-first-class');
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
