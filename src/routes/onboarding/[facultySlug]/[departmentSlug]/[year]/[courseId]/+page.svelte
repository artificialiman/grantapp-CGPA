<script lang="ts">
	import { WHATSAPP_URL } from '$lib/content/contact';
	import type { PageData } from './$types';
	export let data: PageData;
</script>

<div class="wrap">
	<div class="breadcrumb">
		<a href="/onboarding">Faculties</a><span class="sep">/</span>
		<a href="/onboarding/{data.facultySlug}">…</a><span class="sep">/</span>
		<a href="/onboarding/{data.facultySlug}/{data.departmentSlug}">…</a><span class="sep">/</span>
		<a href="/onboarding/{data.facultySlug}/{data.departmentSlug}/{data.year}">Year {data.year}</a><span class="sep">/</span>
		<span class="current">{data.course.name}</span>
	</div>

	<div class="step-indicator">Step 5 of 5</div>
	<h1 class="page-title">{data.course.name}{data.course.code ? ` (${data.course.code})` : ''}</h1>
	<p class="page-intro">How do you want to prepare for this course?</p>

	<div class="choice-grid">
		<div class="choice-card">
			<div class="choice-icon">📚</div>
			<h2 class="choice-title">Standard global question bank</h2>
			<p class="choice-desc">Quick Test or 100-day Mastery, built from the shared question bank for this course.</p>
			<span class="badge soon">Coming soon</span>
		</div>

		<a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" class="choice-card choice-card-link">
			<div class="choice-icon">📤</div>
			<h2 class="choice-title">Upload your own institution's content</h2>
			<p class="choice-desc">
				Send your notes or past questions to our WhatsApp — we'll turn them into a study set for this
				course.
			</p>
			<span class="badge live">Message us</span>
		</a>
	</div>
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
		font-size: clamp(1.5rem, 4vw, 2rem);
		letter-spacing: -0.03em;
		margin-bottom: 0.4rem;
	}

	.page-intro {
		color: var(--muted);
		margin-bottom: 1.75rem;
	}

	.choice-grid {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.choice-card {
		padding: 1.5rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-card);
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		color: var(--text);
	}

	.choice-card-link {
		transition: border-color 0.15s ease;
	}

	.choice-card-link:hover {
		border-color: var(--accent);
	}

	.choice-icon {
		font-size: 1.5rem;
	}

	.choice-title {
		font-size: 1.05rem;
	}

	.choice-desc {
		color: var(--muted);
		font-size: 0.85rem;
	}

	.badge {
		align-self: flex-start;
		margin-top: 0.25rem;
	}
</style>
