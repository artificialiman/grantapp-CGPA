import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { safeGetSessionOrDevBypass } from '$lib/auth/devMode';
import type { LayoutServerLoad } from './$types';

/**
 * Same pattern as grantapp-shell's admin/+layout.server.ts: a
 * server-only ADMIN_EMAILS allowlist, checked against the session's
 * own email. Not-an-admin and not-logged-in both redirect to the same
 * /login destination — deliberately indistinguishable, so this route
 * doesn't leak its own existence to a non-admin who stumbles onto it.
 *
 * No admin surface existed anywhere in this app before this file —
 * confirmed by search before writing it (`find src/routes -iname
 * "*admin*"` returned nothing). Every content-approval action until
 * now required a direct SQL edit against production.
 */
export const load: LayoutServerLoad = async (event) => {
	const { session, user } = await safeGetSessionOrDevBypass(event.locals);
	if (!session || !user) {
		throw redirect(303, '/login');
	}

	const adminEmails = (env.ADMIN_EMAILS ?? '')
		.split(',')
		.map((e) => e.trim().toLowerCase())
		.filter(Boolean);

	const email = user.email?.toLowerCase();
	if (!email || !adminEmails.includes(email)) {
		throw redirect(303, '/login');
	}

	return { adminEmail: email };
};
