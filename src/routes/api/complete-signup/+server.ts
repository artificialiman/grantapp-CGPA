import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getDepartment } from '$lib/catalog';
import type { RequestHandler } from './$types';

const SERVICE_ROLE_KEY = env.SERVICE_ROLE_KEY;

/**
 * Creates the cgpa.students row after client-side auth.signUp() and
 * the device-limit check have both succeeded.
 *
 * Also locks in the student's course in the SAME request — founder's
 * explicit instruction (2026-09-28): ask for and lock a client's course
 * at signup, not as a separate later step. This reuses set-programme's
 * validation (getDepartment against the bundled catalog, no DB lookup
 * needed to check it) and writes the same two columns
 * (faculty_slug/department_slug) that migration
 * ..._cgpa_0018_student_programme.sql added and set-programme/
 * onboarding/programme already read and write — this is not a second,
 * parallel system, it is the same one, just also reachable from here.
 * set-programme and /onboarding/programme are UNCHANGED and still work
 * exactly as before, as the path for any account that reaches the
 * dashboard without a programme (e.g. one created before this change).
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const { session, user } = await locals.safeGetSession();
		if (!session || !user) {
			return json({ message: 'Unauthorized' }, { status: 401 });
		}

		const body = (await request.json()) as {
			full_name?: string;
			faculty_slug?: string;
			dept_slug?: string;
		};
		const full_name = (body.full_name ?? '').trim();

		if (!full_name) {
			return json({ message: 'Full name is required' }, { status: 400 });
		}
		if (!body.faculty_slug || !body.dept_slug) {
			return json({ message: 'Choose the course you are studying' }, { status: 400 });
		}
		if (!getDepartment(body.faculty_slug, body.dept_slug)) {
			return json({ message: 'Unknown faculty or department' }, { status: 400 });
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

		const { error: upsertError } = await adminClient.from('students').upsert(
			{
				id: user.id,
				full_name,
				faculty_slug: body.faculty_slug,
				department_slug: body.dept_slug
			},
			{ onConflict: 'id' }
		);

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
