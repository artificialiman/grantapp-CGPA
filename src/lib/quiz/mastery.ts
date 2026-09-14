import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Updates cgpa.mastery_state for every (cognitive_pattern x
 * information_type) combo a keystone question touches, after a
 * student answers it. Mirrors grantapp-shell's own
 * updateMasteryForAnswer (src/lib/quiz/mastery.ts) exactly — same EMA
 * formula, same first-attempt seeding behavior — keyed by course_id
 * instead of subject, matching this schema's own shape
 * (mastery_state.course_id, not .subject). Not a from-scratch
 * reinvention: the UTME version is proven, tested infrastructure, and
 * CGPA's own mastery_state table was explicitly built to the same
 * per-combo EMA shape (confirmed by its own unique constraint:
 * (student_id, course_id, cognitive_pattern, information_type)).
 *
 * Built because submit-quick-test wrote to student_question_progress
 * but never to mastery_state — meaning every Quick Test a student
 * took was invisible to their own /analytics screen, which reads
 * exclusively from mastery_state. A real, silent break in the
 * "track progress" half of the core loop.
 */

const EMA_ALPHA = 0.25; // same weight as grantapp-shell's — no reason for CGPA's mastery to react differently to recent performance

export async function updateMasteryForAnswer(
	supabase: SupabaseClient<any, string, 'cgpa', any, any>,
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
