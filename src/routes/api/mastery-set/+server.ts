import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { selectAdaptiveQuestions } from '$lib/quiz/select';
import type { RequestHandler } from './$types';

const SERVICE_ROLE_KEY = env.SERVICE_ROLE_KEY;
const SET_SIZE = 20;
const RECENCY_EXCLUDE_DAYS = 14;

/**
 * Ported from grantapp-shell's api/daily-100 -- doctrine Clause 1.
 * 5 sets of 20, 2 adaptive stage gates. Returns only the student's
 * CURRENT set; Sets 2+ don't exist as question_ids until their gate
 * fires in submit-mastery-set. No side effects, safe to call
 * repeatedly.
 *
 * Real schema differences from the source, not glossed over:
 * - No recency-exclusion source table exists yet for CGPA the way
 *   UTME has answer_events (a full event log). student_question_progress
 *   is upsert-only, one row per (student, question) ever
 *   (see submit-quick-test's own comment: "progress toward 10,000
 *   distinct questions", a coverage metric, not a log) -- so there is
 *   no "answered in the last 14 days" to query. Recency exclusion is
 *   dropped for Set 1 here, not faked with a table that doesn't carry
 *   that information. Worth building properly if repeat-question
 *   staleness turns out to matter in practice.
 * - `locals.safeGetSession()` on this branch already includes the
 *   dev-bypass fallback (see lib/auth/devMode.ts) -- no separate
 *   check needed here, same as every other route on this branch.
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		const { session, user } = await locals.safeGetSession();
		if (!session || !user) {
			return json({ message: 'Unauthorized' }, { status: 401 });
		}

		const courseId = url.searchParams.get('course_id');
		if (!courseId) {
			return json({ message: 'Missing course_id parameter' }, { status: 400 });
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
		const today = new Date().toISOString().slice(0, 10);

		const { data: existing, error: existingError } = await adminClient
			.from('mastery_assignments')
			.select('id, completed_count, question_sets, current_set, gate_1_fired_at, gate_2_fired_at')
			.eq('student_id', user.id)
			.eq('course_id', courseId)
			.eq('assigned_date', today)
			.maybeSingle();

		if (existingError) throw existingError;

		let row = existing;

		if (!row) {
			const set1 = await selectAdaptiveQuestions(adminClient, user.id, Number(courseId), SET_SIZE, []);
			const set1Ids = set1.map((q) => q.id);

			const { data: inserted, error: insertError } = await adminClient
				.from('mastery_assignments')
				.insert({
					student_id: user.id,
					course_id: courseId,
					assigned_date: today,
					completed_count: 0,
					question_sets: { '1': set1Ids },
					current_set: 1
				})
				.select('id, completed_count, question_sets, current_set, gate_1_fired_at, gate_2_fired_at')
				.single();

			if (insertError) throw insertError;
			row = inserted;
		}

		const setKey = String(row.current_set);
		const currentSetIds: number[] | undefined = row.question_sets?.[setKey];

		if (!currentSetIds || currentSetIds.length === 0) {
			return json({
				questions: [],
				current_set: row.current_set,
				gate_pending: true,
				completed_count: row.completed_count
			});
		}

		const { data: questions, error: questionsError } = await adminClient
			.from('keystone_questions')
			.select('id, course_id, cognitive_patterns, information_types, prompt, options, correct_option_id, explanation, difficulty')
			.in('id', currentSetIds);

		if (questionsError) throw questionsError;

		const byId = new Map((questions ?? []).map((q) => [q.id, q]));
		const ordered = currentSetIds.map((id) => byId.get(id)).filter(Boolean);

		return json({
			questions: ordered,
			current_set: row.current_set,
			completed_count: row.completed_count,
			mastery_assignment_id: row.id
		});
	} catch (err) {
		console.error('mastery-set error:', err);
		return json({ message: 'Internal server error' }, { status: 500 });
	}
};
