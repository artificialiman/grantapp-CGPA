// Run with: node --test tests/
// Tests the pure parts of the offline engine (plan, session, queue). Node 22 strips the types.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planUpdate, UPDATE_CEILING_BYTES, includeForFaculty, trimToCeiling } from '../src/lib/offline/plan.ts';
import { buildTest, gradeAnswers, mulberry32 } from '../src/lib/offline/session.ts';
import { flushQueue, MAX_TRIES } from '../src/lib/offline/queue.ts';

const meta = (key, sha256, extra = {}) => ({
	key, faculty: key.split('/')[0], course: key.split('/')[1], departments: ['*'],
	path: `packs/${key}.${sha256.slice(0, 8)}.json`, sha256, bytes: 1000, gz_bytes: 400,
	count: 8, released_on: '2026-10-30', starter: false, ...extra
});
const manifest = (packs) => ({ format: 1, release: '2026-10-30', content_hash: 'x', totals: {}, packs });

test('plan: first install fetches starter packs only', () => {
	const m = manifest([meta('law/a', 'a'.repeat(64), { starter: true }), meta('law/b', 'b'.repeat(64))]);
	const p = planUpdate(m, [], () => false);
	assert.deepEqual(p.download.map((x) => x.key), ['law/a']);
	assert.equal(p.bytes, 400);
});

test('plan: unchanged packs are not downloaded again', () => {
	const m = manifest([meta('law/a', 'a'.repeat(64), { starter: true })]);
	const p = planUpdate(m, [{ key: 'law/a', sha256: 'a'.repeat(64) }]);
	assert.equal(p.upToDate, true);
	assert.equal(p.download.length, 0);
});

test('plan: a changed pack is fetched, a dropped pack is removed', () => {
	const m = manifest([meta('law/a', 'c'.repeat(64), { starter: true })]);
	const p = planUpdate(m, [{ key: 'law/a', sha256: 'a'.repeat(64) }, { key: 'law/gone', sha256: 'z' }]);
	assert.deepEqual(p.download.map((x) => x.key), ['law/a']);
	assert.deepEqual(p.remove, ['law/gone']);
});

test('plan: include() narrows to the student\'s faculty, starter packs stay', () => {
	const m = manifest([
		meta('law/a', '1'.repeat(64)), meta('medicine/b', '2'.repeat(64)),
		meta('engineering/c', '3'.repeat(64), { starter: true })
	]);
	const p = planUpdate(m, [], (x) => x.faculty === 'law');
	assert.deepEqual(p.download.map((x) => x.key).sort(), ['engineering/c', 'law/a']);
});

test('plan: more than the weekly ceiling is flagged', () => {
	const big = meta('law/a', 'a'.repeat(64), { gz_bytes: UPDATE_CEILING_BYTES + 1 });
	assert.equal(planUpdate(manifest([big]), []).exceedsCeiling, true);
});

const pack = (key, n) => ({
	format: 1, key, faculty: key.split('/')[0], course: key.split('/')[1], departments: ['*'],
	questions: Array.from({ length: n }, (_, i) => ({
		id: `q${String(i + 1).padStart(3, '0')}`, prompt: `P${i}`, options: [{ id: 'a', text: 'x' }, { id: 'b', text: 'y' }],
		correct_option_id: i % 2 ? 'b' : 'a', explanation: `E${i}`, cognitive_patterns: ['Logical'],
		information_types: ['Essential / definitive'], difficulty: 1
	}))
});

test('session: seeded draw is repeatable, distinct and capped', () => {
	const packs = [pack('law/a', 8), pack('medicine/b', 8)];
	const a = buildTest(packs, { count: 10, seed: 7 });
	const b = buildTest(packs, { count: 10, seed: 7 });
	assert.deepEqual(a.map((q) => q.course_key + q.id), b.map((q) => q.course_key + q.id));
	assert.equal(new Set(a.map((q) => q.course_key + q.id)).size, 10);
	assert.equal(buildTest(packs, { count: 99, seed: 1 }).length, 16);
	assert.notDeepEqual(a.map((q) => q.id), buildTest(packs, { count: 10, seed: 8 }).map((q) => q.id));
});

test('session: mulberry32 stays in [0,1)', () => {
	const r = mulberry32(42);
	for (let i = 0; i < 1000; i++) { const v = r(); assert.ok(v >= 0 && v < 1); }
});

const score = (skipped, correct) => (skipped ? 0 : correct ? 1 : 0);

test('grading: correct, wrong, skipped, unknown id', () => {
	const qs = pack('law/a', 4).questions;
	const r = gradeAnswers(qs, [
		{ question_id: 'q001', selected_option_id: 'a' },
		{ question_id: 'q002', selected_option_id: 'a' },
		{ question_id: 'q003', selected_option_id: null },
		{ question_id: 'q999', selected_option_id: 'a' }
	], score);
	assert.equal(r.answered_count, 3);
	assert.equal(r.correct_count, 1);
	assert.equal(r.skipped_count, 1);
	assert.equal(r.total_score, 1);
	assert.equal(r.results[1].correct_option_id, 'b');
	assert.equal(r.results[1].explanation, 'E1');
});

