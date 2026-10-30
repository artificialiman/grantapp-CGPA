import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Which sign-up this account is. "updates" means the founder added the person by hand
 * (a row in cgpa.access_grants, migration 0022); everyone else is "standard".
 * Reads through the signed-in user's own client, so RLS ("select own row") is the only
 * thing that decides; no service key is involved.
 */
export const GET: RequestHandler = async ({ locals }) => {
	const { session, user } = await locals.safeGetSession();
	if (!session || !user) return json({ message: 'Not signed in' }, { status: 401 });

	const { data, error } = await locals.supabase
		.from('access_grants')
		.select('tier')
		.eq('student_id', user.id)
		.maybeSingle();

	if (error) {
		console.error('entitlement lookup failed:', error);
		return json({ message: 'Could not check access' }, { status: 500 });
	}
	return json({ tier: data?.tier === 'updates' ? 'updates' : 'standard' });
};
