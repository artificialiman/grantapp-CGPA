import { error } from '@sveltejs/kit';
import { getFaculty } from '$lib/data/faculties';
import type { PageServerLoad } from './$types';

/**
 * cgpa-state-of-play.md onboarding step 2: "Open a Faculty -> see
 * Departments within it." No auth gate — see faculties/+page.server.ts's
 * comment; authgates/signin come last, not while a feature is still
 * being built.
 *
 * Faculty/department lookup is now static ($lib/data/faculties.ts) --
 * see that file's header and faculties/+page.server.ts's comment for
 * why. Only course counts still hit the DB: those change as content
 * gets approved between deploys, unlike faculty/department identity.
 */
export const load: PageServerLoad = async ({ params, locals }) => {
	const faculty = getFaculty(params.facultySlug);

	if (!faculty) {
		throw error(404, 'Unknown faculty');
	}

	const deptSlugs = faculty.departments.map((d) => d.slug);

	// Course count per department -- the one remaining real query on
	// this page. Fetched by department slug directly rather than by a
	// DB-side faculty_id/department_id join, since departments
	// themselves no longer come from a query on this page at all.
	const { data: allCourses, error: coursesError } = deptSlugs.length
		? await locals.supabase
				.from('courses')
				.select('department_id, departments!inner(slug)')
				.in('departments.slug', deptSlugs)
				.eq('approval_status', 'approved')
		: { data: [], error: null };

	if (coursesError) {
		console.error('Failed to load course counts:', coursesError);
	}

	const courseCounts = new Map<string, number>();
	for (const c of (allCourses ?? []) as unknown as { departments: { slug: string } }[]) {
		const slug = c.departments.slug;
		courseCounts.set(slug, (courseCounts.get(slug) ?? 0) + 1);
	}

	const departmentsWithCounts = faculty.departments.map((d) => ({
		...d,
		courseCount: courseCounts.get(d.slug) ?? 0
	}));

	return {
		faculty: { name: faculty.name, slug: faculty.slug },
		departments: departmentsWithCounts
	};
};
