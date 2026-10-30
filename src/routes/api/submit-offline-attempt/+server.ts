import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { scoreAnswer } from '$lib/quiz/scoring';
import { updateMasteryForAnswer } from '$lib/quiz/mastery';
import type { RequestHandler } from './$types';

const SERVICE_ROLE_KEY = env.SERVICE_ROLE_KEY;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KEY = /^[a-z0-9-]+\/[a-z0-9-]+$/;
const MAX_ANSWERS = 200;

type Body = {
	attempt_id: string;
	course_key: string;
	started_at?: string;
	finished_at?: string;
	answers: { question_id: string; selected_option_id: string | null }[];
};

const asTime = (v: unknown): string | null => {
	if (typeof v !== 'string') return null;
	const t = Date.parse(v);
	return Number.isNaN(t) ? null : new Date(t).toISOString();
};

/**
 * A test that was sat on a phone, sent when the phone was next online and signed in.
 *
 *  - The phone names questions by depot id (course_key + "q003"); this looks them up through
 *    keystone_questions.depot_key / depot_qid (migration 0021).
 *  - The server grades again from its own answer keys. The phone's score is never trusted.
 *  - attempt_id is made on the phone. A second send of the same id changes nothing and
 *    returns the same 200, so a dropped connection can be retried safely.
 *  - Not signed in: 401. The phone keeps the attempt and sends it after sign-in.
 *  - A question the database does not hold yet is counted in unmatched_count, not dropped silently
 *    and not allowed to fail the attempt.
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const { session, user } = await locals.safeGetSession();
		if (!session || !user) return json({ message: 'Sign in to save this result' }, { status: 401 });

		const body = (await request.json()) as Body;
		if (
			!body ||
			typeof body.attempt_id !== 'string' ||
			!UUID.test(body.attempt_id) ||
			typeof body.course_key !== 'string' ||
			!KEY.test(body.course_key) ||
			!Array.isArray(body.answers) ||
			body.answers.length === 0 ||
			body.answers.length > MAX_ANSWERS
		) {
			return json({ message: 'Malformed attempt' }, { status: 400 });
		}
		for (const a of body.answers) {
			if (
				!a ||
				typeof a.question_id !== 'string' ||
				a.question_id.length > 16 ||
				(a.selected_option_id != null && typeof a.selected_option_id !== 'string')
			) {
				return json({ message: 'Malformed answer' }, { status: 400 });
			}
		}

		if (!SERVICE_ROLE_KEY || !env.VITE_SUPABASE_URL) {
			console.error('submit-offline-attempt: server configuration missing');
			return json({ message: 'Server configuration error' }, { status: 500 });
		}
		const { createClient } = await import('@supabase/supabase-js');
		const admin = createClient(env.VITE_SUPABASE_URL, SERVICE_ROLE_KEY, { db: { schema: 'cgpa' } });

		// Same guard as submit-quick-test: progress rows need a students row.
		const { error: ensureError } = await admin
			.from('students')
			.upsert(
				{ id: user.id, full_name: user.email?.split('@')[0] ?? 'Student' },
				{ onConflict: 'id', ignoreDuplicates: true }
			);
		if (ensureError) console.error('submit-offline-attempt ensure-student error:', ensureError);

		const { data: rows, error: lookupError } = await admin
			.from('keystone_questions')
			.select('id, course_id, depot_qid, correct_option_id, cognitive_patterns, information_types')
			.eq('depot_key', body.course_key)
			.eq('approval_status', 'approved')
			.in('depot_qid', body.answers.map((a) => a.question_id));
		if (lookupError) throw lookupError;

		const byQid = new Map((rows ?? []).map((r) => [r.depot_qid as string, r]));
		let correct = 0;
		let skipped = 0;
		let score = 0;
		let unmatched = 0;
		const progress: Record<string, unknown>[] = [];
		const graded: { row: NonNullable<typeof rows>[number]; isCorrect: boolean; isSkipped: boolean }[] = [];

		for (const a of body.answers) {
			const row = byQid.get(a.question_id);
			if (!row) {
				unmatched += 1;
				continue;
			}
			const isSkipped = a.selected_option_id == null;
			const isCorrect = !isSkipped && a.selected_option_id === row.correct_option_id;
			const points = scoreAnswer(isSkipped, isCorrect);
			if (isSkipped) skipped += 1;
			if (isCorrect) correct += 1;
			score += points;
			graded.push({ row, isCorrect, isSkipped });
			progress.push({
				student_id: user.id,
				keystone_question_id: row.id,
				is_correct: isCorrect,
				is_skipped: isSkipped,
				points_awarded: points
			});
		}

		// The idempotency gate: the first insert wins, a repeat of the same attempt_id stops here.
		const { error: insertError } = await admin.from('offline_attempts').insert({
			attempt_id: body.attempt_id,
			student_id: user.id,
			course_key: body.course_key,
			started_at: asTime(body.started_at),
			finished_at: asTime(body.finished_at),
			answered_count: graded.length,
			correct_count: correct,
			skipped_count: skipped,
			unmatched_count: unmatched,
			total_score: score
		});
		if (insertError) {
			if (insertError.code === '23505') {
				return json({ duplicate: true, attempt_id: body.attempt_id });
			}
			throw insertError;
		}

		if (progress.length > 0) {
			const { error: upsertError } = await admin
				.from('student_question_progress')
				.upsert(progress, { onConflict: 'student_id,keystone_question_id' });
			if (upsertError) console.error('submit-offline-attempt progress error:', upsertError);
		}
		for (const g of graded) {
			if (g.isSkipped) continue;
			try {
				await updateMasteryForAnswer(
					admin,
					user.id,
					Number(g.row.course_id),
					g.row.cognitive_patterns ?? [],
					g.row.information_types ?? [],
					g.isCorrect
				);
			} catch (e) {
				console.error('submit-offline-attempt mastery error:', e);
			}
		}

		return json({
			attempt_id: body.attempt_id,
			answered_count: graded.length,
			correct_count: correct,
			skipped_count: skipped,
			unmatched_count: unmatched,
			total_score: score
		});
	} catch (err) {
		console.error('submit-offline-attempt error:', err);
		return json({ message: 'Internal server error' }, { status: 500 });
	}
};
