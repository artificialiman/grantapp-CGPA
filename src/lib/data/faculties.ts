/**
 * Static faculty/department catalog. This is the whole fix for the
 * faculties browse screen having a real network round-trip (two
 * Supabase queries: faculties, then all departments to count them)
 * for data that never changes at runtime -- faculty and department
 * names/slugs only ever change via a migration, which is the exact
 * same cadence as editing this file and redeploying. There is no
 * admin UI anywhere in this codebase for creating a faculty or
 * department (confirmed: only `courses` has one, at
 * /admin/keystone-questions and friends) -- this table has always
 * been content-team/migration-curated, never student- or even
 * admin-panel-editable at runtime.
 *
 * Courses are NOT included here and should stay a real fetch -- they
 * change as user/lecturer-submitted content gets approved
 * (approval_status), which genuinely happens between deploys. Only
 * the faculty -> department shape (onboarding steps 1-2) is static;
 * step 3 (the course list within a department) still queries
 * cgpa.courses.
 *
 * Source of truth: every `insert into cgpa.faculties` / `insert into
 * cgpa.departments` across every migration as of this file's
 * creation (0001, 0005, dev_seed_test_content, 0007, 0011, 0013),
 * PLUS Economics and Insurance from PROJECT_BRIEF.md's original 7 --
 * neither of which had ever actually been seeded in the database
 * (a real brief-vs-build drift, flagged separately) -- added here
 * per founder instruction to include both rather than drop them.
 *
 * When a new department (or, rarer, a new faculty) needs to be added:
 * add it here AND as a migration (so cgpa.departments stays the
 * foreign-key target `courses.department_id` needs), in that order.
 * This file is the source SvelteKit routes read for display; the DB
 * table is what `courses` still keys against.
 */

export interface Department {
	slug: string;
	name: string;
}

export interface Faculty {
	slug: string;
	name: string;
	departments: Department[];
}

export const FACULTIES: Faculty[] = [
	{
		slug: 'medicine',
		name: 'Medicine',
		departments: [{ slug: 'human-medicine', name: 'Human Medicine' }]
	},
	{
		slug: 'pharmacy',
		name: 'Pharmacy',
		departments: [{ slug: 'pharmacy', name: 'Pharmacy' }]
	},
	{
		slug: 'nursing',
		name: 'Nursing',
		departments: [{ slug: 'nursing-science', name: 'Nursing Science' }]
	},
	{
		slug: 'engineering',
		name: 'Engineering',
		departments: [
			{ slug: 'mechanical-engineering', name: 'Mechanical Engineering' },
			{ slug: 'electrical-and-electronic-engineering', name: 'Electrical and Electronic Engineering' },
			{ slug: 'chemical-engineering', name: 'Chemical Engineering' },
			{ slug: 'petroleum-engineering', name: 'Petroleum Engineering' },
			{ slug: 'agricultural-and-bioresources-engineering', name: 'Agricultural and Bioresources Engineering' },
			{ slug: 'metallurgical-and-materials-engineering', name: 'Metallurgical and Materials Engineering' },
			{ slug: 'civil-engineering', name: 'Civil Engineering' }
		]
	},
	{
		slug: 'law',
		name: 'Law',
		departments: [{ slug: 'common-law', name: 'Common Law' }]
	},
	{
		slug: 'science',
		name: 'Science',
		departments: [
			{ slug: 'computer-science', name: 'Computer Science' },
			{ slug: 'biochemistry', name: 'Biochemistry' },
			{ slug: 'environmental-management-and-toxicology', name: 'Environmental Management and Toxicology' },
			// Microbiology: PROJECT_BRIEF.md's original 7 lists it as a
			// standalone faculty; the actual database has never seeded it
			// at all, in either form. Placed here as a department under
			// Science (alongside Biochemistry, its closest existing
			// sibling in every seed batch) rather than invented as an
			// eighth top-level faculty with no precedent in any migration
			// -- flagged as a real brief-vs-build gap, not silently
			// resolved as if this were always the plan.
			{ slug: 'microbiology', name: 'Microbiology' }
		]
	},
	{
		slug: 'general-studies',
		name: 'General Studies',
		departments: [{ slug: 'general-studies', name: 'General Studies' }]
	},
	// Economics and Insurance: from PROJECT_BRIEF.md's original 7,
	// never seeded in any migration under any name. Added per explicit
	// founder instruction ("add both") rather than dropped -- each
	// gets one placeholder department matching its own faculty name,
	// same pattern as Pharmacy/Law/General Studies above (a faculty
	// with exactly one same-named department), since no real
	// department breakdown for either has been specified anywhere.
	// These two need actual course content and a migration adding them
	// to cgpa.faculties/departments before they're anything more than
	// a browsable, empty faculty page -- real gap, not hidden.
	{
		slug: 'economics',
		name: 'Economics',
		departments: [{ slug: 'economics', name: 'Economics' }]
	},
	{
		slug: 'insurance',
		name: 'Insurance',
		departments: [{ slug: 'insurance', name: 'Insurance' }]
	}
];

export function getFaculty(slug: string): Faculty | undefined {
	return FACULTIES.find((f) => f.slug === slug);
}

export function getDepartment(facultySlug: string, deptSlug: string): Department | undefined {
	return getFaculty(facultySlug)?.departments.find((d) => d.slug === deptSlug);
}
