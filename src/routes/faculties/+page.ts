import { CATALOG } from '$lib/catalog';
import type { PageLoad } from './$types';

/**
 * Universal load (+page.ts), zero Supabase calls: on client-side navigation it runs in the
 * browser, so moving between browse pages makes no request at all and works offline once
 * the app is open. Per direct instruction: this is an
 * offline-heavy app, and the faculty/department/course catalog is
 * static curriculum structure that barely changes -- it ships with
 * the app bundle instead of costing a network round trip every time
 * someone browses. Only questions, analytics, status, and
 * notifications should ever be live-fetched.
 */
export const load: PageLoad = () => {
	const faculties = CATALOG.map((f) => ({
		slug: f.slug,
		name: f.name,
		departmentCount: f.departments.length
	}));

	return { faculties };
};
