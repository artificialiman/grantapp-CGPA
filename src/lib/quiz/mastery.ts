import type { SupabaseClient } from '@supabase/supabase-js';

type CgpaClient = SupabaseClient<any, string, 'cgpa', any, any>;

/**
 * Ported from grantapp-shell's lib/quiz/mastery.ts -- doctrine Clause
 * 1 ("inherits UTME's 100-day-mastery flow shape... not built
 * fresh"). course_id replaces subject; the EMA formula and logic are
 * otherwise byte-for-byte the same, not reinvented. Not a from-scratch
 * reinvention: the UTME version is proven, tested infrastructure, and
 * CGPA's own mastery_state table was explicitly built to the same
 * per-combo EMA shape (confirmed by its own unique constraint:
 * (student_id, course_id, cognitive_pattern, information_type)).
 *
 * Updates mastery_state for every (cognitive_pattern x information_type)
 * combo a question touches, after a student answers it. Uses an
 * exponential moving average so recent performance outweighs old —
 * a student who was weak on a combo weeks ago but has since improved
 * should show as improved, not permanently dragged down by early misses.
 *
 * This exact file was independently built twice -- once here (to power
 * ExamShell/the Mastery flow) and once on main (e2bb565, "Fix real gap
 * in track-progress loop: Quick Test never updated mastery_state" --
 * submit-quick-test wrote to student_question_progress but never to
 * mastery_state, so every Quick Test attempt was invisible to
 * /analytics, which reads exclusively from mastery_state). Both
 * versions were functionally identical; merged into this one file
 * rather than kept as two, per Arty's actual job.
 */

const EMA_ALPHA = 0.25; // weight given to the newest answer; higher = mastery reacts faster to recent performance

export async function updateMasteryForAnswer(
	supabase: CgpaClient,
	studentId: string,
	courseId: number,
	cognitivePatterns: string[],
	informationTypes: string[],
	isCorrect: boolean
): Promise<void> {
	const combos: { cognitive_pattern: string; information_type: string }[] = [];
	for (const cp of cognitivePatterns) {
		for (const it of informationTypes) {
			combos.push({ cognitive_pattern: cp, information_type: it });
		}
	}

	for (const combo of combos) {
		const { data: existing, error: readError } = await supabase
			.from('mastery_state')
			.select('id, attempts, correct, mastery_score')
			.eq('student_id', studentId)
			.eq('course_id', courseId)
			.eq('cognitive_pattern', combo.cognitive_pattern)
			.eq('information_type', combo.information_type)
			.maybeSingle();

		if (readError) throw readError;

		const outcome = isCorrect ? 1 : 0;
		const attempts = (existing?.attempts ?? 0) + 1;
		const correct = (existing?.correct ?? 0) + outcome;

		// First attempt on this combo: seed mastery_score directly from the
		// outcome rather than blending against a null EMA.
		const newScore =
			existing?.mastery_score == null
				? outcome
				: EMA_ALPHA * outcome + (1 - EMA_ALPHA) * existing.mastery_score;

		const { error: upsertError } = await supabase.from('mastery_state').upsert(
			{
				student_id: studentId,
				course_id: courseId,
				cognitive_pattern: combo.cognitive_pattern,
				information_type: combo.information_type,
				attempts,
				correct,
				mastery_score: newScore,
				last_attempted_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			},
			{ onConflict: 'student_id,course_id,cognitive_pattern,information_type' }
		);

		if (upsertError) throw upsertError;
	}
}
