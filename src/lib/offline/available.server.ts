import { findPack, type PackRef } from './lookup';

/**
 * The saved-question pack for a course, read from the manifest that ships with the app
 * (static/packs/manifest.json). This is what decides whether "Quick Test" is open: the questions
 * live in the repo, so the answer does not depend on the database. Returns null when the course has
 * no pack. A manifest that cannot be read is logged and treated as "no pack", never as a crash.
 */
export async function packForCourse(
	fetchFn: typeof fetch,
	faculty: string,
	dept: string,
	course: string
): Promise<{ key: string; count: number } | null> {
	try {
		const res = await fetchFn('/packs/manifest.json');
		if (!res.ok) throw new Error(`manifest ${res.status}`);
		const manifest = (await res.json()) as { packs?: (PackRef & { count: number })[] };
		const found = findPack(manifest.packs ?? [], faculty, dept, course);
		return found ? { key: found.key, count: found.count } : null;
	} catch (err) {
		console.error('packForCourse failed:', err);
		return null;
	}
}
