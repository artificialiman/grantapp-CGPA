<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<div class="wrap">
	<h1 class="page-title">Faculties</h1>
	<p class="page-intro">
		<!-- COPY NEEDED: real intro copy for the faculty browse screen -->
		Pick a faculty to see its departments and course path to graduation.
	</p>

	{#if data.faculties.length === 0}
		<p class="empty-state">No faculties available yet.</p>
	{:else}
		<div class="faculty-grid">
			{#each data.faculties as faculty}
				<a href="/faculties/{faculty.slug}" class="faculty-card">
					{faculty.name}
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

	.page-title {
		font-size: clamp(1.75rem, 4vw, 2.25rem);
		letter-spacing: -0.03em;
		margin-bottom: 0.5rem;
	}

	.page-intro {
		color: var(--muted);
		margin-bottom: 1.5rem;
	}

	.empty-state {
		color: var(--muted);
		padding: 2rem 0;
		text-align: center;
	}

	.faculty-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 0.75rem;
	}

	.faculty-card {
		padding: 1.25rem;
		border-radius: var(--radius-md);
		background: var(--surface);
		border: 1px solid var(--border-2);
		color: var(--text);
		font-family: var(--font-display);
		font-weight: 600;
		text-align: left;
	}

	.faculty-card:hover {
		border-color: var(--accent);
	}
</style>
