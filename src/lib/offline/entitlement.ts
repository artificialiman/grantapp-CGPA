// Which sign-up the account is: "standard" (the install) or "updates" (added by hand by the founder,
// receives question-bank updates). Browser only. The answer is kept on the phone so the app still
// knows it offline. It only decides whether the app OFFERS updates; it is not a security lock,
// because the packs themselves are public files (DECISIONS 2026-10-30).
import { metaStore } from './db';

export type Tier = 'standard' | 'updates';

export async function getTier(): Promise<Tier> {
	try {
		return (await metaStore.get('tier')) === 'updates' ? 'updates' : 'standard';
	} catch {
		return 'standard';
	}
}

/** Ask the server and remember the answer. Offline or on a server error the saved answer stands. */
export async function refreshTier(): Promise<Tier> {
	try {
		const res = await fetch('/api/entitlement', { cache: 'no-store' });
		if (res.ok) {
			const body = (await res.json()) as { tier?: string };
			const tier: Tier = body.tier === 'updates' ? 'updates' : 'standard';
			await metaStore.set('tier', tier);
			return tier;
		}
		if (res.status === 401) {
			await metaStore.set('tier', 'standard');
			return 'standard';
		}
	} catch {
		// offline: fall through to the saved answer
	}
	return getTier();
}
