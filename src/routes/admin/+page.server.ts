import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * /admin had no +page.svelte at all -- only the layout gate and the
 * nested keystone-questions folder -- so visiting the bare /admin URL
 * 404'd. That's very likely what "I don't see any questions to
 * approve" actually was: the natural first guess at the admin URL led
 * nowhere, not an empty list at the real page.
 *
 * Redirects straight to the one admin tool that exists right now.
 * When a second admin tool gets built, this becomes a real index page
 * instead.
 */
export const load: PageServerLoad = async () => {
	throw redirect(303, '/admin/keystone-questions');
};
