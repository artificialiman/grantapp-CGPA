import { safeGetSessionOrDevBypass } from '$lib/auth/devMode';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * Doctrine Section 1: "Upload Course Material screen — student
 * uploads their own institution's notes/past-questions; paired output
 * screen shows generated questions/Mastery-path from that upload. At
 * launch, this screen's action routes to the WhatsApp group (manual
 * collection) rather than live AI generation — the AI-gen pipeline is
 * being built in parallel post-launch."
 *
 * This load's only job is fetching the student's own course list (so
 * they can say WHICH course the material is for before going to
 * WhatsApp) — no upload/generation logic here, since none of that
 * exists yet at launch per the doctrine above.
 */
export const load: PageServerLoad = async (event) => {
	const { session, user } = await safeGetSessionOrDevBypass(event.locals);
	if (!session || !user) {
		throw redirect(303, '/login?next=/upload-course-material');
	}

	const { data: enrollments, error } = await event.locals.supabase
		.from('enrollments')
		.select('courses(id, name, code)')
		.eq('student_id', user.id);

	if (error) {
		console.error('Failed to load enrolled courses:', error);
		return { courses: [] };
	}

	// Supabase's generated types return a to-one join (enrollments ->
	// courses via course_id) as an array type regardless of the actual
	// FK cardinality, since the client can't statically verify
	// uniqueness from the query alone -- .flat() + filtering null/
	// undefined entries handles both the "array of one" shape Supabase
	// actually returns at runtime and satisfies the type checker,
	// rather than a type predicate that assumed a single object and
	// silently mismatched what was actually returned.
	const courses = (enrollments ?? [])
		.flatMap((e) => e.courses)
		.filter((c): c is { id: number; name: string; code: string | null } => c != null);

	return { courses };
};
