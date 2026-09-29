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
					const { data } = await adminClient.from('students').select('*').eq('id', user.id).maybeSingle();
					student = data;
				}
			} else {
				// maybeSingle(), not single() -- single() THROWS on zero rows,
				// which is exactly what a genuinely logged-in user hits if
				// their auth.users row exists but cgpa.students doesn't yet
				// (e.g. mid-signup, before complete-signup has run, or any
				// account predating this schema -- the same class of gap
				// check-device's own fix addressed). That throw was being
				// caught by this function's outer try/catch and silently
				// downgrading a valid session to session: null everywhere in
				// the app -- a real user would appear logged-out on every
				// page for no visible reason. maybeSingle() returns null
				// instead of throwing, so a missing student row no longer
				// destroys an otherwise-valid session.
				const { data } = await event.locals.supabase.from('students').select('*').eq('id', user.id).maybeSingle();
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
