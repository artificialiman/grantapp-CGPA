import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

const SERVICE_ROLE_KEY = env.SERVICE_ROLE_KEY;
const MAX_DEVICES = 2;

/**
 * The actual enforcement point for the doctrine's device limit:
 * "up to 2 devices max per account, absolutely enforced (not just
 * policy)... checked at login/auth time, not per-session." Called
 * client-side right after a successful client.auth.signInWithPassword
 * / signUp — the caller already has an authenticated session by the
 * time this runs; this endpoint's job is only the device-limit check
 * itself, not authentication.
 *
 * Response shapes:
 *   - { allowed: true } — device is already known, or there's room
 *     under the 2-device cap; the device_hash was registered/its
 *     last_active_at touched.
 *   - { allowed: false, devices: [...] } — a genuinely NEW device_hash
 *     arrived and the student is already at MAX_DEVICES. The client is
 *     expected to show the self-serve "remove a device" screen using
 *     the returned device list (doctrine: "a self-serve screen listing
 *     existing devices... and a remove this device action, requiring
 *     no manual admin intervention") — this endpoint does not remove
 *     anything itself; see /api/remove-device for that.
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const { session, user } = await locals.safeGetSession();
		if (!session || !user) {
			return json({ message: 'Unauthorized' }, { status: 401 });
		}

		const body = (await request.json()) as { device_hash?: string; device_label?: string };
		const { device_hash, device_label } = body;

		if (!device_hash) {
			return json({ message: 'Missing device_hash' }, { status: 400 });
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

		const { data: existingDevices, error: fetchError } = await adminClient
			.from('devices')
			.select('id, device_hash, device_label, first_seen_at, last_active_at')
			.eq('student_id', user.id)
			.order('last_active_at', { ascending: false });

		if (fetchError) throw fetchError;

		const matchingDevice = (existingDevices ?? []).find((d) => d.device_hash === device_hash);

		if (matchingDevice) {
			const { error: touchError } = await adminClient
				.from('devices')
				.update({ last_active_at: new Date().toISOString() })
				.eq('id', matchingDevice.id);
			if (touchError) throw touchError;

			return json({ allowed: true });
		}

		if ((existingDevices ?? []).length >= MAX_DEVICES) {
			return json({
				allowed: false,
				devices: existingDevices
			});
		}

		const { error: insertError } = await adminClient.from('devices').insert({
			student_id: user.id,
			device_hash,
			device_label: device_label ?? null
		});

		if (insertError) throw insertError;

		return json({ allowed: true });
	} catch (err) {
		console.error('check-device error:', err);
		return json({ message: 'Internal server error' }, { status: 500 });
	}
};
