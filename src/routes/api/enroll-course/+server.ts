import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { safeGetSessionOrDevBypass } from '$lib/auth/devMode';
import type { RequestHandler } from './$types';

const SERVICE_ROLE_KEY = env.SERVICE_ROLE_KEY;

/**
 * Creates or updates one enrollment row — a student adding a course
 * to their own path (grade null, in-progress) or recording a grade
 * for one already added. Upsert on (student_id, course_id) since
 * "add the course" and "grade the course" are the same underlying
 * row at two different points in time, not two different operations.
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const { session, user } = await safeGetSessionOrDevBypass(locals);
		if (!session || !user) {
			return json({ message: 'Unauthorized' }, { status: 401 });
		}

		const body = (await request.json()) as {
			course_id?: number;
			semester?: number;
			grade?: string | null;
		};

		const { course_id, semester, grade } = body;

		if (!course_id || !semester) {
			return json({ message: 'Missing course_id or semester' }, { status: 400 });
		}
		if (semester !== 1 && semester !== 2) {
			return json({ message: 'semester must be 1 or 2' }, { status: 400 });
		}

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

		// Same students-row-may-not-exist-yet guard as check-device and
		// submit-quick-test — enrollments.student_id has a foreign key on
		// cgpa.students(id); without this, a logged-in student whose
		// profile row hasn't been created yet would have their course
		// addition silently fail with an opaque error.
		const { error: ensureStudentError } = await adminClient
			.from('students')
			.upsert({ id: user.id, full_name: user.email?.split('@')[0] ?? 'Student' }, { onConflict: 'id', ignoreDuplicates: true });
		if (ensureStudentError) {
			console.error('enroll-course ensure-student error:', ensureStudentError);
		}

		const { error: upsertError } = await adminClient.from('enrollments').upsert(
			{
				student_id: user.id,
				course_id,
				semester,
				grade: grade ?? null,
				updated_at: new Date().toISOString()
			},
			{ onConflict: 'student_id,course_id' }
		);

		if (upsertError) {
			console.error('enroll-course upsert error:', upsertError);
			return json({ message: 'Failed to save enrollment' }, { status: 500 });
		}

		return json({ message: 'Saved' }, { status: 200 });
	} catch (err) {
		console.error('enroll-course error:', err);
		return json({ message: 'Internal server error' }, { status: 500 });
	}
};
