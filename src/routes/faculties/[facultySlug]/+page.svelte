<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<div class="wrap faculty-context--{data.faculty.slug}">
	<div class="breadcrumb">
		<a href="/faculties">Faculties</a><span class="sep">/</span><span class="current">{data.faculty.name}</span>
	</div>

	<h1 class="page-title">{data.faculty.name}</h1>

	{#if data.departments.length === 0}
		<p class="empty-state">No departments listed yet for this faculty.</p>
	{:else}
		<ul class="dept-list">
			{#each data.departments as dept}
				<li>
					<a href="/faculties/{data.faculty.slug}/{dept.slug}" class="dept-row">
						<span class="dept-name">{dept.name}</span>
						<span class="dept-meta">
							{dept.courseCount}
							{dept.courseCount === 1 ? 'course' : 'courses'}
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
		font-size: clamp(1.75rem, 4vw, 2.5rem);
		letter-spacing: -0.03em;
		margin-bottom: 2rem;
		border-left: 4px solid var(--accent);
		padding-left: 0.85rem;
	}

	.empty-state {
		color: var(--muted);
		padding: 2rem 0;
		text-align: center;
	}

	.dept-list {
		list-style: none;
	}

	.dept-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		padding: 1.15rem 1rem;
		border-bottom: 1px solid var(--border);
		border-left: 3px solid transparent;
		color: var(--text);
		transition: border-color 0.15s ease, background 0.15s ease;
	}

	.dept-row:hover {
		border-left-color: var(--accent);
		background: var(--accent-dim);
	}

	.dept-name {
		font-family: var(--font-display);
		font-weight: 700;
		font-size: 1.1rem;
	}

	.dept-meta {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		color: var(--muted);
		white-space: nowrap;
		flex-shrink: 0;
	}

	@media (max-width: 480px) {
		.wrap {
			padding: 1.2rem;
		}
		.dept-row {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.25rem;
		}
	}
</style>
