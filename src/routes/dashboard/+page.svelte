<script lang="ts">
	import type { PageData } from './$types';
	export let data: PageData;
</script>

<div class="wrap">
	<h1 class="page-title">Dashboard</h1>
	<p class="page-intro">
		Welcome, {data.student?.full_name ?? 'student'}.
		{#if data.devAuthBypass}
			<span class="dev-note">(dev auth bypass active)</span>
		{/if}
	</p>
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
	}

	.dev-note {
		font-family: var(--font-mono);
		color: var(--accent);
		font-size: 0.8rem;
	}
</style>
