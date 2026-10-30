<script lang="ts">
	// Shows the analytics for one finished test. Pure display: the numbers come from analyse().
	import type { Analytics } from '$lib/offline/analytics';
	import { BAND_NOTE, formatDuration } from '$lib/offline/share';

	export let analytics: Analytics;

	$: sections = [
		{ title: 'By difficulty', rows: analytics.byDifficulty },
		{ title: 'By way of thinking', rows: analytics.byPattern },
		{ title: 'By type of content', rows: analytics.byType }
	];
</script>

<section class="analytics" aria-label="Test analytics">
	<h2 class="heading">Analytics</h2>
	<p class="band">
		<strong>{analytics.percent}%</strong> · {analytics.band}
		<span class="note">({BAND_NOTE[analytics.band]})</span>
	</p>
	<p class="meta">
		{analytics.correct} correct · {analytics.wrong} wrong · {analytics.skipped} skipped · {formatDuration(analytics.seconds)}
	</p>

	{#each sections as { title, rows }}
		<h3 class="sub">{title}</h3>
		<ul class="rows">
			{#each rows as b}
				<li>
					<span class="label">{b.label}</span>
					<span class="figure">{b.correct} of {b.total} · {b.percent}%</span>
					<span class="bar" aria-hidden="true"><span class="fill" style="width: {b.percent}%"></span></span>
				</li>
			{/each}
		</ul>
	{/each}

	<h3 class="sub">Where to revise</h3>
	{#if analytics.focus.length === 0}
		<p class="meta">Every question was answered correctly.</p>
	{:else}
		<ul class="focus">
			{#each analytics.focus as f}
				<li>{f.label}: {f.correct} of {f.total} correct</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.analytics {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		padding: 1rem;
		margin: 0 0 1.5rem;
	}
	.heading {
		font-size: 1.1rem;
		margin: 0 0 0.5rem;
	}
	.band {
		margin: 0 0 0.25rem;
	}
	.note,
	.meta {
		color: var(--muted);
		font-size: 0.85rem;
	}
	.meta {
		margin: 0 0 0.75rem;
	}
	.sub {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		text-transform: uppercase;
		color: var(--muted);
		margin: 1rem 0 0.4rem;
	}
	.rows,
	.focus {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.rows li {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 0.15rem 0.75rem;
		font-size: 0.88rem;
	}
	.figure {
		color: var(--muted);
		font-size: 0.82rem;
	}
	.bar {
		grid-column: 1 / -1;
		height: 6px;
		border-radius: 3px;
		background: var(--border);
		overflow: hidden;
	}
	.fill {
		display: block;
		height: 100%;
		background: var(--accent);
	}
	.focus li {
		font-size: 0.88rem;
	}
</style>
