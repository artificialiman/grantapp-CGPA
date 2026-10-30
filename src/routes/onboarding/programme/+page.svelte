<script lang="ts">
	import type { PageData } from './$types';
	import { rememberProgramme } from '$lib/auth/freeze';

	export let data: PageData;

	// Auth is frozen for testing and demos (src/lib/auth/freeze.ts): picking a
	// department sends nothing anywhere. The row is an ordinary link; the pick
	// is kept in a browser cookie so the dashboard can show it.
	let facultySlug: string | null = null;

	$: faculty = data.faculties.find((f) => f.slug === facultySlug) ?? null;

	function remember(deptSlug: string) {
		if (facultySlug) rememberProgramme(facultySlug, deptSlug);
	}
</script>

<div class="wrap {facultySlug ? `faculty-context--${facultySlug}` : ''}">
	<h1 class="page-title">
		{faculty ? 'Pick your department' : 'Pick your faculty'}
	</h1>
	<p class="page-intro">
		{#if faculty}
			{faculty.name} — your dashboard will show only this programme's courses.
		{:else}
			Do this once. Everything after it works from your programme, without waiting on the network.
		{/if}
	</p>

	{#if !faculty}
		<ul class="list">
			{#each data.faculties as f}
				<li class="faculty-context--{f.slug}">
					<button type="button" class="row" on:click={() => (facultySlug = f.slug)}>
						<span class="name">{f.name}</span>
						<span class="meta">{f.departments.length} {f.departments.length === 1 ? 'department' : 'departments'}</span>
					</button>
				</li>
			{/each}
		</ul>
	{:else}
		<button type="button" class="back" on:click={() => (facultySlug = null)}>← Change faculty</button>
		<ul class="list">
			{#each faculty.departments as d}
				<li>
					<a class="row" href="/dashboard" data-sveltekit-reload on:click={() => remember(d.slug)}>
						<span class="name">{d.name}</span>
						<span class="meta">{d.courseCount} {d.courseCount === 1 ? 'course' : 'courses'}</span>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.wrap { max-width: 640px; margin: 0 auto; padding: 2.5rem 2rem; }
	.page-title { font-size: clamp(1.75rem, 4.5vw, 2.4rem); letter-spacing: -0.03em; margin-bottom: 0.5rem; }
	.page-intro { color: var(--muted); margin-bottom: 2rem; line-height: 1.6; max-width: 46ch; }
		.list { list-style: none; }
	.row {
		text-decoration: none;
		width: 100%; display: flex; justify-content: space-between; align-items: baseline; gap: 1rem;
		padding: 1.25rem 1rem; background: none; border: 0; border-bottom: 1px solid var(--border);
		border-left: 3px solid transparent; color: var(--text); text-align: left; cursor: pointer;
		transition: border-color 0.15s ease, background 0.15s ease;
	}
	.row:hover:not(:disabled), .row:focus-visible { border-left-color: var(--accent); background: var(--accent-dim); }
		.name { font-family: var(--font-display); font-weight: 800; font-size: 1.25rem; letter-spacing: -0.01em; }
	.meta { font-family: var(--font-mono); font-size: 0.72rem; color: var(--muted); white-space: nowrap; }
	.back { background: none; border: 0; color: var(--muted); cursor: pointer; margin-bottom: 1rem; padding: 0; font: inherit; font-size: 0.85rem; }
	.back:hover { color: var(--text); }
</style>
