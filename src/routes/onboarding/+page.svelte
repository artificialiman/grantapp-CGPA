<script lang="ts">
	import type { PageData } from './$types';
	export let data: PageData;
</script>

<div class="wrap">
	<div class="step-indicator">Step 1 of 5</div>
	<h1 class="page-title">Choose your Faculty</h1>
	<p class="page-intro">Pick the Faculty your programme belongs to.</p>

	<div class="option-grid">
		{#each data.faculties as faculty}
			<a href="/onboarding/{faculty.slug}" class="option-card">
				<span class="option-name">{faculty.name}</span>
				<span class="option-arrow">&rarr;</span>
			</a>
		{/each}
	</div>

	{#if data.faculties.length === 0}
		<p class="empty-state">No faculties available yet.</p>
	{/if}
</div>

<style>
	.wrap {
		max-width: 700px;
		margin: 0 auto;
		padding: 2rem;
	}

	.step-indicator {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--accent);
		margin-bottom: 0.5rem;
	}

	.page-title {
		font-size: clamp(1.75rem, 4vw, 2.25rem);
		letter-spacing: -0.03em;
		margin-bottom: 0.4rem;
	}

	.page-intro {
		color: var(--muted);
		margin-bottom: 1.75rem;
	}

	.option-grid {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.option-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.25rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		color: var(--text);
		transition: border-color 0.15s ease;
	}

	.option-card:hover {
		border-color: var(--accent);
	}

	.option-name {
		font-weight: 600;
	}

	.option-arrow {
		color: var(--muted);
	}

	.empty-state {
		color: var(--muted);
		padding: 2rem 0;
		text-align: center;
	}
</style>
