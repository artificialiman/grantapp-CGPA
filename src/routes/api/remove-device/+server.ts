import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

const SERVICE_ROLE_KEY = env.SERVICE_ROLE_KEY;

/**
 * Doctrine: "a self-serve screen listing existing devices... and a
 * 'remove this device' action, requiring no manual admin
 * intervention." This is that action. A student can only ever remove
 * their OWN device rows (student_id ownership check below) — there is
 * no admin-facing equivalent of this endpoint, on purpose, since the
 * whole point is that no admin step is needed.
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const { session, user } = await locals.safeGetSession();
		if (!session || !user) {
			return json({ message: 'Unauthorized' }, { status: 401 });
		}

		const body = (await request.json()) as { device_id?: number };
		const { device_id } = body;

		if (!device_id) {
			return json({ message: 'Missing device_id' }, { status: 400 });
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

		// Ownership check via the delete's own filter (student_id = this
		// user), not a separate select-then-delete — a student can never
		// remove another student's device row even if they guess a valid
		// device_id, since the row simply won't match this filter and
		// the delete affects zero rows rather than erroring in a way that
		// leaks whether that id belongs to someone else.
		const { error: deleteError, count } = await adminClient
			.from('devices')
			.delete({ count: 'exact' })
			.eq('id', device_id)
			.eq('student_id', user.id);

		if (deleteError) throw deleteError;

		if (!count) {
			return json({ message: 'Device not found' }, { status: 404 });
		}

		return json({ removed: true });
	} catch (err) {
		console.error('remove-device error:', err);
		return json({ message: 'Internal server error' }, { status: 500 });
	}
};
