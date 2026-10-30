import type { Manifest, PackMeta } from './types';

/** A weekly update never exceeds this (DECISIONS 2026-10-30). Compressed bytes, as sent over the wire. */
export const UPDATE_CEILING_BYTES = 50 * 1024 * 1024;

export type UpdatePlan = {
	download: PackMeta[];
	remove: string[]; // pack keys no longer in the manifest
	bytes: number; // compressed bytes to fetch
	exceedsCeiling: boolean;
	upToDate: boolean;
};

/**
 * Decide what to fetch. Pure: no network, no storage.
 * `include` narrows the manifest to what this student needs (own faculty plus shared
 * courses). Starter packs are always wanted so the first install holds the whole starter set.
 */
export function planUpdate(
	manifest: Manifest,
	stored: { key: string; sha256: string }[],
	include?: (p: PackMeta) => boolean
): UpdatePlan {
	const have = new Map(stored.map((s) => [s.key, s.sha256]));
	const wanted = manifest.packs.filter((p) => p.starter || !include || include(p));
	const download = wanted.filter((p) => have.get(p.key) !== p.sha256);
	const inManifest = new Set(manifest.packs.map((p) => p.key));
	const remove = stored.filter((s) => !inManifest.has(s.key)).map((s) => s.key);
	const bytes = download.reduce((n, p) => n + p.gz_bytes, 0);
	return {
		download,
		remove,
		bytes,
		exceedsCeiling: bytes > UPDATE_CEILING_BYTES,
		upToDate: download.length === 0 && remove.length === 0
	};
}
