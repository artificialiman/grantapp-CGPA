import { safeGetSessionOrDevBypass, isDevAuthBypassEnabled } from '$lib/auth/devMode';
import { redirect } from '@sveltejs/kit';
import { GRADING_SCALES, classifyGpa } from '$lib/cgpa/scales';
import { calculateCgpa, type CourseEntry } from '$lib/cgpa/calculate';
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

	const { data: student } = await event.locals.supabase.from('students').select('*').eq('id', user.id).maybeSingle();

	const { data: enrollments } = await event.locals.supabase
		.from('enrollments')
		.select('id, grade, courses(id, name, code)')
		.eq('student_id', user.id);

	const scale = GRADING_SCALES['nuc-5.0'];
	const gradedEntries: CourseEntry[] = (enrollments ?? [])
		.filter((e) => e.grade)
		.map((e) => ({ id: String(e.id), name: '', creditUnits: DEFAULT_CREDIT_UNITS, grade: e.grade! }));
	const cgpa = calculateCgpa(gradedEntries, scale);
	const classification = cgpa !== null ? classifyGpa(scale, cgpa) : null;

	const { data: weakestMastery } = await event.locals.supabase
		.from('mastery_state')
		.select('course_id, cognitive_pattern, information_type, mastery_score, courses(name)')
		.eq('student_id', user.id)
		.not('mastery_score', 'is', null)
		.order('mastery_score', { ascending: true })
		.limit(1)
		.maybeSingle();

	// Practice CTA target: weakest mastery combo's course first (most
	// actionable — "here's specifically what to work on"), falling back
	// to the first enrolled course for a student with enrollments but no
	// answered questions yet, and null (browse-first) only when neither
	// exists. /practice/{id} resolves the rest (see that route's load).
	const practiceCourseId: number | null =
		weakestMastery?.course_id ?? (enrollments?.[0]?.courses as { id: number } | null)?.id ?? null;

	return {
		student,
		devAuthBypass: isDevAuthBypassEnabled(),
		enrolledCount: (enrollments ?? []).length,
		cgpa,
		classification,
		weakestMastery,
		practiceCourseId
	};
};
