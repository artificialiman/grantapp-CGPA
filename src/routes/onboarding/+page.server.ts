import type { PageServerLoad } from './$types';

/**
 * Onboarding step 1 of 5 (cgpa-state-of-play.md, "Full onboarding
 * flow, in order"): "Open app -> see Faculties (top-level list)."
 * Read-only browse — Faculty/Department/Course browse is Yes/Yes/—
 * in the permission matrix (Section 2), no gating needed here beyond
 * whatever the root layout already applies.
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
