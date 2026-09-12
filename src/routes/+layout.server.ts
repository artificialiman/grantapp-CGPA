import { env } from '$env/dynamic/private';
import type { LayoutServerLoad } from './$types';
import { safeGetSessionOrDevBypass, isDevAuthBypassEnabled, ensureDevStudentExists } from '$lib/auth/devMode';

const SERVICE_ROLE_KEY = env.SERVICE_ROLE_KEY;

/**
 * Auth stood down for build/test per explicit instruction — see
 * devMode.ts's own doc comment for the full reasoning and the exact
 * env var that controls it (CGPA_DEV_BYPASS_AUTH). Real auth
 * (signup/login, device-limit) is untouched and still fully wired;
 * this only changes WHICH identity every request resolves to while
 * the flag is on.
 */
export const load: LayoutServerLoad = async (event) => {
	try {
		const { session, user } = await safeGetSessionOrDevBypass(event.locals);

		let student = null;
		if (user) {
			if (isDevAuthBypassEnabled() && SERVICE_ROLE_KEY) {
				// Bootstrap the dev student row via a service-role client —
				// see ensureDevStudentExists's doc comment for why this can't
				// go through the normal RLS-scoped locals.supabase here.
				const { createClient } = await import('@supabase/supabase-js');
				const supabaseUrl = env.VITE_SUPABASE_URL;
				if (supabaseUrl) {
					const adminClient = createClient(supabaseUrl, SERVICE_ROLE_KEY, { db: { schema: 'cgpa' } });
					await ensureDevStudentExists(adminClient);
					const { data } = await adminClient.from('students').select('*').eq('id', user.id).single();
					student = data;
				}
			} else {
				const { data } = await event.locals.supabase.from('students').select('*').eq('id', user.id).single();
				student = data;
			}
		}

		return {
			session,
			student,
			user,
			devAuthBypass: isDevAuthBypassEnabled()
		};
	} catch (err) {
		console.error('Layout server load error:', err);
		return {
			session: null,
			student: null,
			user: null,
			devAuthBypass: isDevAuthBypassEnabled()
		};
	}
};
