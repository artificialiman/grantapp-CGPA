import { safeGetSessionOrDevBypass, isDevAuthBypassEnabled, frozenStudent } from '$lib/auth/devMode';
import { AUTH_FROZEN } from '$lib/auth/freeze';
import { redirect } from '@sveltejs/kit';
import { GRADING_SCALES, classifyGpa } from '$lib/cgpa/scales';
import { calculateCgpa, type CourseEntry } from '$lib/cgpa/calculate';
import { getDepartment, listCourses, groupByYearAndSemester } from '$lib/catalog';
import type { PageServerLoad } from './$types';

const DEFAULT_CREDIT_UNITS = 3; // see /transcript's identical note — no credit_units column exists on courses yet

/**
 * Dashboard was a bare "Welcome" placeholder from before onboarding/
 * track-progress existed — never built out since, found while
 * finishing the track-progress audit. A student landing here after
 * signup had zero signal that /transcript, /analytics, or /faculties
 * even existed, let alone any reason to go find them. This gives the
 * landing screen real content: enrolled-course count, a running CGPA
 * snapshot (same calculate.ts/scales.ts the standalone calculator and
 * /transcript already use — not a fourth reimplementation), and the
 * single weakest mastery combo as a concrete next-action prompt.
 */
export const load: PageServerLoad = async (event) => {
	const { session, user } = await safeGetSessionOrDevBypass(event.locals);
	if (!session || !user) {
		throw redirect(303, '/login?next=/dashboard');
	}

	const student = AUTH_FROZEN
		? frozenStudent(event)
		: (await event.locals.supabase.from('students').select('*').eq('id', user.id).maybeSingle()).data;

	// No programme picked yet -> onboarding. The bio is what scopes
	// everything below; without it there is nothing to show.
	if (!student?.faculty_slug || !student?.department_slug) {
		throw redirect(303, '/onboarding/programme');
	}

	// The student's own programme, straight from the bundled catalog —
	// zero fetching. Only their department's courses ever reach the page.
	const found = getDepartment(student.faculty_slug, student.department_slug);
	if (!found) {
		// Stored pair no longer in the catalog (catalog changed) -> re-pick.
		throw redirect(303, '/onboarding/programme');
	}
	const programme = {
		facultySlug: found.faculty.slug,
		facultyName: found.faculty.name,
		departmentSlug: found.department.slug,
		departmentName: found.department.name,
		// Own courses plus General Studies (GST/ENT), grouped year -> semester.
		years: groupByYearAndSemester(listCourses(student.faculty_slug, student.department_slug) ?? [])
	};

	const { data: enrollments } = await event.locals.supabase
		.from('enrollments')
		.select('id, grade, courses(id, name, code, slug, departments(slug, faculties(slug)))')
		.eq('student_id', user.id);

	const scale = GRADING_SCALES['nuc-5.0'];
	const gradedEntries: CourseEntry[] = (enrollments ?? [])
		.filter((e) => e.grade)
		.map((e) => ({ id: String(e.id), name: '', creditUnits: DEFAULT_CREDIT_UNITS, grade: e.grade! }));
	const cgpa = calculateCgpa(gradedEntries, scale);
	const classification = cgpa !== null ? classifyGpa(scale, cgpa) : null;

	const { data: weakestMastery } = await event.locals.supabase
		.from('mastery_state')
		.select(
			'course_id, cognitive_pattern, information_type, mastery_score, courses(name, slug, departments(slug, faculties(slug)))'
		)
		.eq('student_id', user.id)
		.not('mastery_score', 'is', null)
		.order('mastery_score', { ascending: true })
		.limit(1)
		.maybeSingle();

	// Practice CTA target: weakest mastery combo's course first (most
	// actionable — "here's specifically what to work on"), falling back
	// to the first enrolled course, and null (browse-first) only when
	// neither exists. Built as a finished href server-side from the slug
	// chain (this query is legitimately live: it's the student's own
	// status/analytics data), so the button is a plain link — no lookup
	// at click time. /practice/{f}/{d}/{c} then validates against the
	// static catalog and picks quick-test vs. course page.
	type SlugChain = {
		slug: string;
		departments: { slug: string; faculties: { slug: string } };
	};
	const toHref = (c: SlugChain | null | undefined): string | null =>
		c?.departments?.faculties?.slug
			? `/practice/${c.departments.faculties.slug}/${c.departments.slug}/${c.slug}`
			: null;

	const practiceHref: string | null =
		toHref(weakestMastery?.courses as unknown as SlugChain | null) ??
		toHref(enrollments?.[0]?.courses as unknown as SlugChain | null);

	return {
		student,
		devAuthBypass: isDevAuthBypassEnabled(),
		enrolledCount: (enrollments ?? []).length,
		cgpa,
		classification,
		weakestMastery,
		practiceHref,
		programme
	};
};
