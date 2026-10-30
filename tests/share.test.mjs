// Run with: node --test tests/
// Tests the score analytics and the WhatsApp share file (pure parts; no browser needed).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyse, bandFor, pct } from '../src/lib/offline/analytics.ts';
import { gradeAnswers } from '../src/lib/offline/session.ts';
import {
	buildReport, buildSummary, courseLabelFor, formatDuration, deliverReport, fileSafe, reportFileName, cleanField
} from '../src/lib/offline/share.ts';

const score = (skipped, correct) => (skipped ? 0 : correct ? 1 : 0);
const q = (id, correct, difficulty, cp, it) => ({
	id, prompt: `Prompt ${id}?`, correct_option_id: correct, explanation: `Because ${id}.`,
	options: [{ id: 'a', text: 'Alpha' }, { id: 'b', text: 'Beta' }, { id: 'c', text: 'Gamma' }, { id: 'd', text: 'Delta' }],
	cognitive_patterns: cp, information_types: it, difficulty
});
const questions = [
	q('q1', 'a', 1, ['Logical'], ['Essential / definitive']),
	q('q2', 'b', 3, ['Logical'], ['Procedural / supply chain']),
	q('q3', 'c', 5, ['Pragmatic'], ['Essential / definitive']),
	q('q4', 'd', 4, ['Pragmatic'], ['Mathematical Proofs'])
];
// q1 right, q2 wrong, q3 skipped, q4 right
const answers = [
	{ question_id: 'q1', selected_option_id: 'a' },
	{ question_id: 'q2', selected_option_id: 'c' },
	{ question_id: 'q3', selected_option_id: null },
	{ question_id: 'q4', selected_option_id: 'd' }
];
const result = gradeAnswers(questions, answers, score);

test('analytics: totals add up and the percent counts skipped as not correct', () => {
	const a = analyse(questions, result, 125);
	assert.equal(a.total, 4);
	assert.equal(a.correct, 2);
	assert.equal(a.wrong, 1);
	assert.equal(a.skipped, 1);
	assert.equal(a.correct + a.wrong + a.skipped, a.total);
	assert.equal(a.percent, 50);
	assert.equal(a.band, 'Fair');
	assert.equal(a.seconds, 125);
});

test('analytics: difficulty buckets are ordered easy to hard and hold the right counts', () => {
	const a = analyse(questions, result);
	assert.deepEqual(a.byDifficulty.map((b) => b.label), ['Easy (1-2)', 'Medium (3)', 'Hard (4-5)']);
	const hard = a.byDifficulty[2];
	assert.equal(hard.total, 2);
	assert.equal(hard.correct, 1);
	assert.equal(hard.skipped, 1);
	assert.equal(hard.percent, 50);
});

test('analytics: topics list weakest first, and focus never includes a perfect topic', () => {
	const a = analyse(questions, result);
	// Logical: q1 right, q2 wrong (50%). Pragmatic: q3 skipped, q4 right (50%). Both tie, so the larger sample or name decides.
	assert.deepEqual(a.byPattern.map((b) => b.percent), [50, 50]);
	assert.ok(a.byPattern[0].percent <= a.byPattern[a.byPattern.length - 1].percent);
	assert.ok(a.focus.length > 0 && a.focus.length <= 3);
	assert.ok(a.focus.every((f) => f.percent < 100));
	const perfect = analyse([questions[0]], gradeAnswers([questions[0]], [answers[0]], score));
	assert.deepEqual(perfect.focus, []);
	assert.equal(perfect.band, 'Strong');
});

test('analytics: helpers behave at the edges', () => {
	assert.equal(pct(0, 0), 0);
	assert.equal(pct(1, 3), 33);
	assert.equal(bandFor(70), 'Strong');
	assert.equal(bandFor(69), 'Fair');
	assert.equal(bandFor(49), 'Needs work');
	assert.equal(formatDuration(null), 'not recorded');
	assert.equal(formatDuration(125), '2 min 5 s');
	assert.equal(formatDuration(9), '9 s');
	assert.equal(analyse(questions, result, -5).seconds, null);
});

