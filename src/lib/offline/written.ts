import type { EssayQuestion, FillCell, FillQuestion, WrittenAnswer } from './types';

// Fill-in and essay questions: the pure parts. Answers are checked and shown on the phone only.
// They carry no score (the founder's instruction 2026-10-30: interfaces first, scoring later).

/** Key of the blank in row r, column c, as used in WrittenAnswer.fills. */
export function blankKey(r: number, c: number): string {
	return `r${r}c${c}`;
}

export function isBlank(cell: FillCell): cell is Extract<FillCell, { blank: string }> {
	return 'blank' in cell;
}

/** Lower case, one-space gaps, no accents on symbols (superscript + becomes +), no end punctuation. */
export function normaliseAnswer(text: string): string {
	return text
		.normalize('NFKC')
		.toLowerCase()
		.replace(/\s+/g, ' ')
		.trim()
		.replace(/[.,;:!?]+$/g, '')
		.trim();
}

function asNumber(text: string): number | null {
	const t = text.normalize('NFKC').replace(/[\s,]/g, '');
	if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(t)) return null;
	const n = Number(t);
	return Number.isFinite(n) ? n : null;
}

/** Does what the student typed match this blank? Empty never matches. */
export function checkBlank(cell: Extract<FillCell, { blank: string }>, given: string | undefined): boolean {
	const g = (given ?? '').trim();
	if (!g) return false;
	if (cell.numeric) {
		const want = asNumber(cell.blank);
		const got = asNumber(g);
		if (want !== null && got !== null) return Math.abs(got - want) <= (cell.tolerance ?? 0);
	}
	const accepted = [cell.blank, ...(cell.accept ?? [])].map(normaliseAnswer);
	return accepted.includes(normaliseAnswer(g));
}

export type BlankReview = { key: string; row: number; col: number; given: string; expected: string; ok: boolean };

export function reviewFill(q: FillQuestion, a: WrittenAnswer | undefined): BlankReview[] {
	const out: BlankReview[] = [];
	q.rows.forEach((row, r) =>
		row.forEach((cell, c) => {
			if (!isBlank(cell)) return;
			const key = blankKey(r, c);
			const given = (a?.fills?.[key] ?? '').trim();
			out.push({ key, row: r, col: c, given, expected: cell.blank, ok: checkBlank(cell, given) });
		})
	);
	return out;
}

export function countBlanks(q: FillQuestion): number {
	return q.rows.reduce((n, row) => n + row.filter(isBlank).length, 0);
}

export function wordCount(text: string): number {
	const t = text.trim();
	return t ? t.split(/\s+/).length : 0;
}

export function fillIsEmpty(q: FillQuestion, a: WrittenAnswer | undefined): boolean {
	return reviewFill(q, a).every((b) => b.given === '');
}

export function essayIsEmpty(a: WrittenAnswer | undefined): boolean {
	return (a?.text ?? '').trim() === '';
}

/** A few lines of plain text describing one fill-in or essay answer, for the shared file. */
export function describeWritten(q: FillQuestion | EssayQuestion, a: WrittenAnswer | undefined): string[] {
	if (q.type === 'fill') {
		const rows = reviewFill(q, a);
		return rows.map((b) => `   Blank ${b.row + 1}.${b.col + 1}: ${b.given || '(left empty)'}  -  expected: ${b.expected}  -  ${b.ok ? 'matches' : 'does not match'}`);
	}
	const text = (a?.text ?? '').trim();
	const lines = [`   Your answer (${wordCount(text)} words): ${text || '(left empty)'}`];
	lines.push('   Points a good answer covers:');
	for (const r of q.rubric) lines.push(`     - ${r.point} (${r.marks} ${r.marks === 1 ? 'mark' : 'marks'})`);
	lines.push(`   Model answer: ${q.model_answer}`);
	return lines;
}
