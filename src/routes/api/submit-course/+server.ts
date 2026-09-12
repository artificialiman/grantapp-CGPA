import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { safeGetSessionOrDevBypass } from '$lib/auth/devMode';
import type { RequestHandler } from './$types';

const SERVICE_ROLE_KEY = env.SERVICE_ROLE_KEY;

/**
 * Doctrine step 4: "student can add an elective, or a core/extra-
 * credit requirement not already listed. This is free-text course
 * creation (not catalog-pick): submission routes to the admin side
 * for Tinggy's manual approval before entering the shared curriculum
 * backbone." Permission matrix: both free and premium students can
 * submit; neither can approve their own submission.
 *
 * Always inserts with approval_status='pending' — the column default
 * is 'approved' (for admin-seeded content), so this endpoint
 * deliberately overrides that default rather than relying on it,
 * since a student-submitted row silently landing as 'approved' would
 * bypass the entire review pipeline the doctrine requires.
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const { session, user } = await safeGetSessionOrDevBypass(locals);
		if (!session || !user) {
			return json({ message: 'Unauthorized' }, { status: 401 });
		}

		const body = (await request.json()) as {
			department_id?: number;
			year?: number;
			name?: string;
			code?: string;
			kind?: 'core' | 'elective' | 'extra_credit';
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

		const { error: insertError } = await adminClient.from('courses').insert({
			department_id,
			year,
			name: name.trim(),
			code: code?.trim() || null,
			kind,
			approval_status: 'pending',
			submitted_by: user.id
		});

		if (insertError) {
			console.error('submit-course insert error:', insertError);
			return json({ message: 'Failed to submit course' }, { status: 500 });
		}

		return json({ message: 'Course submitted for admin approval' }, { status: 200 });
	} catch (err) {
		console.error('submit-course error:', err);
		return json({ message: 'Internal server error' }, { status: 500 });
	}
};
