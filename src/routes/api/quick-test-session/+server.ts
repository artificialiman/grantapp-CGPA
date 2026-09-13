import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

const SERVICE_ROLE_KEY = env.SERVICE_ROLE_KEY;

/**
 * Quick Test (cgpa-state-of-play.md step 5) — a flat, single-pass,
 * non-adaptive draw from one course's approved keystone_questions.
 * Mirrors grantapp-shell's selectFlatQuestions/cluster-session shape
 * (same "no stage gates, no adaptive logic" reasoning applies —
 * that's what 100-day Mastery is for, not this) but scoped to a
 * single course_id rather than a whole cluster.
 *
 * No auth gate — build-doctrine invariant, same as every route on
 * this branch.
 */
export const GET: RequestHandler = async ({ url }) => {
	try {
		const courseId = url.searchParams.get('course_id');
		if (!courseId) {
			return json({ message: 'Missing course_id' }, { status: 400 });
		}

		const countParam = url.searchParams.get('count');
		const requestedCount = countParam ? parseInt(countParam, 10) : 20;

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

		const { data: candidates, error: questionsError } = await adminClient
			.from('keystone_questions')
			.select('id, course_id, cognitive_patterns, information_types, prompt, options, correct_option_id, explanation, difficulty')
			.eq('course_id', courseId)
			.eq('approval_status', 'approved');

		if (questionsError) throw questionsError;

		if (!candidates || candidates.length === 0) {
			return json({ message: 'No questions available for this course yet' }, { status: 404 });
		}

		// Fisher-Yates, same as grantapp-shell's selectFlatQuestions —
		// flat/non-adaptive is the whole point of Quick Test, kept
		// legible in one place rather than an ORDER BY random() a future
		// edit could miss.
		const pool = [...candidates];
		for (let i = pool.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[pool[i], pool[j]] = [pool[j], pool[i]];
		}

		const questions = pool.slice(0, Math.min(requestedCount, pool.length));

		return json({ course_id: courseId, questions });
	} catch (err) {
		console.error('quick-test-session error:', err);
		return json({ message: 'Internal server error' }, { status: 500 });
	}
};
