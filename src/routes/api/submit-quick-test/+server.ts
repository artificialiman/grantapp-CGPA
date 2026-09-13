import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

const SERVICE_ROLE_KEY = env.SERVICE_ROLE_KEY;

type SubmittedAnswer = {
	question_id: number;
	selected_option_id: string | null;
};

/**
 * Scoring model: simple +1 correct / 0 skip / 0 wrong — no negative
 * marking. PROVISIONAL, not a doctrine-confirmed decision: UTME's
 * negative-marking scheme (skip beats guessing) is specific to JAMB's
 * real exam-day psychology and isn't something CGPA's docs ask for.
 * Kept as a single named constant so it's an easy, deliberate change
 * once a real CGPA scoring model is confirmed, not buried in the
 * scoring logic.
 */
function scoreAnswer(isSkipped: boolean, isCorrect: boolean): number {
	if (isSkipped) return 0;
	return isCorrect ? 1 : 0;
}

/**
 * The one write for a whole Quick Test session — same "one batched
 * write at session end" shape as grantapp-shell's submit-cluster-session,
 * not one call per question. No auth gate to START a session, but
 * persistence (student_question_progress) only happens when a real
 * session exists — a guest gets scored the same way, nothing just
 * silently fails for them.
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const { session, user } = await locals.safeGetSession();

		const body = (await request.json()) as {
			course_id: number;
			answers: SubmittedAnswer[];
		};

		const { course_id, answers } = body;

		if (!course_id || !Array.isArray(answers) || answers.length === 0) {
			return json({ message: 'Missing course_id or answers' }, { status: 400 });
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

		const questionIds = answers.map((a) => a.question_id);
		const { data: questions, error: questionsError } = await adminClient
			.from('keystone_questions')
			.select('id, correct_option_id')
			.in('id', questionIds);

		if (questionsError) throw questionsError;

		const byId = new Map((questions ?? []).map((q) => [q.id, q]));

		let correctCount = 0;
		let skippedCount = 0;
		let totalScore = 0;
		const progressRows: Record<string, unknown>[] = [];

		for (const answer of answers) {
			const question = byId.get(answer.question_id);
			if (!question) continue;

			const isSkipped = answer.selected_option_id == null;
			const isCorrect = !isSkipped && answer.selected_option_id === question.correct_option_id;
			const points = scoreAnswer(isSkipped, isCorrect);

			if (isSkipped) skippedCount += 1;
			if (isCorrect) correctCount += 1;
			totalScore += points;

			if (session && user) {
				progressRows.push({
					student_id: user.id,
					keystone_question_id: question.id,
					is_correct: isCorrect,
					is_skipped: isSkipped,
					points_awarded: points
				});
			}
		}

		if (progressRows.length > 0) {
			// One row per (student, question) — a re-answer overwrites via
			// the unique constraint from migration 0003, matching "progress
			// toward 10,000 distinct questions" rather than every attempt
			// ever made.
			const { error: upsertError } = await adminClient
				.from('student_question_progress')
				.upsert(progressRows, { onConflict: 'student_id,keystone_question_id' });

			if (upsertError) {
				console.error('quick-test progress upsert error:', upsertError);
				// Score the student's answers correctly regardless — a failed
				// progress write shouldn't also cost them their results screen.
			}
		}

		return json({
			course_id,
			answered_count: answers.length,
			correct_count: correctCount,
			skipped_count: skippedCount,
			total_score: totalScore,
			is_guest: !(session && user)
		});
	} catch (err) {
		console.error('submit-quick-test error:', err);
		return json({ message: 'Internal server error' }, { status: 500 });
	}
};
