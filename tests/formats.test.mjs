// Run with: node --test tests/
// The pure parts of the fill-in, essay and six-option formats (built, not yet in the live test).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	blankKey, checkBlank, normaliseAnswer, reviewFill, countBlanks, wordCount, fillIsEmpty, essayIsEmpty, describeWritten
} from '../src/lib/offline/written.ts';
import { sixOptionProblems, DISTRACTOR_KINDS } from '../src/lib/offline/formats.ts';

test('answers match ignoring case, spacing, end punctuation and symbol styles', () => {
	assert.equal(normaliseAnswer('  Sodium  Chloride. '), 'sodium chloride');
	assert.equal(normaliseAnswer('Na⁺'), 'na+');
	assert.equal(normaliseAnswer('H₂O'), 'h2o');
	const cell = { blank: 'Na+', accept: ['sodium ion'] };
	assert.equal(checkBlank(cell, 'na⁺'), true);
	assert.equal(checkBlank(cell, 'Sodium  Ion.'), true);
	assert.equal(checkBlank(cell, 'k+'), false);
});

test('an empty or missing entry never matches', () => {
	assert.equal(checkBlank({ blank: 'x' }, ''), false);
	assert.equal(checkBlank({ blank: 'x' }, '   '), false);
	assert.equal(checkBlank({ blank: 'x' }, undefined), false);
});

test('numeric blanks compare values, with a tolerance, and survive commas and spaces', () => {
	const cell = { blank: '1200', numeric: true, tolerance: 5 };
	assert.equal(checkBlank(cell, '1,200'), true);
	assert.equal(checkBlank(cell, '1 203'), true);
	assert.equal(checkBlank(cell, '1210'), false);
	assert.equal(checkBlank({ blank: '0.5', numeric: true }, '.50'), true);
	// Not a number: falls back to text matching rather than failing.
	assert.equal(checkBlank({ blank: '40', numeric: true }, 'forty'), false);
	assert.equal(checkBlank({ blank: '40', numeric: true, accept: ['forty'] }, 'Forty'), true);
});

const table = {
	id: 't', type: 'fill', prompt: 'p', explanation: 'e', difficulty: 3, cognitive_patterns: [], information_types: [],
	columns: ['Property', 'Value'],
	rows: [
		[{ text: 'One' }, { blank: 'alpha' }],
		[{ text: 'Two' }, { blank: '12', numeric: true }]
	]
};

test('review lists every blank with what was typed and what was expected', () => {
	const r = reviewFill(table, { fills: { [blankKey(0, 1)]: 'Alpha', [blankKey(1, 1)]: '13' } });
	assert.equal(countBlanks(table), 2);
	assert.deepEqual(r.map((b) => [b.key, b.given, b.expected, b.ok]), [
		['r0c1', 'Alpha', 'alpha', true],
		['r1c1', '13', '12', false]
	]);
});

test('empty detection for fill-in and essay', () => {
	assert.equal(fillIsEmpty(table, undefined), true);
	assert.equal(fillIsEmpty(table, { fills: { r0c1: ' ' } }), true);
	assert.equal(fillIsEmpty(table, { fills: { r0c1: 'x' } }), false);
	assert.equal(essayIsEmpty(undefined), true);
	assert.equal(essayIsEmpty({ text: '  \n ' }), true);
	assert.equal(essayIsEmpty({ text: 'word' }), false);
	assert.equal(wordCount(' one  two\nthree '), 3);
	assert.equal(wordCount(''), 0);
});

test('the shared-file text covers fill-in and essay answers', () => {
	const lines = describeWritten(table, { fills: { r0c1: 'alpha' } });
	assert.match(lines[0], /Blank 1\.2: alpha .*matches/);
	assert.match(lines[1], /\(left empty\).*expected: 12.*does not match/);
	const essay = {
		id: 'e', type: 'essay', prompt: 'p', explanation: 'e', difficulty: 3, cognitive_patterns: [], information_types: [],
		marks: 3, model_answer: 'The model.', rubric: [{ point: 'A', marks: 1 }, { point: 'B', marks: 2 }]
	};
	const out = describeWritten(essay, { text: 'my answer here' }).join('\n');
	assert.match(out, /Your answer \(3 words\): my answer here/);
	assert.match(out, /- B \(2 marks\)/);
	assert.match(out, /Model answer: The model\./);
});

const six = () => ({
	id: 's', prompt: 'p', explanation: 'e', difficulty: 3, cognitive_patterns: [], information_types: [],
	options: [
		['a', 'Right answer here'], ['b', 'Figure of speech'], ['c', 'Grammar near miss'],
		['d', 'True elsewhere'], ['e', 'Same value other units'], ['f', 'The opposite']
	].map(([id, text]) => ({ id, text })),
	correct_option_id: 'a',
	distractor_kinds: { b: 'figurative', c: 'grammatical', d: 'situational', e: 'units', f: 'opposite' }
});

test('a sound six-option question has no problems', () => {
	assert.deepEqual(sixOptionProblems(six()), []);
	assert.equal(DISTRACTOR_KINDS.length, 5);
});

test('six-option problems are named: wrong count, missing or repeated kinds, a tagged answer', () => {
	let q = six(); q.options.pop();
	assert.match(sixOptionProblems(q)[0], /exactly six/);
	q = six(); delete q.distractor_kinds.d;
	assert.ok(sixOptionProblems(q).some((m) => /option d has no kind/.test(m)));
	assert.ok(sixOptionProblems(q).some((m) => /kind 'situational'/.test(m)));
	q = six(); q.distractor_kinds.f = 'units';
	assert.ok(sixOptionProblems(q).some((m) => /each kind must be used once/.test(m)));
	q = six(); q.distractor_kinds.a = 'opposite';
	assert.ok(sixOptionProblems(q).some((m) => /correct option must not be given a kind/.test(m)));
	q = six(); q.distractor_kinds.b = 'poetic';
	assert.ok(sixOptionProblems(q).some((m) => /unknown kind 'poetic'/.test(m)));
});

test('the correct option may not be obviously the longest', () => {
	let q = six(); q.options[0].text = 'A right answer that is written out at very great and obvious length indeed';
	assert.ok(sixOptionProblems(q).some((m) => /obviously longer/.test(m)));
	q = six(); q.options[0].text = 'Right answer, a little longer';
	assert.deepEqual(sixOptionProblems(q), []);
});
