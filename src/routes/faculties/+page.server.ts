import { FACULTIES } from '$lib/data/faculties';
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
 *
 * Zero DB calls, deliberately. This previously ran two Supabase
 * queries (faculties, then every department, counted client-side) for
 * data that never changes at runtime -- founder's explicit ask: no
 * fetch, no loading screen anywhere in the onboarding path, native-app
 * feel end to end. Faculty/department identity only ever changes via
 * a migration (see $lib/data/faculties.ts's header for the full
 * reasoning and source-of-truth trail) -- that's the same cadence as
 * editing this static file and redeploying, so there was never a real
 * need for a live query here.
 *
 * TODO (EXPERIENCE_CONTEXT.md #3-4): a returning student with >=1
 * enrollment should redirect straight to /dashboard rather than
 * re-entering this wizard — [CONFIRMED] as a UX rule, but the exact
 * gate condition (>=1 enrollment vs. an explicit onboarded_at flag on
 * cgpa.students) is [OPEN], and no such flag exists on students yet.
 * Not implemented here rather than guessed, per that doc's own
 * status tags.
 */
export const load: PageServerLoad = () => {
	const faculties = FACULTIES.map((f) => ({
		slug: f.slug,
		name: f.name,
		departmentCount: f.departments.length
	}));

	return { faculties };
};
