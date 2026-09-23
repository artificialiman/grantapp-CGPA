import { fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { Actions, PageServerLoad } from './$types';

/**
 * keystone_questions has no UPDATE policy at all, and its SELECT
 * policy only covers approval_status='approved' — meaning even an
 * admin's own normal session can't read pending rows or approve
 * anything through RLS. Same reasoning as grantapp-shell's admin
 * tooling: privileged actions go through a service-role client
 * created here, after the layout's session-based admin check has
 * already run — RLS bypass is scoped to this one server-only code
 * path, never exposed to the client.
 */
async function adminClient() {
	const { createClient } = await import('@supabase/supabase-js');
	const supabaseUrl = env.VITE_SUPABASE_URL;
	const serviceRoleKey = env.SERVICE_ROLE_KEY;
	if (!supabaseUrl || !serviceRoleKey) {
		throw new Error('Missing Supabase service-role configuration');
	}
	return createClient(supabaseUrl, serviceRoleKey, {
		db: { schema: 'cgpa' },
		auth: { autoRefreshToken: false, persistSession: false }
	});
}

export const load: PageServerLoad = async () => {
	const supabase = await adminClient();

	const { data: pending, error } = await supabase
		.from('keystone_questions')
		.select('id, prompt, options, correct_option_id, explanation, difficulty, source, created_at, courses(id, name, code)')
		.eq('approval_status', 'pending')
		.order('created_at', { ascending: true });

	if (error) {
		console.error('Failed to load pending keystone_questions:', error);
		return { pending: [] };
	}

	return { pending: pending ?? [] };
};

export const actions: Actions = {
	approve: async ({ request }) => {
		const form = await request.formData();
		const id = form.get('id');
		if (!id) return fail(400, { message: 'Missing question id' });

		const supabase = await adminClient();
		const { error } = await supabase
			.from('keystone_questions')
			.update({ approval_status: 'approved' })
			.eq('id', id);

		if (error) {
			console.error('Approve failed:', error);
			return fail(500, { message: 'Approve failed' });
		}
		return { success: true };
	},

	reject: async ({ request }) => {
		const form = await request.formData();
		const id = form.get('id');
		if (!id) return fail(400, { message: 'Missing question id' });

		const supabase = await adminClient();
		const { error } = await supabase
			.from('keystone_questions')
			.update({ approval_status: 'rejected' })
			.eq('id', id);

		if (error) {
			console.error('Reject failed:', error);
			return fail(500, { message: 'Reject failed' });
		}
		return { success: true };
	}
};
