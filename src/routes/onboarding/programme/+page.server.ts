import { redirect } from '@sveltejs/kit';
import { CATALOG } from '$lib/catalog';
import { safeGetSessionOrDevBypass } from '$lib/auth/devMode';
import type { PageServerLoad } from './$types';

/**
 * Onboarding: pick your faculty, then your department. The lists come
 * from the static catalog bundled with the app — no fetch. The only
 * server work is the session check; a signed-out visitor is sent to
 * signup first (the programme is saved to a profile, so it needs one).
 */
export const load: PageServerLoad = async ({ locals }) => {
	const { session, user } = await safeGetSessionOrDevBypass(locals);
	if (!session || !user) {
		throw redirect(303, '/signup');
	}

	return {
		faculties: CATALOG.map((f) => ({
			slug: f.slug,
			name: f.name,
			departments: f.departments.map((d) => ({
				slug: d.slug,
				name: d.name,
				courseCount: d.courses.length
			}))
		}))
	};
};
