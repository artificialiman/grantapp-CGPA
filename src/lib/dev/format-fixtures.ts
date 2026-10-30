// UI samples for the format preview page (src/routes/dev/formats). They exist to show the
// interfaces and are not part of any course. Nothing here is shipped as a question.
import type { EssayQuestion, FillQuestion, SixOptionQuestion } from '$lib/offline/types';

const base = { cognitive_patterns: [] as string[], information_types: [] as string[], difficulty: 3 };

export const sampleSix: SixOptionQuestion = {
	...base,
	id: 'sample-six',
	prompt: 'Sample: a six-option question shows one right answer and five different kinds of near miss.',
	options: [
		{ id: 'a', text: 'Sample option, the right one' },
		{ id: 'b', text: 'Sample option, close in meaning' },
		{ id: 'c', text: 'Sample option, close in form' },
		{ id: 'd', text: 'Sample option, right in another situation' },
		{ id: 'e', text: 'Sample option, right value in other units' },
		{ id: 'f', text: 'Sample option, the opposite' }
	],
	correct_option_id: 'a',
	explanation: 'Sample explanation shown after the test.',
	distractor_kinds: { b: 'figurative', c: 'grammatical', d: 'situational', e: 'units', f: 'opposite' }
};

export const sampleTable: FillQuestion = {
	...base,
	id: 'sample-table',
	type: 'fill',
	prompt: 'Sample: complete the table.',
	columns: ['Property', 'Value'],
	rows: [
		[{ text: 'Sample property one' }, { blank: 'alpha', accept: ['Alpha'] }],
		[{ text: 'Sample property two' }, { blank: '12.5', numeric: true, tolerance: 0.1 }],
		[{ text: 'Sample property three' }, { blank: 'gamma' }]
	],
	explanation: 'Sample explanation for the table.'
};

export const sampleLines: FillQuestion = {
	...base,
	id: 'sample-lines',
	type: 'fill',
	prompt: 'Sample: fill the blanks in each line.',
	rows: [
		[{ text: 'The first sample word is' }, { blank: 'one' }, { text: 'and the second is' }, { blank: 'two' }, { text: '.' }],
		[{ text: 'A sample number:' }, { blank: '40', numeric: true }]
	],
	explanation: 'Sample explanation for the lines.'
};

export const sampleEssay: EssayQuestion = {
	...base,
	id: 'sample-essay',
	type: 'essay',
	prompt: 'Sample: write a short essay on the topic shown here.',
	marks: 10,
	word_limit: 120,
	model_answer:
		'Sample model answer. It opens with a clear claim, gives two reasons with a short example for each, and ends with a conclusion that follows from them.',
	rubric: [
		{ point: 'A clear opening claim', marks: 2 },
		{ point: 'Two reasons, each with an example', marks: 6 },
		{ point: 'A conclusion that follows from the reasons', marks: 2 }
	],
	explanation: 'Sample explanation for the essay.'
};
