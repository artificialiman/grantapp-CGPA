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
		<div class="faculty-grid">
			{#each data.faculties as faculty}
				<a
					href="/faculties/{faculty.slug}"
					class="faculty-card faculty-context--{faculty.slug}"
				>
					<span class="faculty-name">{faculty.name}</span>
					<span class="faculty-meta">
						{faculty.departmentCount}
						{faculty.departmentCount === 1 ? 'department' : 'departments'}
					</span>
					<span class="faculty-arrow" aria-hidden="true">→</span>
				</a>
			{/each}
		</div>
	{/if}
</div>

<style>
	/*
	 * This used to be a plain <a> styled as a borderless text row, with
	 * a hover-only left-border accent as its only visual affordance --
	 * on a touch device (no hover state) or even at a glance on
	 * desktop, it read as inert text, not something to press. This is
	 * now a real bordered/filled card with its own visible border,
	 * background, and an explicit arrow glyph, so "this is a button"
	 * is legible without needing to hover first.
	 */
	.wrap {
		max-width: 880px;
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

	.faculty-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 0.9rem;
	}

	.faculty-card {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		padding: 1.25rem 1.35rem 1.4rem;
		border-radius: var(--radius-lg);
		border: 1px solid var(--border-2);
		background: var(--surface);
		color: var(--text);
		text-decoration: none;
		transition: border-color 0.15s ease, background 0.15s ease, transform 0.15s ease;
	}

	.faculty-card:hover,
	.faculty-card:focus-visible {
		border-color: var(--accent);
		background: var(--accent-dim);
		transform: translateY(-1px);
	}

	.faculty-card:active {
		transform: translateY(0);
	}

	.faculty-name {
		font-family: var(--font-display);
		font-weight: 800;
		font-size: clamp(1.15rem, 3vw, 1.4rem);
		letter-spacing: -0.02em;
		padding-right: 1.5rem;
	}

	.faculty-meta {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		color: var(--muted);
	}

	.faculty-arrow {
		position: absolute;
		top: 1.25rem;
		right: 1.25rem;
		color: var(--accent);
		font-size: 1rem;
		font-weight: 700;
	}

	@media (max-width: 480px) {
		.wrap {
			padding: 1.75rem 1.25rem;
		}
		.faculty-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
