<script lang="ts">
	import type { PageData } from './$types';
	export let data: PageData;

	type WeakestMastery = {
		course_id: number;
		cognitive_pattern: string;
		information_type: string;
		mastery_score: number | null;
		courses: { name: string } | null;
	} | null;

	const weakest = data.weakestMastery as WeakestMastery;
</script>

<div class="wrap">
	<h1 class="page-title">
		Welcome, {data.student?.full_name ?? 'student'}
		{#if data.devAuthBypass}<span class="dev-note">(dev auth bypass active)</span>{/if}
	</h1>

	<a
		href={data.practiceCourseId ? `/practice/${data.practiceCourseId}` : '/faculties'}
		class="take-test-cta"
	>
		<span class="take-test-label">Take a Test</span>
		<span class="take-test-sub">
			{#if weakest}
				Practice your weakest area{#if weakest.courses}: {weakest.courses.name}{/if}
			{:else if data.practiceCourseId}
				Jump into your enrolled course
			{:else}
				Browse a faculty to get started
			{/if}
		</span>
	</a>

	<div class="summary-row">
		<div class="summary-card">
			<span class="summary-label">Courses on record</span>
			<span class="summary-value">{data.enrolledCount}</span>
		</div>
		<div class="summary-card">
			<span class="summary-label">CGPA (NUC 5.0)</span>
			<span class="summary-value">
				{data.cgpa !== null ? data.cgpa.toFixed(2) : '—'}
			</span>
			{#if data.classification}
				<span class="summary-sub">{data.classification}</span>
			{/if}
		</div>
	</div>

	{#if data.enrolledCount === 0}
		<div class="prompt-card">
			<p>You haven't added any courses yet — browse your Faculty to get started.</p>
			<a href="/faculties" class="btn btn-primary">Browse Faculties</a>
		</div>
	{:else if weakest}
		<div class="prompt-card">
			<p>
				Your weakest area right now is <strong>{weakest.cognitive_pattern} × {weakest.information_type}</strong>
				{#if weakest.courses}in {weakest.courses.name}{/if}
				{#if weakest.mastery_score !== null}({Math.round(weakest.mastery_score * 100)}% mastery){/if}.
			</p>
			<a href="/analytics" class="btn btn-primary">See full analytics</a>
		</div>
	{/if}

	<div class="link-grid">
		<a href="/faculties" class="notes-card">
			<div class="notes-title">Browse Faculties &amp; Courses</div>
		</a>
		<a href="/transcript" class="notes-card">
			<div class="notes-title">Transcript Tracker</div>
		</a>
		<a href="/analytics" class="notes-card">
			<div class="notes-title">Analytics</div>
		</a>
		<a href="/path-to-first-class" class="notes-card">
			<div class="notes-title">Path to First Class</div>
		</a>
	</div>
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
		margin-bottom: 1.5rem;
	}

	.take-test-cta {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.2rem;
		width: 100%;
		padding: 1.5rem 1.75rem;
		margin-bottom: 1.5rem;
		background: var(--accent);
		color: var(--accent-contrast, #fff);
		border-radius: var(--radius-card);
		text-decoration: none;
		transition: transform 0.08s ease, box-shadow 0.08s ease;
		box-shadow: 0 4px 18px rgba(0, 0, 0, 0.14);
	}

	.take-test-cta:hover,
	.take-test-cta:focus-visible {
		transform: translateY(-1px);
		box-shadow: 0 6px 22px rgba(0, 0, 0, 0.18);
	}

	.take-test-label {
		font-family: var(--font-display);
		font-size: clamp(1.35rem, 3.5vw, 1.7rem);
		font-weight: 800;
		letter-spacing: -0.02em;
	}

	.take-test-sub {
		font-size: 0.88rem;
		opacity: 0.9;
	}

	.dev-note {
		font-family: var(--font-mono);
		color: var(--accent);
		font-size: 0.8rem;
		font-weight: 400;
	}

	.summary-row {
		display: flex;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.summary-card {
		flex: 1;
		padding: 1.25rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-card);
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.summary-label {
		font-family: var(--font-mono);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-size: 0.65rem;
		color: var(--muted);
	}

	.summary-value {
		font-family: var(--font-display);
		font-size: 1.8rem;
		font-weight: 800;
	}

	.summary-sub {
		font-size: 0.78rem;
		color: var(--muted);
	}

	.prompt-card {
		padding: 1.25rem;
		background: var(--accent-dim);
		border: 1px solid rgba(245, 158, 11, 0.3);
		border-radius: var(--radius-card);
		margin-bottom: 1.5rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.prompt-card p {
		font-size: 0.88rem;
		color: var(--text);
	}

	.link-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 0.75rem;
	}
</style>
