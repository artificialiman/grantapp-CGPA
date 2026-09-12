import { env } from '$env/dynamic/private';
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';

/**
 * STAND-DOWN SWITCH FOR AUTH DURING BUILD/TEST — per explicit
 * instruction: "stand the signin and auth down, so that testing and
 * iteration can go smoothly... I usually implement it last because of
 * this reason." Real auth (signup/login/device-limit, all built and
 * committed) is NOT deleted — it's bypassed, behind one flag, so it
 * can be turned back on with a single env var flip rather than
 * re-implemented later.
 *
 * CGPA_DEV_BYPASS_AUTH=true (set in the deployment env, NOT committed
 * anywhere, NOT defaulted to true in code) makes every gated route
 * resolve to a single fixed test student, skipping real session
 * validation entirely. This must never be true in a real production
 * environment serving real students — it has no per-request identity
 * at all, every request becomes the same test student.
 *
 * DEV_STUDENT_ID must be a real row that actually exists in
 * cgpa.students (create it once via SQL/the admin tool — this file
 * does not create it for you) — a fabricated UUID with no backing row
 * would make every foreign-key-dependent write fail, which defeats
 * the entire point of standing auth down for smooth iteration.
 */
const BYPASS_ENABLED = env.CGPA_DEV_BYPASS_AUTH === 'true';
const DEV_STUDENT_ID = env.CGPA_DEV_STUDENT_ID ?? '00000000-0000-0000-0000-000000000001';
const DEV_STUDENT_EMAIL = 'dev@grantapp.local';

export function isDevAuthBypassEnabled(): boolean {
	return BYPASS_ENABLED;
}

/**
 * Drop-in replacement for `await locals.safeGetSession()`. When the
 * bypass is off, delegates to the real thing unchanged — this
 * function is safe to call from every load/endpoint permanently,
 * not just during the bypass period, so flipping the env var back to
 * false later requires no code changes anywhere else.
 */
export async function safeGetSessionOrDevBypass(
	locals: App.Locals
): Promise<{ session: Session | null; user: User | null }> {
	if (BYPASS_ENABLED) {
		const fakeUser = { id: DEV_STUDENT_ID, email: DEV_STUDENT_EMAIL } as User;
		const fakeSession = { user: fakeUser } as Session;
		return { session: fakeSession, user: fakeUser };
	}
	return locals.safeGetSession();
}

/**
 * For server code that already has a `supabase` client and just needs
 * the dev student's id without going through the full session shape —
 * e.g. seeding/lookups where only the id is needed. Prefer
 * safeGetSessionOrDevBypass in route loads/endpoints; this is a
 * convenience for the few places that only need the id.
 */
export function devStudentId(): string {
	return DEV_STUDENT_ID;
}

/**
 * One-time bootstrap: ensures the dev student row actually exists in
 * cgpa.students, since a bypassed session is useless if the row it
 * points at was never created. MUST be called with a service-role
 * client, not the request-scoped RLS client — there is no real
 * auth.uid() in bypass mode (no genuine session exists), so the
 * "students read own row"/no-write-policy RLS setup would reject this
 * write entirely if attempted through the normal locals.supabase
 * client. Idempotent (upsert), safe to call on every bypassed request.
 */
export async function ensureDevStudentExists(serviceRoleClient: SupabaseClient<any, string, 'cgpa', any, any>): Promise<void> {
	if (!BYPASS_ENABLED) return;
	await serviceRoleClient
		.from('students')
		.upsert({ id: DEV_STUDENT_ID, full_name: 'Dev Test Student' }, { onConflict: 'id' });
}
