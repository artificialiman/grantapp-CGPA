import type { SupabaseClient } from '@supabase/supabase-js';

type CgpaClient = SupabaseClient<any, string, 'cgpa', any, any>;

/**
 * Adaptive selection over the dual-axis taxonomy, ported from
 * grantapp-shell's lib/quiz/select.ts -- doctrine Clause 1 ("inherits
 * UTME's 100-day-mastery flow shape... not built fresh"). The core
 * weighting algorithm (buildComboWeights, questionWeight,
 * weightedSample) is unchanged, not reinvented. Two real differences
 * from the source, both because the CGPA schema doesn't have the
 * concept: no negative_marking_value (keystone_questions has none),
 * and no premium/visibility merge (no free/premium split exists in
 * CGPA) -- the candidate query is simpler as a result, not simplified
 * carelessly.
 */

export type MasteryRow = {
	cognitive_pattern: string;
	information_type: string;
	mastery_score: number | null;
	attempts: number;
};

export type KeystoneQuestion = {
	id: number;
	course_id: number;
	cognitive_patterns: string[];
	information_types: string[];
	prompt: string;
	options: { id: string; text: string }[];
	difficulty: number | null;
};

const UNKNOWN_COMBO_WEIGHT = 0.65; // "never attempted" treated as moderately weak, not maximally weak
const NO_DATA_STRENGTH_WEIGHT = 0.1; // strength-direction counterpart -- unattempted is not a demonstrated strength
const MIN_WEIGHT = 0.05; // even a mastered combo keeps a small chance of resurfacing

function buildComboWeights(masteryRows: MasteryRow[]): Map<string, number> {
	const weights = new Map<string, number>();
	for (const row of masteryRows) {
		const key = comboKey(row.cognitive_pattern, row.information_type);
		const score = row.mastery_score ?? UNKNOWN_COMBO_WEIGHT;
		const weight = Math.max(MIN_WEIGHT, 1 - score);
		weights.set(key, weight);
	}
	return weights;
}

function buildStrengthComboWeights(masteryRows: MasteryRow[]): Map<string, number> {
	const weights = new Map<string, number>();
	for (const row of masteryRows) {
		const key = comboKey(row.cognitive_pattern, row.information_type);
		const score = row.mastery_score ?? NO_DATA_STRENGTH_WEIGHT;
		const weight = Math.max(MIN_WEIGHT, score);
		weights.set(key, weight);
	}
	return weights;
}

function comboKey(cognitivePattern: string, informationType: string): string {
	return `${cognitivePattern}::${informationType}`;
}

function questionWeight(
	q: KeystoneQuestion,
	comboWeights: Map<string, number>,
	unmappedWeight: number = UNKNOWN_COMBO_WEIGHT
): number {
	let max = MIN_WEIGHT;
	for (const cp of q.cognitive_patterns) {
		for (const it of q.information_types) {
			const w = comboWeights.get(comboKey(cp, it));
			if (w !== undefined && w > max) max = w;
			if (w === undefined && unmappedWeight > max) max = unmappedWeight;
		}
	}
	return max;
}

function weightedSample<T>(items: T[], weights: number[], count: number): T[] {
	const pool = items.map((item, i) => ({ item, weight: weights[i] }));
	const picked: T[] = [];

	while (picked.length < count && pool.length > 0) {
		const total = pool.reduce((sum, p) => sum + p.weight, 0);
		let r = Math.random() * total;
		let idx = 0;
		for (; idx < pool.length; idx++) {
			r -= pool[idx].weight;
			if (r <= 0) break;
		}
		const chosen = pool.splice(Math.min(idx, pool.length - 1), 1)[0];
		picked.push(chosen.item);
	}

	return picked;
}

const QUESTION_COLUMNS =
	'id, course_id, cognitive_patterns, information_types, prompt, options, difficulty';
// Deliberately no correct_option_id/explanation here -- the weighting
// logic in this file never uses them (only cognitive_patterns/
// information_types feed questionWeight), and this same query result
// is what mastery-set/+server.ts sends straight to the client. See
// 402f267 ("Fix answer-key leak: quick-test-session was sending
// correct_option_id + explanation to the client") -- same leak would
// exist here otherwise, just not yet caught by that fix since it only
// touched quick-test-session.

/**
 * Weakness-favored draw: low-mastery combos sampled more heavily.
 * Used for Set 1 (no mastery data yet, falls back to
 * UNKNOWN_COMBO_WEIGHT for everything) and Gate 2's Sets 4+5.
 */
export async function selectAdaptiveQuestions(
	supabase: CgpaClient,
	studentId: string,
	courseId: number,
	count: number,
	excludeQuestionIds: number[] = []
): Promise<KeystoneQuestion[]> {
	const { data: masteryRows, error: masteryError } = await supabase
		.from('mastery_state')
		.select('cognitive_pattern, information_type, mastery_score, attempts')
		.eq('student_id', studentId)
		.eq('course_id', courseId);

	if (masteryError) throw masteryError;

	let query = supabase
		.from('keystone_questions')
		.select(QUESTION_COLUMNS)
		.eq('course_id', courseId)
		.eq('approval_status', 'approved');

	if (excludeQuestionIds.length > 0) {
		query = query.not('id', 'in', `(${excludeQuestionIds.join(',')})`);
	}

	const { data: candidates, error: questionsError } = await query;
	if (questionsError) throw questionsError;
	if (!candidates || candidates.length === 0) return [];

	const comboWeights = buildComboWeights((masteryRows ?? []) as MasteryRow[]);
	const weights = (candidates as KeystoneQuestion[]).map((q) => questionWeight(q, comboWeights));

	return weightedSample(candidates as KeystoneQuestion[], weights, Math.min(count, candidates.length));
}

/**
 * Strength-targeted draw for Gate 1 -> Sets 2+3: HIGH-mastery combos
 * sampled MORE heavily, to reinforce what the student already does
 * well. Gate 2 (weakness) reuses selectAdaptiveQuestions above
 * unchanged -- its existing low-mastery weighting already IS
 * "weakness-targeted".
 */
export async function selectStrengthQuestions(
	supabase: CgpaClient,
	studentId: string,
	courseId: number,
	count: number,
	excludeQuestionIds: number[] = []
): Promise<KeystoneQuestion[]> {
	const { data: masteryRows, error: masteryError } = await supabase
		.from('mastery_state')
		.select('cognitive_pattern, information_type, mastery_score, attempts')
		.eq('student_id', studentId)
		.eq('course_id', courseId);

	if (masteryError) throw masteryError;

	let query = supabase
		.from('keystone_questions')
		.select(QUESTION_COLUMNS)
		.eq('course_id', courseId)
		.eq('approval_status', 'approved');

	if (excludeQuestionIds.length > 0) {
		query = query.not('id', 'in', `(${excludeQuestionIds.join(',')})`);
	}

	const { data: candidates, error: questionsError } = await query;
	if (questionsError) throw questionsError;
	if (!candidates || candidates.length === 0) return [];

	const strengthWeights = buildStrengthComboWeights((masteryRows ?? []) as MasteryRow[]);
	const weights = (candidates as KeystoneQuestion[]).map((q) =>
		questionWeight(q, strengthWeights, NO_DATA_STRENGTH_WEIGHT)
	);

	return weightedSample(candidates as KeystoneQuestion[], weights, Math.min(count, candidates.length));
}
