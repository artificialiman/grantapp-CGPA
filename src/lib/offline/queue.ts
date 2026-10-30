import type { Attempt } from './types';

export interface AttemptStore {
	put(a: Attempt): Promise<void>;
	getAll(): Promise<Attempt[]>;
}

export type SendResult = { ok: boolean; status: number };

export const MAX_TRIES = 8;

export type FlushReport = { sent: number; failed: number; pending: number; offline: boolean };

/**
 * Send queued attempts, oldest first. An attempt is never lost and never sent twice:
 *  - success            -> marked "sent" (the server also dedupes on attempt.id)
 *  - network error      -> stop, leave everything pending (we are offline)
 *  - 401                -> not signed in yet: keep the attempt, no try counted, stop for now
 *  - 5xx, 404, 408, 429 -> count a try, stop for now (server busy or not deployed yet), retry next time
 *  - other 4xx          -> marked "failed" with the reason; retrying cannot help
 *  - MAX_TRIES reached  -> marked "failed"
 * `send` must throw on a network error and return a status otherwise.
 */
export async function flushQueue(
	store: AttemptStore,
	send: (a: Attempt) => Promise<SendResult>
): Promise<FlushReport> {
	const all = await store.getAll();
	const todo = all
		.filter((a) => a.status === 'pending')
		.sort((x, y) => (x.finished_at < y.finished_at ? -1 : x.finished_at > y.finished_at ? 1 : 0));
	let sent = 0;
	let failed = 0;
	let offline = false;
	let stopped = false;
	for (const a of todo) {
		if (stopped) break;
		let res: SendResult;
		try {
			res = await send(a);
		} catch {
			offline = true;
			break;
		}
		if (res.ok) {
			await store.put({ ...a, status: 'sent', last_error: undefined });
			sent += 1;
		} else if (res.status === 401) {
			stopped = true;
		} else if (res.status >= 400 && res.status < 500 && res.status !== 404 && res.status !== 408 && res.status !== 429) {
			await store.put({ ...a, status: 'failed', tries: a.tries + 1, last_error: `HTTP ${res.status}` });
			failed += 1;
		} else {
			const tries = a.tries + 1;
			if (tries >= MAX_TRIES) {
				await store.put({ ...a, status: 'failed', tries, last_error: `HTTP ${res.status}` });
				failed += 1;
			} else {
				await store.put({ ...a, tries, last_error: `HTTP ${res.status}` });
			}
			stopped = true;
		}
	}
	const after = await store.getAll();
	return { sent, failed, pending: after.filter((a) => a.status === 'pending').length, offline };
}
