// Run with: node --test tests/
// Which question pack serves a course in a department.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findPack } from '../src/lib/offline/lookup.ts';
const P = (key, departments) => ({ key, faculty: key.split('/')[0], course: key.split('/')[1], departments });
const packs = [
	P('medicine/bio101', ['medical-laboratory-science', 'pharmacy']),
	P('medicine/pco320', ['human-medicine']),
	P('general-studies/gst111', ['general-studies']),
	P('engineering/engineering-mathematics-i', ['*']),
	P('pharmacy/bio101', ['pharmacy'])
];

test('pack lookup: a department the pack names is served, even from another faculty', () => {
	assert.equal(findPack(packs, 'medicine', 'medical-laboratory-science', 'bio101').key, 'medicine/bio101');
	assert.equal(findPack(packs, 'general-studies', 'general-studies', 'gst111').key, 'general-studies/gst111');
});

test('pack lookup: the course\'s own faculty wins over a shared one', () => {
	assert.equal(findPack(packs, 'pharmacy', 'pharmacy', 'bio101').key, 'pharmacy/bio101');
});

test('pack lookup: a department the pack does not name gets nothing', () => {
	assert.equal(findPack(packs, 'medicine', 'human-medicine', 'bio101'), null);
	assert.equal(findPack(packs, 'nursing', 'nursing-science', 'bio101'), null);
	assert.equal(findPack(packs, 'medicine', 'human-medicine', 'no-such-course'), null);
});

test('pack lookup: "*" serves every department of its own faculty only', () => {
	assert.ok(findPack(packs, 'engineering', 'civil-engineering', 'engineering-mathematics-i'));
	assert.equal(findPack(packs, 'law', 'common-law', 'engineering-mathematics-i'), null);
});
