import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

const SERVICE_ROLE_KEY = env.SERVICE_ROLE_KEY;

/**
 * cgpa-state-of-play.md onboarding step 4: free-text course
 * submission, admin-approved before it's browsable (migration 0001's
 * approval_status pipeline). No auth requirement here — build-doctrine
 * invariant, same as the three browse routes on this branch. If a
 * session happens to exist, submitted_by is set from it (real
 * attribution when we have it); if not, submitted_by stays null rather
 * than blocking the submission on signing in first.
 *
 * Service-role client, not locals.supabase — migration 0001 gives
 * cgpa.courses exactly one RLS policy (SELECT, approved rows,
 * authenticated only), no INSERT policy at all, so the RLS-scoped
 * client would be denied outright regardless of auth state. Same
 * pattern api/complete-signup already uses for its own write.
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const { session, user } = await locals.safeGetSession();

		const body = (await request.json()) as {
			department_id: number;
			year: number;
			name: string;
			code?: string;
			kind: 'core' | 'elective' | 'extra_credit';
		};

		const { department_id, year, name, code, kind } = body;

		if (!department_id || !year || !name?.trim() || !kind) {
			return json({ message: 'Missing department_id, year, name, or kind' }, { status: 400 });
		}
		if (!['core', 'elective', 'extra_credit'].includes(kind)) {
			return json({ message: 'Invalid kind' }, { status: 400 });
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

		const { data, error } = await adminClient
			.from('courses')
			.insert({
				department_id,
				year,
				name: name.trim(),
				code: code?.trim() || null,
				kind,
				approval_status: 'pending',
				submitted_by: session && user ? user.id : null
			})
			.select('id')
			.single();

		if (error) {
			console.error('submit-course insert error:', error);
			return json({ message: 'Failed to submit course' }, { status: 500 });
		}

		return json({ id: data.id, message: 'Submitted for admin review' });
	} catch (err) {
		console.error('submit-course error:', err);
		return json({ message: 'Internal server error' }, { status: 500 });
	}
};
