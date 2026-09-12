import { redirect } from '@sveltejs/kit';
import { safeGetSessionOrDevBypass } from '$lib/auth/devMode';
import type { PageServerLoad } from './$types';

/**
 * Doctrine (cgpa-state-of-play.md, ROLE_STUDENT/Section 0): "No guest
 * funnel — signup is immediate." Unlike UTME's homepage (a real guest
 * tour: streams -> clusters -> exams), there is no browsable
 * unauthenticated experience to build here at all — a logged-out
 * visitor goes straight to /signup, a logged-in student straight to
 * /dashboard. This route exists only to make that redirect, not to
 * render anything itself.
 *
 * safeGetSessionOrDevBypass, not locals.safeGetSession directly — see
 * devMode.ts. While CGPA_DEV_BYPASS_AUTH is on, this always resolves
 * to the fixed dev student, so the homepage always redirects to
 * /dashboard during build/test rather than bouncing to signup.
 */
export const load: PageServerLoad = async ({ locals }) => {
	const { session } = await safeGetSessionOrDevBypass(locals);
	throw redirect(303, session ? '/dashboard' : '/signup');
};
