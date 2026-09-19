<script lang="ts">
	import { WHATSAPP_URL } from '$lib/content/contact';
	import type { PageData } from './$types';

	export let data: PageData;

	let semester: 1 | 2 = 1;
	let enrolling = false;
	let enrollError: string | null = null;
	let justEnrolled = false;

	/**
	 * The write side of the enroll flow — api/enroll-course already
	 * existed and worked correctly, but nothing in the app UI ever
	 * called it. Found while auditing track-progress: /transcript and
	 * /path-to-first-class both read from cgpa.enrollments, which
	 * nothing ever wrote to, so both screens were permanently empty
	 * for every real user regardless of how much Quick Test they took
	 * (Quick Test intentionally doesn't touch enrollments — that table
	 * is for a student's actual grade record, a separate concept from
	 * practice-test activity).
	 */
	async function addToMyCourses() {
		enrolling = true;
		enrollError = null;
		try {
			const res = await fetch('/api/enroll-course', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ course_id: data.course.id, semester })
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				enrollError = body.message ?? 'Failed to add course';
				enrolling = false;
				return;
			}
			justEnrolled = true;
		} catch (err) {
			enrollError = (err as Error).message || 'Failed to add course';
		} finally {
			enrolling = false;
		}
	}
</script>

<div class="wrap">
	<div class="breadcrumb">
		<a href="/faculties">Faculties</a><span class="sep">/</span>
		<a href="/faculties/{data.facultySlug}">Faculty</a><span class="sep">/</span>
		<a href="/faculties/{data.facultySlug}/{data.deptSlug}">{data.department?.name ?? 'Department'}</a><span class="sep">/</span>
		<span class="current">{data.course.name}</span>
	</div>

	<h1 class="page-title">{data.course.name}</h1>
	{#if data.course.code}<p class="course-code">{data.course.code}</p>{/if}

	{#if data.isLoggedIn}
		{#if data.alreadyEnrolled || justEnrolled}
			<div class="error-banner success">
				<div class="error-content">
					<p>This course is in your <a href="/transcript">transcript</a>.</p>
				</div>
			</div>
		{:else}
			<div class="enroll-card">
				{#if enrollError}
					<div class="error-banner"><div class="error-content"><p>{enrollError}</p></div></div>
				{/if}
				<label for="semester" class="enroll-label">Add this to your record — semester</label>
				<div class="enroll-row">
					<select id="semester" bind:value={semester} disabled={enrolling}>
						<option value={1}>Semester 1</option>
						<option value={2}>Semester 2</option>
					</select>
					<button type="button" class="btn btn-primary" disabled={enrolling} on:click={addToMyCourses}>
						{enrolling ? 'Adding...' : 'Add to My Courses'}
					</button>
				</div>
			</div>
		{/if}
	{/if}

	<div class="action-grid">
		<a
			href="/faculties/{data.facultySlug}/{data.deptSlug}/{data.course.id}/quick-test"
			class="action-card"
			class:disabled={data.questionCount === 0}
		>
			<span class="action-title">Quick Test</span>
			<span class="action-detail">
				{#if data.questionCount === 0}
					No questions available yet for this course
				{:else}
					A flat, single-pass practice run — {data.questionCount} questions available
				{/if}
			</span>
		</a>

		<a
			href="/faculties/{data.facultySlug}/{data.deptSlug}/{data.course.id}/mastery"
			class="action-card"
			class:disabled={data.questionCount === 0}
		>
			<span class="action-title">100-day Mastery</span>
			<span class="action-detail">
				{#if data.questionCount === 0}
					No questions available yet for this course
				{:else}
					5 sets of 20, staged around your strengths and weak spots as you go
				{/if}
			</span>
		</a>

		<a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" class="action-card">
			<span class="action-title">Upload your own content</span>
			<span class="action-detail">
				Have notes or questions specific to your school for this course? Send them our way.
			</span>
		</a>
	</div>
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
		margin-bottom: 0.25rem;
	}

	.course-code {
		font-family: var(--font-mono);
		font-size: 0.8rem;
		color: var(--muted);
		margin-bottom: 1.5rem;
	}

	.enroll-card {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-card);
		padding: 1.25rem;
		margin: 1.5rem 0;
	}

	.enroll-label {
		display: block;
		font-family: var(--font-mono);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--muted);
		font-size: 0.68rem;
		margin-bottom: 0.6rem;
	}

	.enroll-row {
		display: flex;
		gap: 0.6rem;
	}

	.action-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.75rem;
	}

	.action-card {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		padding: 1.25rem;
		border-radius: var(--radius-card);
		background: var(--surface);
		border: 1px solid var(--border-2);
		color: var(--text);
		text-align: left;
	}

	.action-card:not(.disabled):hover {
		border-color: var(--accent);
	}

	.action-card.disabled {
		opacity: 0.55;
		cursor: default;
		pointer-events: none;
	}

	.action-title {
		font-family: var(--font-display);
		font-weight: 700;
		font-size: 1.05rem;
	}

	.action-detail {
		font-size: 0.82rem;
		color: var(--muted);
	}
</style>
