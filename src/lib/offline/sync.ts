// The offline engine's entry points for pages. Browser only.
//
//   installStarter()   first run: fetch the starter packs (asked for by installing the app)
//   checkForUpdates()  compare the manifest with what is stored; downloads nothing
//   applyPlan()        download what the student agreed to
//   loadPacks()        read stored packs for a test
//   recordAttempt()    store a finished test in the queue
//   syncAttempts()     send queued tests when online
//
// Updates are never applied without the page asking the student first: the page calls
// checkForUpdates(), shows plan.bytes, and calls applyPlan() only on a yes.
import { attemptsStore, metaStore, packsStore } from './db';
import { flushQueue, type FlushReport } from './queue';
import { planUpdate, type UpdatePlan } from './plan';
import { uuid4 } from './uuid';
import type { Answer, Attempt, Manifest, Pack, PackMeta } from './types';

const MANIFEST_URL = '/packs/manifest.json';
const SUBMIT_URL = '/api/submit-offline-attempt';

function hex(buf: ArrayBuffer): string {
	const b = new Uint8Array(buf);
	let s = '';
	for (let i = 0; i < b.length; i++) s += (b[i] + 0x100).toString(16).slice(1);
	return s;
}

export async function fetchManifest(): Promise<Manifest> {
	const res = await fetch(MANIFEST_URL, { cache: 'no-store' });
	if (!res.ok) throw new Error(`manifest ${res.status}`);
	const m = (await res.json()) as Manifest;
	if (m.format !== 1 || !Array.isArray(m.packs)) throw new Error('unsupported manifest format');
	return m;
}

export async function downloadPack(meta: PackMeta): Promise<Pack> {
	const res = await fetch('/' + meta.path);
	if (!res.ok) throw new Error(`pack ${meta.key} ${res.status}`);
	const buf = await res.arrayBuffer();
	const got = hex(await crypto.subtle.digest('SHA-256', buf));
	if (got !== meta.sha256) throw new Error(`pack ${meta.key} failed its hash check`);
	return JSON.parse(new TextDecoder().decode(buf)) as Pack;
}

export async function checkForUpdates(
	include?: (p: PackMeta) => boolean
): Promise<{ manifest: Manifest; plan: UpdatePlan }> {
	const manifest = await fetchManifest();
	const stored = await packsStore.getAll();
	return { manifest, plan: planUpdate(manifest, stored, include) };
}

export type ApplyReport = { installed: string[]; failed: string[]; removed: string[] };

export async function applyPlan(
	manifest: Manifest,
	plan: UpdatePlan,
	onProgress?: (done: number, total: number) => void
): Promise<ApplyReport> {
	const installed: string[] = [];
	const failed: string[] = [];
	let done = 0;
	for (const meta of plan.download) {
		try {
			const pack = await downloadPack(meta);
			await packsStore.put({ key: meta.key, sha256: meta.sha256, released_on: meta.released_on, pack });
			installed.push(meta.key);
		} catch {
			failed.push(meta.key);
		}
		done += 1;
		onProgress?.(done, plan.download.length);
	}
	for (const key of plan.remove) await packsStore.delete(key);
	if (failed.length === 0) await metaStore.set('release', manifest.release);
	return { installed, failed, removed: plan.remove };
}

/** First run. Installing the app is the student's consent for the starter set. */
export async function installStarter(onProgress?: (done: number, total: number) => void): Promise<ApplyReport> {
	const { manifest, plan } = await checkForUpdates(() => false);
	return applyPlan(manifest, plan, onProgress);
}

export async function loadPacks(keys?: string[]): Promise<Pack[]> {
	const all = await packsStore.getAll();
	return all.filter((s) => !keys || keys.includes(s.key)).map((s) => s.pack);
}

export async function recordAttempt(courseKey: string, startedAt: Date, answers: Answer[]): Promise<Attempt> {
	const attempt: Attempt = {
		id: uuid4(),
		course_key: courseKey,
		started_at: startedAt.toISOString(),
		finished_at: new Date().toISOString(),
		answers,
		status: 'pending',
		tries: 0
	};
	await attemptsStore.put(attempt);
	return attempt;
}

export function syncAttempts(): Promise<FlushReport> {
	return flushQueue(attemptsStore, async (a) => {
		const res = await fetch(SUBMIT_URL, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				attempt_id: a.id,
				course_key: a.course_key,
				started_at: a.started_at,
				finished_at: a.finished_at,
				answers: a.answers
			})
		});
		return { ok: res.ok, status: res.status };
	});
}
