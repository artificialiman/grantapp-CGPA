<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<div class="wrap">
	<div class="breadcrumb">
		<a href="/faculties">Faculties</a><span class="sep">/</span><span class="current">{data.faculty.name}</span>
	</div>

	<h1 class="page-title">{data.faculty.name}</h1>

	{#if data.departments.length === 0}
		<p class="empty-state">No departments listed yet for this faculty.</p>
	{:else}
		<div class="dept-grid">
			{#each data.departments as dept}
				<a href="/faculties/{data.faculty.slug}/{dept.slug}" class="dept-card">
					{dept.name}
				</a>
			{/each}
		</div>
	{/if}
</div>

<style>
	.wrap {
		max-width: 900px;
		margin: 0 auto;
		padding: 2rem;
	}

	.breadcrumb {
		font-size: 0.8rem;
		color: var(--muted);
		margin-bottom: 1rem;
	}

	.breadcrumb a {
		color: var(--muted);
	}

	.sep {
		margin: 0 0.4rem;
	}

	.current {
		color: var(--text);
	}

	.page-title {
		font-size: clamp(1.75rem, 4vw, 2.25rem);
		letter-spacing: -0.03em;
		margin-bottom: 1.5rem;
	}

	.empty-state {
		color: var(--muted);
		padding: 2rem 0;
		text-align: center;
	}

	.dept-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 0.75rem;
	}

	.dept-card {
		padding: 1.25rem;
		border-radius: var(--radius-md);
		background: var(--surface);
		border: 1px solid var(--border-2);
		color: var(--text);
		font-family: var(--font-display);
		font-weight: 600;
		text-align: left;
	}

	.dept-card:hover {
		border-color: var(--accent);
	}
</style>
