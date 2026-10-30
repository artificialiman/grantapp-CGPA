import type { Answer, Pack, PackQuestion } from './types';

/** Small deterministic generator, so a seeded test can be replayed exactly. */
export function mulberry32(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export type TestQuestion = PackQuestion & { course_key: string };

/**
 * Draw `count` distinct questions from the given packs, in a seeded random order.
 * Returns fewer than `count` when the packs hold fewer.
 */
export function buildTest(packs: Pack[], opts: { count: number; seed: number }): TestQuestion[] {
	const all: TestQuestion[] = [];
	for (const p of packs) for (const q of p.questions) all.push({ ...q, course_key: p.key });
	const rnd = mulberry32(opts.seed);
	for (let i = all.length - 1; i > 0; i--) {
		const j = Math.floor(rnd() * (i + 1));
		const t = all[i];
		all[i] = all[j];
		all[j] = t;
	}
	return all.slice(0, Math.max(0, opts.count));
}

export type QuestionResult = {
	question_id: string;
	selected_option_id: string | null;
	skipped: boolean;
	correct: boolean;
	correct_option_id: string;
	explanation: string;
	points: number;
};

export type TestResult = {
	results: QuestionResult[];
	answered_count: number;
	correct_count: number;
	skipped_count: number;
	total_score: number;
};

/**
 * Grade on the phone. `score` is the same function the server uses
 * (src/lib/quiz/scoring.ts), passed in so there is one scoring model.
 * An answer for an id that is not in `questions` is ignored.
 */
export function gradeAnswers(
	questions: PackQuestion[],
	answers: Answer[],
	score: (isSkipped: boolean, isCorrect: boolean) => number
): TestResult {
	const byId = new Map(questions.map((q) => [q.id, q]));
	const results: QuestionResult[] = [];
	let correct = 0;
	let skipped = 0;
	let total = 0;
	for (const a of answers) {
		const q = byId.get(a.question_id);
		if (!q) continue;
		const isSkipped = a.selected_option_id == null;
		const isCorrect = !isSkipped && a.selected_option_id === q.correct_option_id;
		const points = score(isSkipped, isCorrect);
		if (isSkipped) skipped += 1;
		if (isCorrect) correct += 1;
		total += points;
		results.push({
			question_id: q.id,
			selected_option_id: a.selected_option_id,
			skipped: isSkipped,
			correct: isCorrect,
			correct_option_id: q.correct_option_id,
			explanation: q.explanation,
			points
		});
	}
	return {
		results,
		answered_count: results.length,
		correct_count: correct,
		skipped_count: skipped,
		total_score: total
	};
}
