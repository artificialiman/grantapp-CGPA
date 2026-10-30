import type { PackQuestion } from './types';
import type { TestResult } from './session';

// Analytics for one finished test. Everything here is computed from the questions and the graded
// result already on the phone, so it needs no network and no database.
// Scoring follows src/lib/quiz/scoring.ts: a correct answer earns one point, a wrong or skipped answer none.

export type Bucket = {
	label: string;
	total: number;
	correct: number;
	skipped: number;
	percent: number; // correct / total, whole number
};

export type Band = 'Strong' | 'Fair' | 'Needs work';

export type Analytics = {
	total: number;
	correct: number;
	wrong: number;
	skipped: number;
	percent: number;
	band: Band;
	byDifficulty: Bucket[];
	byPattern: Bucket[];
	byType: Bucket[];
	focus: Bucket[]; // up to three weakest topics, weakest first; empty when nothing was missed
	seconds: number | null;
};

export function pct(correct: number, total: number): number {
	return total > 0 ? Math.round((correct / total) * 100) : 0;
}

export function bandFor(percent: number): Band {
	if (percent >= 70) return 'Strong';
	if (percent >= 50) return 'Fair';
	return 'Needs work';
}

export function difficultyLabel(d: number): string {
	if (d <= 2) return 'Easy (1-2)';
	if (d === 3) return 'Medium (3)';
	return 'Hard (4-5)';
}

type Tally = { total: number; correct: number; skipped: number };

function bucketsFrom(map: Map<string, Tally>, order?: string[]): Bucket[] {
	const out: Bucket[] = [];
	for (const [label, t] of map) out.push({ label, ...t, percent: pct(t.correct, t.total) });
	if (order) return out.sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label));
	// Weakest first; the larger sample first among equals; then by name so the order is stable.
	return out.sort((a, b) => a.percent - b.percent || b.total - a.total || (a.label < b.label ? -1 : 1));
}

function bump(map: Map<string, Tally>, label: string, correct: boolean, skipped: boolean) {
	const t = map.get(label) ?? { total: 0, correct: 0, skipped: 0 };
	t.total += 1;
	if (correct) t.correct += 1;
	if (skipped) t.skipped += 1;
	map.set(label, t);
}

export function analyse(
	questions: PackQuestion[],
	result: TestResult,
	seconds: number | null = null
): Analytics {
	const byId = new Map(questions.map((q) => [q.id, q]));
	const diff = new Map<string, Tally>();
	const pattern = new Map<string, Tally>();
	const type = new Map<string, Tally>();
	for (const r of result.results) {
		const q = byId.get(r.question_id);
		if (!q) continue;
		bump(diff, difficultyLabel(q.difficulty), r.correct, r.skipped);
		for (const p of q.cognitive_patterns) bump(pattern, p, r.correct, r.skipped);
		for (const t of q.information_types) bump(type, t, r.correct, r.skipped);
	}
	const total = result.answered_count;
	const correct = result.correct_count;
	const skipped = result.skipped_count;
	const percent = pct(correct, total);
	const byPattern = bucketsFrom(pattern);
	const byType = bucketsFrom(type);
	const focus = [...byPattern, ...byType]
		.filter((b) => b.percent < 100)
		.sort((a, b) => a.percent - b.percent || b.total - a.total || (a.label < b.label ? -1 : 1))
		.slice(0, 3);
	return {
		total,
		correct,
		wrong: total - correct - skipped,
		skipped,
		percent,
		band: bandFor(percent),
		byDifficulty: bucketsFrom(diff, ['Easy (1-2)', 'Medium (3)', 'Hard (4-5)']),
		byPattern,
		byType,
		focus,
		seconds: seconds != null && Number.isFinite(seconds) && seconds >= 0 ? Math.round(seconds) : null
	};
}
