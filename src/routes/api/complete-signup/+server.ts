import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

const SERVICE_ROLE_KEY = env.SERVICE_ROLE_KEY;

/**
 * Creates the cgpa.students row after client-side auth.signUp() and
 * the device-limit check have both succeeded. Deliberately minimal —
 * doctrine's onboarding flow (Faculty -> Department -> course-path)
 * is a SEPARATE, later step (/faculties, obase's onboarding flow -- see DECISIONS.md's merge-strategy patch), not folded into signup
 * itself.
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const { session, user } = await locals.safeGetSession();
		if (!session || !user) {
			return json({ message: 'Unauthorized' }, { status: 401 });
		}

		const body = (await request.json()) as { full_name?: string };
		const full_name = (body.full_name ?? '').trim();

		if (!full_name) {
			return json({ message: 'Full name is required' }, { status: 400 });
		}

		if (!SERVICE_ROLE_KEY) {
			console.error('SERVICE_ROLE_KEY not configured');
			return json({ message: 'Server configuration error' }, { status: 500 });
		}

		const { createClient } = await import('@supabase/supabase-js');
		const supabaseUrl = env.VITE_SUPABASE_URL;
		if (!supabaseUrl) {
			return json({ message: 'Server configuration error' }, { status: 500 });
		}

		const adminClient = createClient(supabaseUrl, SERVICE_ROLE_KEY, { db: { schema: 'cgpa' } });

		const { error: upsertError } = await adminClient
			.from('students')
			.upsert({ id: user.id, full_name }, { onConflict: 'id' });

		if (upsertError) {
			console.error('Error creating cgpa student profile:', upsertError);
			return json({ message: 'Failed to create profile' }, { status: 500 });
		}

		return json({ message: 'Signup completed' }, { status: 200 });
	} catch (err) {
		console.error('Complete signup error:', err);
		return json({ message: 'Internal server error' }, { status: 500 });
	}
};
