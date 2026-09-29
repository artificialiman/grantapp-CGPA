import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

const SERVICE_ROLE_KEY = env.SERVICE_ROLE_KEY;

/**
 * Companion fix to 402f267 ("Fix answer-key leak: quick-test-session
 * was sending correct_option_id + explanation to the client"). That
 * fix stripped the answer key from quick-test-session's GET response --
 * safe there because Quick Test never reveals per-question feedback.
 * mastery-set's GET has the exact same leak (found while auditing it
 * before merging, not reported), but ExamShell's practice mode
 * genuinely needs correct_option_id/explanation to reveal feedback
 * after each answer -- stripping them the same way would break that
 * feature, not just close the leak.
 *
 * This is the other way to close it: a per-question, read-only check,
 * called only after the student has already answered (never upfront
 * for a whole set). No persistence here at all -- submit-mastery-set's
 * batch write at set-end is still the only place an answer is
 * recorded; this endpoint exists purely so the client can show
 * correct/incorrect + explanation without the answer key ever being
 * sent before the fact.
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const { session, user } = await locals.safeGetSession();
		if (!session || !user) {
			return json({ message: 'Unauthorized' }, { status: 401 });
		}

		const body = (await request.json()) as {
			question_id?: number;
			selected_option_id?: string | null;
		};

		if (!body.question_id) {
			return json({ message: 'Missing question_id' }, { status: 400 });
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

		const { data: question, error } = await adminClient
			.from('keystone_questions')
			.select('correct_option_id, explanation')
			.eq('id', body.question_id)
			.single();

		if (error || !question) {
			return json({ message: 'Question not found' }, { status: 404 });
		}

		const isCorrect = body.selected_option_id != null && body.selected_option_id === question.correct_option_id;

		return json({
			is_correct: isCorrect,
			correct_option_id: question.correct_option_id,
			explanation: question.explanation
		});
	} catch (err) {
		console.error('check-mastery-answer error:', err);
		return json({ message: 'Internal server error' }, { status: 500 });
	}
};
