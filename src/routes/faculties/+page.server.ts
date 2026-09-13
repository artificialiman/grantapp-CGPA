import type { PageServerLoad } from './$types';

/**
 * cgpa-state-of-play.md Section 1, onboarding step 1: "Open app -> see
 * Faculties (top-level list)." This is a browse/catalog screen, not
 * tied to a student's own home faculty — DATA_DICTIONARY.md's
 * students.faculty is still [OPEN] (immutability/transfer-flow
 * undecided), and this route deliberately doesn't touch that fork.
 *
 * No auth gate here — build-doctrine invariant: authgates and signin
 * are implemented LAST, once the rest of a feature is proven, never
 * bolted onto a route as it's first being built. Open to anyone for
 * now; personalization/restriction is a deliberate later pass, not an
 * assumption baked in while this is still taking shape.
 */
export const load: PageServerLoad = async ({ locals }) => {
	const { data: faculties, error } = await locals.supabase
		.from('faculties')
		.select('id, name, slug')
		.order('name');

	if (error) {
		console.error('Failed to load faculties:', error);
		return { faculties: [] };
	}

	return { faculties: faculties ?? [] };
};
