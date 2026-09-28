import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getDepartment } from '$lib/catalog';
import { safeGetSessionOrDevBypass } from '$lib/auth/devMode';
import type { RequestHandler } from './$types';

/**
 * Records the student's chosen programme on their own profile row.
 * Authenticated only; the (faculty, department) pair is validated
 * against the static catalog first, so nothing invalid is ever
 * written and no DB lookup is needed to check it. The write itself
 * uses the service role (students has no client-side write policy by
 * design) and is scoped to the caller's own id — never a client-
 * supplied one.
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	const { session, user } = await safeGetSessionOrDevBypass(locals);
	if (!session || !user) {
		return json({ message: 'Not signed in' }, { status: 401 });
	}

	const body = (await request.json()) as { faculty_slug?: string; dept_slug?: string };
	if (!body.faculty_slug || !body.dept_slug) {
		return json({ message: 'Missing faculty_slug or dept_slug' }, { status: 400 });
	}
	if (!getDepartment(body.faculty_slug, body.dept_slug)) {
		return json({ message: 'Unknown faculty or department' }, { status: 400 });
	}

	const serviceRoleKey = env.SERVICE_ROLE_KEY;
	const supabaseUrl = env.VITE_SUPABASE_URL;
	if (!serviceRoleKey || !supabaseUrl) {
		console.error('Supabase service-role configuration missing');
		return json({ message: 'Server configuration error' }, { status: 500 });
	}

	const { createClient } = await import('@supabase/supabase-js');
	const admin = createClient(supabaseUrl, serviceRoleKey, { db: { schema: 'cgpa' } });

	const { error } = await admin
		.from('students')
		.update({ faculty_slug: body.faculty_slug, department_slug: body.dept_slug })
		.eq('id', user.id);

	if (error) {
		console.error('set-programme failed:', error);
		return json({ message: 'Could not save your programme' }, { status: 500 });
	}

	return json({ ok: true });
};
