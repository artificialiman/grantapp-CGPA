import type { SixOptionQuestion } from './types';

// The six-option multiple choice. One right answer and five wrong ones, each wrong in its own way,
// so a wrong choice tells the student what kind of mistake they made.

export const DISTRACTOR_KINDS = ['figurative', 'grammatical', 'situational', 'units', 'opposite'] as const;
export type DistractorKind = (typeof DISTRACTOR_KINDS)[number];

export const DISTRACTOR_LABELS: Record<DistractorKind, { name: string; meaning: string }> = {
	figurative: { name: 'Close in meaning', meaning: 'Nearly right as an idea or figure of speech, but not literally correct.' },
	grammatical: { name: 'Close in form', meaning: 'Nearly right in wording or grammar, but wrong in what it states.' },
	situational: { name: 'Right elsewhere', meaning: 'True in another situation, or true the other way round.' },
	units: { name: 'Right value, other units', meaning: 'The correct quantity written in different units.' },
	opposite: { name: 'Opposite', meaning: 'On the opposite side of the topic.' }
};

export const OPTION_IDS = ['a', 'b', 'c', 'd', 'e', 'f'] as const;

/** The correct option may be the longest, but not by so much that length gives the answer away. */
export const LENGTH_RATIO_LIMIT = 1.5;

/** Problems with a six-option question's shape. Empty when it is sound. Mirrors scripts/check-content.py. */
export function sixOptionProblems(q: SixOptionQuestion): string[] {
	const out: string[] = [];
	const ids = q.options.map((o) => o.id);
	if (q.options.length !== 6 || OPTION_IDS.some((id, i) => ids[i] !== id)) {
		out.push('needs exactly six options with ids a to f');
		return out;
	}
	if (!ids.includes(q.correct_option_id)) out.push('correct_option_id does not match an option');
	const wrong = ids.filter((id) => id !== q.correct_option_id);
	const kinds = q.distractor_kinds ?? {};
	if (kinds[q.correct_option_id] !== undefined) out.push('the correct option must not be given a kind');
	const seen: string[] = [];
	for (const id of wrong) {
		const k = kinds[id];
		if (!k) out.push(`wrong option ${id} has no kind`);
		else if (!(DISTRACTOR_KINDS as readonly string[]).includes(k)) out.push(`option ${id}: unknown kind '${k}'`);
		else seen.push(k);
	}
	for (const k of DISTRACTOR_KINDS) if (!seen.includes(k)) out.push(`no wrong option is of kind '${k}'`);
	if (new Set(seen).size !== seen.length) out.push('each kind must be used once');
	const len = (id: string) => q.options.find((o) => o.id === id)?.text.length ?? 0;
	const longestWrong = Math.max(...wrong.map(len));
	if (len(q.correct_option_id) > longestWrong && len(q.correct_option_id) > LENGTH_RATIO_LIMIT * longestWrong) {
		out.push('the correct option is obviously longer than the others');
	}
	return out;
}
