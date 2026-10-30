<script lang="ts">
	// The page the service worker shows when a page was never opened online. It also works as the
	// offline front door: it lists the courses saved on the phone and runs a test from any of them.
	import { onMount } from 'svelte';
	import LocalTest from '$lib/components/LocalTest.svelte';
	import { packsStore } from '$lib/offline/db';

	type Saved = { key: string; count: number };
	let saved: Saved[] = [];
	let chosen: string | null = null;
	let ready = false;

	onMount(async () => {
		try {
			const all = await packsStore.getAll();
			saved = all
				.map((s) => ({ key: s.key, count: s.pack.questions.length }))
				.sort((a, b) => (a.key < b.key ? -1 : 1));
		} catch {
			saved = [];
		}
		ready = true;
	});

	function label(key: string): string {
		return key
			.split('/')
			.map((part) => part.replace(/-/g, ' '))
			.join(' · ');
	}
</script>

<div class="wrap">
	{#if chosen}
		<button class="back" on:click={() => (chosen = null)}>← Saved courses</button>
		{#key chosen}
			<LocalTest packKey={chosen} />
		{/key}
	{:else}
		<h1 class="title">You're offline</h1>
		<p class="body">
			This page isn't saved on your device. Courses saved on your phone still work: pick one to sit a
			test. Results sync when you're back online.
		</p>
		{#if ready && saved.length > 0}
			<ul class="courses">
				{#each saved as s}
					<li>
						<button class="course" on:click={() => (chosen = s.key)}>
							<span class="name">{label(s.key)}</span>
							<span class="count">{s.count} questions</span>
						</button>
					</li>
				{/each}
			</ul>
		{:else if ready}
			<p class="body">No courses are saved yet. Connect to the internet once to download them.</p>
		{/if}
		<a href="/dashboard" class="btn btn-secondary">Go to dashboard</a>
	{/if}
</div>

<style>
	.wrap { max-width: 700px; margin: 0 auto; padding: 3rem 2rem; }
	.title { font-size: clamp(1.75rem, 5vw, 2.4rem); letter-spacing: -0.03em; margin-bottom: 0.75rem; }
	.body { color: var(--muted); line-height: 1.6; margin-bottom: 1.5rem; }
	.courses { list-style: none; padding: 0; margin: 0 0 1.5rem; display: flex; flex-direction: column; gap: 0.5rem; }
	.course { width: 100%; display: flex; justify-content: space-between; gap: 1rem; text-align: left; padding: 0.85rem 1rem; border-radius: var(--radius-md); background: var(--surface); border: 1px solid var(--border-2); color: var(--text); }
	.name { text-transform: capitalize; }
	.count { color: var(--muted); font-size: 0.8rem; }
	.back { background: none; border: 0; color: var(--muted); padding: 0 0 1rem; }
	@media (max-width: 480px) { .wrap { padding: 1.5rem 1.2rem; } }
</style>
