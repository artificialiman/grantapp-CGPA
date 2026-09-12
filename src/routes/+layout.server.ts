import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	try {
		const { session, user } = await event.locals.safeGetSession();

		let student = null;
		if (user) {
			const { data } = await event.locals.supabase.from('students').select('*').eq('id', user.id).single();
			student = data;
		}

		return {
			session,
			student,
			user
		};
	} catch (err) {
		console.error('Layout server load error:', err);
		return {
			session: null,
			student: null,
			user: null
		};
	}
};
