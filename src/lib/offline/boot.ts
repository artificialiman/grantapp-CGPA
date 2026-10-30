// Runs once when the app opens in a browser. Two jobs, both quiet:
//   1. First run: if no packs are stored and the phone is online, fetch the starter packs.
//      Installing the app is the consent for that first download (DECISIONS 2026-10-30).
//   2. Send any finished tests that are waiting in the queue, now and whenever the phone
//      comes back online.
// Weekly updates are NOT done here: they need the student's yes first (E5).
import { packsStore } from './db';
import { installStarter, syncAttempts } from './sync';

export function bootOffline(): () => void {
	let stopped = false;

	async function ensureStarter() {
		try {
			if (!navigator.onLine) return;
			const stored = await packsStore.getAll();
			if (stored.length === 0) await installStarter();
		} catch {
			// Offline, blocked storage or a failed hash: try again next time the app opens.
		}
	}

	function flush() {
		if (stopped || !navigator.onLine) return;
		syncAttempts().catch(() => {});
	}

	ensureStarter().then(flush);
	window.addEventListener('online', flush);
	return () => {
		stopped = true;
		window.removeEventListener('online', flush);
	};
}
