// IndexedDB access for the offline engine. Browser only. No library: the oldest phones
// this app targets have IndexedDB and nothing newer is needed.
import type { Attempt, StoredPack } from './types';
import type { AttemptStore } from './queue';

const DB_NAME = 'grantapp-cgpa-offline';
const DB_VERSION = 1;

let opened: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
	if (opened) return opened;
	opened = new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, DB_VERSION);
		req.onupgradeneeded = () => {
			const db = req.result;
			if (!db.objectStoreNames.contains('packs')) db.createObjectStore('packs', { keyPath: 'key' });
			if (!db.objectStoreNames.contains('attempts')) db.createObjectStore('attempts', { keyPath: 'id' });
			if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'k' });
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => {
			opened = null;
			reject(req.error);
		};
	});
	return opened;
}

async function run<T>(
	store: 'packs' | 'attempts' | 'meta',
	mode: IDBTransactionMode,
	fn: (s: IDBObjectStore) => IDBRequest
): Promise<T> {
	const db = await openDb();
	return new Promise<T>((resolve, reject) => {
		const tx = db.transaction(store, mode);
		const req = fn(tx.objectStore(store));
		tx.oncomplete = () => resolve(req.result as T);
		tx.onerror = () => reject(tx.error);
		tx.onabort = () => reject(tx.error);
	});
}

export const packsStore = {
	get: (key: string) => run<StoredPack | undefined>('packs', 'readonly', (s) => s.get(key)),
	getAll: () => run<StoredPack[]>('packs', 'readonly', (s) => s.getAll()),
	put: (p: StoredPack) => run<IDBValidKey>('packs', 'readwrite', (s) => s.put(p)).then(() => undefined),
	delete: (key: string) => run<undefined>('packs', 'readwrite', (s) => s.delete(key))
};

export const attemptsStore: AttemptStore & { get(id: string): Promise<Attempt | undefined> } = {
	get: (id) => run<Attempt | undefined>('attempts', 'readonly', (s) => s.get(id)),
	getAll: () => run<Attempt[]>('attempts', 'readonly', (s) => s.getAll()),
	put: (a) => run<IDBValidKey>('attempts', 'readwrite', (s) => s.put(a)).then(() => undefined)
};

export const metaStore = {
	get: (k: string) => run<{ k: string; v: unknown } | undefined>('meta', 'readonly', (s) => s.get(k)).then((r) => r?.v),
	set: (k: string, v: unknown) => run<IDBValidKey>('meta', 'readwrite', (s) => s.put({ k, v })).then(() => undefined)
};
