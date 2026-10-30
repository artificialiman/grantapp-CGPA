import { createServerClient } from '@supabase/ssr';
import type { Handle } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createClient } from '@supabase/supabase-js';
import { AUTH_FROZEN, DEMO_STUDENT_ID, DEMO_STUDENT_EMAIL } from '$lib/auth/freeze';

/**
 * $env/dynamic/private, not process.env directly — same reasoning as
 * grantapp-shell's hooks.server.ts: adapter-vercel can still resolve
 * to a non-Node runtime at deploy time, and $env/dynamic/private is
 * SvelteKit's portable abstraction over "wherever these actually
 * live", so this matches regardless of which runtime ends up in play.
 *
 * db: { schema: 'cgpa' } is the one real difference from grantapp-
 * shell's client setup — Grant CGPA lives in its own Postgres schema
 * within the SAME Supabase project as UTME (shared project, separate
 * schema; see supabase/migrations/..._cgpa_0001_init.sql's own
 * comment for why). Every query through this client resolves against
 * cgpa.* tables by default, not public.* — UTME's tables are simply
 * not reachable through this client at all, by design, not by
 * convention alone.
 */
const supabaseUrl = env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY as string;

/**
 * Creates a request-scoped Supabase client bound to THIS request's
 * cookies, and exposes a validated getSession() on event.locals.
 *
 * Ported directly from grantapp-shell's hooks.server.ts, which fixed a
 * real production bug here: a shared, browser-oriented client has no
 * cookie context when running server-side, so every session-gated
 * route silently failed auth checks despite login succeeding. Copying
 * the fix rather than re-deriving it and risking the same regression.
 */
let demoStudentEnsured = false;

export const handle: Handle = async ({ event, resolve }) => {
	// Explicit generic on createServerClient itself — passing
	// { db: { schema: 'cgpa' } } as a runtime option doesn't
	// automatically narrow the TS return type to match app.d.ts's
	// SupabaseClient<any, 'cgpa', 'cgpa', any, any> Locals.supabase
	// type; the generic parameter is what actually does that.
	event.locals.supabase = createServerClient<any, 'cgpa'>(supabaseUrl, supabaseAnonKey, {
		db: { schema: 'cgpa' },
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll: (cookiesToSet) => {
				cookiesToSet.forEach(({ name, value, options }) => {
					event.cookies.set(name, value, { ...options, path: options?.path ?? '/' });
				});
			}
		}
	});

	/**
	 * getSession() reads the (possibly stale/tampered) JWT straight from
	 * the cookie. getUser() re-validates it against Supabase's auth
	 * server on every call. Route code that gates access (onboarding,
	 * dashboard, admin) should prefer safeGetSession() below, not raw
	 * getSession().
	 */
	event.locals.safeGetSession = async () => {
		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();
		if (!session) {
			return { session: null, user: null };
		}

		const {
			data: { user },
			error
		} = await event.locals.supabase.auth.getUser();
		if (error) {
			return { session: null, user: null };
		}

		return { session, user };
	};

	event.locals.getSession = async () => {
		const { session } = await event.locals.safeGetSession();
		return session;
	};

	if (AUTH_FROZEN) {
		// Frozen for testing/demo: every request is the one demo student, no
		// cookie or Supabase auth involved. When a service-role key is set,
		// database reads and writes go through it, because there is no real
		// signed-in user for row-level security to recognise.
		const demoUser = { id: DEMO_STUDENT_ID, email: DEMO_STUDENT_EMAIL } as import('@supabase/supabase-js').User;
		const demoSession = { user: demoUser } as import('@supabase/supabase-js').Session;
		event.locals.safeGetSession = async () => ({ session: demoSession, user: demoUser });
		event.locals.getSession = async () => demoSession;
		if (env.SERVICE_ROLE_KEY && supabaseUrl) {
			event.locals.supabase = createClient(supabaseUrl, env.SERVICE_ROLE_KEY, {
				db: { schema: 'cgpa' },
				auth: { persistSession: false, autoRefreshToken: false }
			}) as unknown as typeof event.locals.supabase;
			if (!demoStudentEnsured) {
				// Best effort, once per server instance: writes that reference the
				// demo student need its row. A failure here never blocks the page.
				demoStudentEnsured = true;
				void Promise.resolve(
					event.locals.supabase
						.from('students')
						.upsert({ id: DEMO_STUDENT_ID, full_name: 'Demo Student' }, { onConflict: 'id', ignoreDuplicates: true })
				).catch((err: unknown) => console.error('demo student upsert failed:', err));
			}
		}
	}

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};
