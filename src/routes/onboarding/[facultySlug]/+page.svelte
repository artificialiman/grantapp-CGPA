<script lang="ts">
	import type { PageData } from './$types';
	export let data: PageData;
</script>

<div class="wrap">
	<div class="breadcrumb">
		<a href="/onboarding">Faculties</a><span class="sep">/</span><span class="current">{data.faculty.name}</span>
	</div>

	<div class="step-indicator">Step 2 of 5</div>
	<h1 class="page-title">{data.faculty.name}</h1>
	<p class="page-intro">Choose your Department.</p>

	<div class="option-grid">
		{#each data.departments as department}
			<a href="/onboarding/{data.faculty.slug}/{department.slug}" class="option-card">
				<span class="option-name">{department.name}</span>
				<span class="option-arrow">&rarr;</span>
			</a>
		{/each}
	</div>

	{#if data.departments.length === 0}
		<p class="empty-state">No departments listed for this faculty yet.</p>
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
		margin: 1rem 0 0.5rem;
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
