<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<div class="wrap">
	<h1 class="page-title">Faculties</h1>
	<p class="page-intro">
		Every faculty here maps to a real Nigerian degree programme — pick yours to see its
		departments, then the exact courses on the path to graduation.
	</p>

	{#if data.faculties.length === 0}
		<p class="empty-state">No faculties available yet.</p>
	{:else}
		<ul class="faculty-list">
			{#each data.faculties as faculty}
				<li class="faculty-context--{faculty.slug}">
					<a href="/faculties/{faculty.slug}" class="faculty-row">
						<span class="faculty-name">{faculty.name}</span>
						<span class="faculty-meta">
							{faculty.departmentCount}
							{faculty.departmentCount === 1 ? 'department' : 'departments'}
						</span>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.wrap {
		max-width: 760px;
		margin: 0 auto;
		padding: 2.5rem 2rem;
	}

	.page-title {
		font-size: clamp(2rem, 5vw, 2.75rem);
		letter-spacing: -0.03em;
		margin-bottom: 0.6rem;
	}

	.page-intro {
		color: var(--muted);
		max-width: 46ch;
		margin-bottom: 2.5rem;
		line-height: 1.6;
	}

	.empty-state {
		color: var(--muted);
		padding: 2rem 0;
		text-align: center;
	}

	.faculty-list {
		list-style: none;
	}

	.faculty-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		padding: 1.5rem 0.25rem;
		border-bottom: 1px solid var(--border);
		border-left: 3px solid transparent;
		padding-left: 1.25rem;
		color: var(--text);
		transition: border-color 0.15s ease, background 0.15s ease;
	}

	.faculty-row:hover {
		border-left-color: var(--accent);
		background: var(--accent-dim);
	}

	.faculty-name {
		font-family: var(--font-display);
		font-weight: 800;
		font-size: clamp(1.35rem, 3.5vw, 1.85rem);
		letter-spacing: -0.02em;
	}

	.faculty-meta {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--muted);
		white-space: nowrap;
		flex-shrink: 0;
	}

	@media (max-width: 480px) {
		.wrap {
			padding: 1.75rem 1.25rem;
		}
		.faculty-row {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.3rem;
			padding-left: 1rem;
		}
	}
</style>
