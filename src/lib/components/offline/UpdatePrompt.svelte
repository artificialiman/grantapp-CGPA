<script lang="ts">
	// Offers question-bank updates to accounts the founder added by hand ("updates" tier).
	// Always asks first, never downloads on its own, and never fetches more than the weekly
	// ceiling in one go (DECISIONS 2026-10-30).
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { checkForUpdates, applyPlan } from '$lib/offline/sync';
	import { includeForFaculty, trimToCeiling, type UpdatePlan } from '$lib/offline/plan';
	import { refreshTier } from '$lib/offline/entitlement';
	import type { Manifest } from '$lib/offline/types';

	let manifest: Manifest | null = null;
	let plan: UpdatePlan | null = null;
	let state: 'idle' | 'offer' | 'working' | 'done' | 'failed' = 'idle';
	let dismissed = false;
	let progress = '';

	$: faculty = ($page.data.student?.faculty_slug as string | undefined) ?? null;
	$: signedIn = !!$page.data.session;

	async function look() {
		if (dismissed || state === 'working' || !navigator.onLine || !signedIn) return;
		try {
			if ((await refreshTier()) !== 'updates') return;
			const found = await checkForUpdates(includeForFaculty(faculty));
			const trimmed = trimToCeiling(found.plan);
			if (trimmed.upToDate) {
				state = 'idle';
				return;
			}
			manifest = found.manifest;
			plan = trimmed;
			state = 'offer';
		} catch {
			// no signal or a bad manifest: stay quiet, look again next time
		}
	}

	async function accept() {
		if (!manifest || !plan) return;
		state = 'working';
		const report = await applyPlan(manifest, plan, (done, total) => (progress = `${done} of ${total}`));
		state = report.failed.length === 0 ? 'done' : 'failed';
	}

	function notNow() {
		dismissed = true;
		state = 'idle';
	}

	function size(bytes: number): string {
		return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
	}

	onMount(() => {
		look();
		window.addEventListener('online', look);
		return () => window.removeEventListener('online', look);
	});

	$: if (signedIn) look();
</script>

{#if state === 'offer' && plan}
	<div class="bar" role="status">
		<span>
			New questions are ready: {plan.download.length} course{plan.download.length === 1 ? '' : 's'}, {size(plan.bytes)}.
		</span>
		<span class="actions">
			<button class="btn btn-primary" on:click={accept}>Download</button>
			<button class="btn btn-secondary" on:click={notNow}>Not now</button>
		</span>
	</div>
{:else if state === 'working'}
	<div class="bar" role="status">Downloading {progress}…</div>
{:else if state === 'done'}
	<div class="bar" role="status">
		<span>Questions updated.</span>
		<button class="btn btn-secondary" on:click={() => (state = 'idle')}>OK</button>
	</div>
{:else if state === 'failed'}
	<div class="bar" role="status">
		<span>Some courses did not download. Nothing was lost; try again on a better connection.</span>
		<button class="btn btn-secondary" on:click={() => (state = 'idle')}>OK</button>
	</div>
{/if}

<style>
	.bar {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 50;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.6rem;
		padding: 0.75rem 1rem calc(0.75rem + env(safe-area-inset-bottom, 0px));
		background: var(--surface);
		border-top: 1px solid var(--border-2);
		font-size: 0.88rem;
	}
	.actions {
		display: flex;
		gap: 0.5rem;
	}
</style>
