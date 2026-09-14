import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { safeGetSessionOrDevBypass } from '$lib/auth/devMode';
import type { RequestHandler } from './$types';

const SERVICE_ROLE_KEY = env.SERVICE_ROLE_KEY;

/**
 * Records a "material submission" — the app-side tracking half of
 * Upload Course Material (the WhatsApp message itself still happens
 * client-side via the existing CTA; this is what makes the
 * submission show up in the student's own history afterward).
 *
 * Per instruction: detect course codes directly against the real
 * repo/schema data (cgpa.courses.code), not a fixed/guessed pattern
 * list, and not left to the student's dropdown pick alone — a student
 * pasting raw notes or past-question text may reference a course
 * code inline (e.g. "CSC201 — Data Structures, past questions") even
 * if they didn't explicitly select that course from the picker.
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const { session, user } = await safeGetSessionOrDevBypass(locals);
		if (!session || !user) {
			return json({ message: 'Unauthorized' }, { status: 401 });
		}

		const body = (await request.json()) as { course_id?: number | null; notes_text?: string };
		const { course_id, notes_text } = body;

		if (!SERVICE_ROLE_KEY) {
			console.error('SERVICE_ROLE_KEY not configured');
			return json({ message: 'Server configuration error' }, { status: 500 });
		}

		const { createClient } = await import('@supabase/supabase-js');
		const supabaseUrl = env.VITE_SUPABASE_URL;
		if (!supabaseUrl) {
			return json({ message: 'Server configuration error' }, { status: 500 });
		}

		const adminClient = createClient(supabaseUrl, SERVICE_ROLE_KEY, { db: { schema: 'cgpa' } });

		const { error: ensureStudentError } = await adminClient
			.from('students')
			.upsert({ id: user.id, full_name: user.email?.split('@')[0] ?? 'Student' }, { onConflict: 'id', ignoreDuplicates: true });
		if (ensureStudentError) {
			console.error('submit-material ensure-student error:', ensureStudentError);
		}

		// Course-code detection: pull every real (id, code) pair that
		// has a non-null code, then check which ones appear as whole
		// "words" in the student's pasted text. Word-boundary matching
		// so a code like "GST" doesn't false-positive on "against" or
		// similar substrings — a real risk with short 2-4 letter
		// department prefixes. Case-insensitive since a student typing
		// quickly may not match the DB's exact casing.
		const detectedCourseIds: number[] = [];
		if (notes_text && notes_text.trim().length > 0) {
			const { data: codedCourses, error: codesError } = await adminClient
				.from('courses')
				.select('id, code')
				.not('code', 'is', null);

			if (codesError) {
				console.error('submit-material code-lookup error:', codesError);
			} else {
				for (const course of codedCourses ?? []) {
					if (!course.code) continue;
					const escaped = course.code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
					const pattern = new RegExp(`\\b${escaped}\\b`, 'i');
					if (pattern.test(notes_text)) {
						detectedCourseIds.push(course.id);
					}
				}
			}
		}

		const { data: inserted, error: insertError } = await adminClient
			.from('submissions')
			.insert({
				student_id: user.id,
				course_id: course_id ?? null,
				notes_text: notes_text ?? null,
				detected_course_ids: detectedCourseIds
			})
			.select('id, detected_course_ids')
			.single();

		if (insertError) {
			console.error('submit-material insert error:', insertError);
			return json({ message: 'Failed to record submission' }, { status: 500 });
		}

		return json({ id: inserted.id, detected_course_ids: inserted.detected_course_ids });
	} catch (err) {
		console.error('submit-material error:', err);
		return json({ message: 'Internal server error' }, { status: 500 });
	}
};
