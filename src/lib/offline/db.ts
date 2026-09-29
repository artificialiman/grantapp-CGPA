/**
 * Minimal IndexedDB wrapper, no dependency, for offline test-taking.
 * Two stores:
 *
 *  - 'sessions': the in-progress attempt (fetched questions + answers
 *    so far), keyed by courseId. Written on every answer, so a reload
 *    or a dropped connection mid-test never loses progress — this is
 *    what makes "start the test, then lose connectivity" survivable.
 *
 *  - 'pending-submissions': a completed attempt that failed to POST
 *    (offline at submit time). Never merged or edited once queued —
 *    only removed, and only after a confirmed successful sync. Several
 *    queued submissions for the same course can coexist; each is its
 *    own immutable attempt, same principle grantapp-shell already
 *    committed to for its own offline history.
 */

const DB_NAME = 'cgpa-offline';
const DB_VERSION = 1;

function open(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, DB_VERSION);
		req.onupgradeneeded = () => {
			const db = req.result;
			if (!db.objectStoreNames.contains('sessions')) {
				db.createObjectStore('sessions', { keyPath: 'courseId' });
			}
			if (!db.objectStoreNames.contains('pending-submissions')) {
				db.createObjectStore('pending-submissions', { keyPath: 'id', autoIncrement: true });
			}
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

async function tx<T>(
	storeName: string,
	mode: IDBTransactionMode,
	fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
	const db = await open();
	return new Promise((resolve, reject) => {
		const t = db.transaction(storeName, mode);
		const store = t.objectStore(storeName);
		const req = fn(store);
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

export type InProgressSession = {
	courseId: number;
	questions: unknown[];
	selected: Record<number, string | null>;
	savedAt: string;
};

export async function saveSession(session: InProgressSession): Promise<void> {
	await tx('sessions', 'readwrite', (s) => s.put(session));
}

export async function loadSession(courseId: number): Promise<InProgressSession | undefined> {
	return tx('sessions', 'readonly', (s) => s.get(courseId));
}

export async function clearSession(courseId: number): Promise<void> {
	await tx('sessions', 'readwrite', (s) => s.delete(courseId));
}

export type PendingSubmission = {
	id?: number;
	endpoint: '/api/submit-quick-test' | '/api/submit-mastery-set';
	body: Record<string, unknown>;
	queuedAt: string;
};

export async function queueSubmission(sub: Omit<PendingSubmission, 'id'>): Promise<void> {
	await tx('pending-submissions', 'readwrite', (s) => s.add(sub));
}

export async function listPendingSubmissions(): Promise<PendingSubmission[]> {
	return tx('pending-submissions', 'readonly', (s) => s.getAll());
}

export async function removePendingSubmission(id: number): Promise<void> {
	await tx('pending-submissions', 'readwrite', (s) => s.delete(id));
}

/**
 * Walks the queue and POSTs each one to /api/submit-quick-test. Called
 * on the browser's 'online' event (see +layout.svelte) and once on
 * app start, so a queued attempt syncs automatically the instant
 * connectivity returns — no student action needed. Each submission is
 * removed from the queue only after a confirmed 2xx, never before, so
 * a sync that fails partway leaves the rest safely queued for the next
 * attempt rather than silently dropping them.
 */
export async function flushPendingSubmissions(): Promise<void> {
	if (!navigator.onLine) return;
	const pending = await listPendingSubmissions();
	for (const sub of pending) {
		try {
			const res = await fetch(sub.endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(sub.body)
			});
			if (res.ok && sub.id !== undefined) {
				await removePendingSubmission(sub.id);
			}
		} catch {
			// Still offline or a transient failure — leave it queued,
			// the next 'online' event or app start will retry.
			break;
		}
	}
}
