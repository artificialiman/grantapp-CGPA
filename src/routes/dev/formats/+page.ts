import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

// A preview of the question formats that are built but not live. It exists only when the app runs in
// development; in a production build this address is a 404, so students never see it.
export const load: PageLoad = () => {
	if (!dev) error(404, 'Not found');
	return {};
};
