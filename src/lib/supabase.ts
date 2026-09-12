import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
	throw new Error('Missing Supabase environment variables');
}

/**
 * createBrowserClient (from @supabase/ssr), NOT plain createClient —
 * ported from grantapp-shell's supabase.ts, which fixed a real
 * "Unauthorized on login" production bug caused by exactly this
 * distinction (plain createClient stores the session in localStorage,
 * which hooks.server.ts's cookie-bound server client can never read).
 *
 * db: { schema: 'cgpa' } — same reasoning as hooks.server.ts: this
 * client only ever sees cgpa.* tables, never public.* (UTME's).
 */
export const client = createBrowserClient(supabaseUrl, supabaseAnonKey, {
	db: { schema: 'cgpa' }
});

export async function getSession() {
	const { data, error } = await client.auth.getSession();
	if (error) throw error;
	return data.session;
}

export async function isSessionValid() {
	try {
		const session = await getSession();
		return session !== null;
	} catch {
		return false;
	}
}