const memStore = (items) => {
	const m = new Map(items.map((a) => [a.id, a]));
	return { put: async (a) => void m.set(a.id, a), getAll: async () => [...m.values()], m };
};
const att = (id, finished, extra = {}) => ({ id, course_key: 'law/a', started_at: finished, finished_at: finished, answers: [], status: 'pending', tries: 0, ...extra });

test('queue: sends oldest first and marks sent', async () => {
	const s = memStore([att('2', '2026-10-30T10:00'), att('1', '2026-10-30T09:00')]);
	const order = [];
	const r = await flushQueue(s, async (a) => (order.push(a.id), { ok: true, status: 200 }));
	assert.deepEqual(order, ['1', '2']);
	assert.equal(r.sent, 2); assert.equal(r.pending, 0);
});

test('queue: offline leaves everything pending and loses nothing', async () => {
	const s = memStore([att('1', '2026-10-30T09:00'), att('2', '2026-10-30T10:00')]);
	const r = await flushQueue(s, async () => { throw new TypeError('network'); });
	assert.equal(r.offline, true); assert.equal(r.pending, 2);
	assert.ok([...s.m.values()].every((a) => a.status === 'pending' && a.tries === 0));
});

test('queue: a sent attempt is never sent again', async () => {
	const s = memStore([att('1', '2026-10-30T09:00')]);
	await flushQueue(s, async () => ({ ok: true, status: 200 }));
	let calls = 0;
	await flushQueue(s, async () => (calls++, { ok: true, status: 200 }));
	assert.equal(calls, 0);
});

test('queue: a 400 is final, a 500 is retried and stops the run', async () => {
	const s = memStore([att('1', '2026-10-30T09:00'), att('2', '2026-10-30T10:00'), att('3', '2026-10-30T11:00')]);
	const statuses = { 1: 400, 2: 503, 3: 200 };
	const seen = [];
	const r = await flushQueue(s, async (a) => (seen.push(a.id), { ok: statuses[a.id] === 200, status: statuses[a.id] }));
	assert.deepEqual(seen, ['1', '2']);
	assert.equal(s.m.get('1').status, 'failed');
	assert.equal(s.m.get('2').status, 'pending'); assert.equal(s.m.get('2').tries, 1);
	assert.equal(s.m.get('3').status, 'pending');
	assert.equal(r.failed, 1); assert.equal(r.pending, 2);
});

test('queue: 404 (endpoint not deployed yet) is retried, then fails after MAX_TRIES', async () => {
	const s = memStore([att('1', '2026-10-30T09:00')]);
	for (let i = 0; i < MAX_TRIES - 1; i++) await flushQueue(s, async () => ({ ok: false, status: 404 }));
	assert.equal(s.m.get('1').status, 'pending');
	await flushQueue(s, async () => ({ ok: false, status: 404 }));
	assert.equal(s.m.get('1').status, 'failed');
});

test('queue: a 401 (not signed in) keeps the attempt and counts no try', async () => {
	const s = memStore([att('g1', '2026-10-30T10:00:00Z')]);
	for (let i = 0; i < MAX_TRIES + 2; i++) await flushQueue(s, async () => ({ ok: false, status: 401 }));
	const [a] = await s.getAll();
	assert.equal(a.status, 'pending');
	assert.equal(a.tries, 0);
});

test('plan: includeForFaculty keeps own faculty, general studies and shared courses', () => {
	const inc = includeForFaculty('law');
	assert.equal(inc(meta('law/a', '1'.repeat(64), { departments: ['common-law'] })), true);
	assert.equal(inc(meta('general-studies/gst101', '2'.repeat(64), { departments: ['general-studies'] })), true);
	assert.equal(inc(meta('engineering/maths', '3'.repeat(64), { departments: ['*'] })), true);
	assert.equal(inc(meta('medicine/x', '4'.repeat(64), { departments: ['human-medicine'] })), false);
	assert.equal(includeForFaculty(null)(meta('medicine/x', '4'.repeat(64))), true);
});

test('plan: trimToCeiling keeps whole packs under the ceiling and defers the rest', () => {
	const big = (k, gz) => meta(k, k.padEnd(64, '0'), { gz_bytes: gz });
	const m = manifest([big('law/a', 40), big('law/b', 40), big('law/c', 15)]);
	const p = trimToCeiling(planUpdate(m, []), 60);
	assert.deepEqual(p.download.map((x) => x.key), ['law/a', 'law/c']); // b (80 total) does not fit, c still does
	assert.equal(p.bytes, 55);
	assert.equal(p.exceedsCeiling, false);
	const same = planUpdate(manifest([big('law/a', 10)]), []);
	assert.equal(trimToCeiling(same, 60), same);
});