test('file name: carries name, department, course and date, and is safe on any phone', () => {
	const d = new Date(2026, 9, 30);
	assert.equal(
		reportFileName({ name: 'Ada Obi', department: 'Human Medicine', course: 'PCO320', date: d }),
		'Ada-Obi_Human-Medicine_PCO320_2026-10-30_score-feedback.txt'
	);
	assert.equal(fileSafe('  Chukwuemeka/O\'Neil: <b>  '), 'Chukwuemeka-O-Neil-b');
	assert.equal(fileSafe('Ọlá Adé'), 'Ola-Ade');
	assert.equal(reportFileName({ name: '', department: '', course: '', date: d }), '2026-10-30_score-feedback.txt');
	assert.ok(fileSafe('x'.repeat(200)).length <= 40);
	assert.equal(cleanField('  Ada \n  Obi  '), 'Ada Obi');
	assert.equal(courseLabelFor('medicine/pco320'), 'PCO320');
	assert.equal(courseLabelFor('law/nigerian-legal-system'), 'nigerian legal system');
});

test('report: holds score, analytics and every question with answer and reason', () => {
	const analytics = analyse(questions, result, 60);
	const text = buildReport({
		studentName: 'Ada Obi', department: 'Human Medicine', courseLabel: 'PCO320',
		finishedAt: new Date(2026, 9, 30), analytics, questions, result
	});
	assert.match(text, /Student:\s+Ada Obi/);
	assert.match(text, /Department: Human Medicine/);
	assert.match(text, /2 of 4 correct \(50%\)/);
	assert.match(text, /Result: Fair/);
	for (const id of ['q1', 'q2', 'q3', 'q4']) assert.match(text, new RegExp(`Prompt ${id}\\?`));
	assert.match(text, /Why: Because q2\./);
	// A wrong answer shows what was chosen and the correct one; a skip says so.
	assert.match(text, /Your answer: Gamma\n\s+Correct answer: Beta/);
	assert.match(text, /Result: Skipped\n\s+Your answer: Skipped/);
	// A correct answer does not repeat itself.
	const q1 = text.split('2. Prompt')[0].split('1. Prompt q1?')[1];
	assert.doesNotMatch(q1, /Correct answer:/);
	const summary = buildSummary({ studentName: 'Ada Obi', department: 'Human Medicine', courseLabel: 'PCO320', analytics });
	assert.match(summary, /^Ada Obi - Human Medicine\nPCO320: 2 of 4 correct \(50%\), Fair/);
	assert.match(summary, /Revise first: /);
});

const file = { name: 'a.txt', text: 'body', summary: 'sum' };
const deps = (over = {}) => ({
	canShareFiles: () => true,
	shareFile: async () => {},
	download: () => {},
	copy: async () => {},
	...over
});

test('delivery: shares through the phone when it can', async () => {
	assert.deepEqual(await deliverReport(deps(), file), { kind: 'shared' });
});

test('delivery: closing the share sheet is a cancel, not an error, and nothing else runs', async () => {
	let downloaded = false;
	const out = await deliverReport(deps({
		shareFile: async () => { const e = new Error('closed'); e.name = 'AbortError'; throw e; },
		download: () => { downloaded = true; }
	}), file);
	assert.deepEqual(out, { kind: 'cancelled' });
	assert.equal(downloaded, false);
});

test('delivery: a phone that cannot share files gets the file saved and the summary copied', async () => {
	const out = await deliverReport(deps({ canShareFiles: () => false }), file);
	assert.equal(out.kind, 'saved');
	assert.equal(out.downloaded, true);
	assert.equal(out.copied, true);
});

test('delivery: a failed share falls back and says why', async () => {
	const out = await deliverReport(deps({ shareFile: async () => { throw new Error('boom'); } }), file);
	assert.equal(out.kind, 'saved');
	assert.match(out.reason, /boom/);
});

test('delivery: when saving fails but copying works, the student is told which one worked', async () => {
	const out = await deliverReport(deps({ canShareFiles: () => false, download: () => { throw new Error('blocked'); } }), file);
	assert.deepEqual([out.kind, out.downloaded, out.copied], ['saved', false, true]);
});

test('delivery: when nothing works the outcome is a visible failure, never silence', async () => {
	const out = await deliverReport(deps({
		canShareFiles: () => { throw new Error('no api'); },
		download: () => { throw new Error('x'); },
		copy: async () => { throw new Error('y'); }
	}), file);
	assert.equal(out.kind, 'failed');
	assert.match(out.message, /could not be saved/);
});
