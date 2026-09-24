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
 * TODO (EXPERIENCE_CONTEXT.md #3-4): a returning student with >=1
 * enrollment should redirect straight to /dashboard rather than
 * re-entering this wizard — [CONFIRMED] as a UX rule, but the exact
 * gate condition (>=1 enrollment vs. an explicit onboarded_at flag on
 * cgpa.students) is [OPEN], and no such flag exists on students yet.
 * Not implemented here rather than guessed, per that doc's own
 * status tags.
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

	// Department count per faculty — one query, counted client-side,
	// rather than N+1 per-faculty count queries. This screen is the
	// hero moment of the whole app (onboarding step 1), so it needs
	// real content per faculty, not just a bare name.
	const { data: allDepartments } = await locals.supabase
		.from('departments')
		.select('faculty_id');

	const deptCounts = new Map<number, number>();
	for (const d of allDepartments ?? []) {
		deptCounts.set(d.faculty_id, (deptCounts.get(d.faculty_id) ?? 0) + 1);
	}

	const facultiesWithCounts = (faculties ?? []).map((f) => ({
		...f,
		departmentCount: deptCounts.get(f.id) ?? 0
	}));

	return { faculties: facultiesWithCounts };
};
