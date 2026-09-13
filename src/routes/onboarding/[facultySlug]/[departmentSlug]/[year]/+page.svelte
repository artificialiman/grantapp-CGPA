<script lang="ts">
	import type { PageData } from './$types';
	export let data: PageData;

	let showAddForm = false;
	let newCourseName = '';
	let newCourseCode = '';
	let newCourseKind: 'core' | 'elective' | 'extra_credit' = 'elective';
	let submitting = false;
	let submitMessage: string | null = null;
	let submitError: string | null = null;

	async function submitCourse(e: Event) {
		e.preventDefault();
		if (submitting) return;
		submitting = true;
		submitError = null;
		submitMessage = null;

		try {
			const res = await fetch('/api/submit-course', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					department_id: data.department.id,
					year: data.year,
					name: newCourseName,
					code: newCourseCode || undefined,
					kind: newCourseKind
				})
			});
			const body = await res.json();
			if (!res.ok) {
				submitError = body.message ?? 'Failed to submit course';
				submitting = false;
				return;
			}
			submitMessage = body.message;
			newCourseName = '';
			newCourseCode = '';
			showAddForm = false;
		} catch (err) {
			submitError = (err as Error).message || 'Failed to submit course';
		} finally {
			submitting = false;
		}
	}
</script>

<div class="wrap">
	<div class="breadcrumb">
		<a href="/onboarding">Faculties</a><span class="sep">/</span>
		<a href="/onboarding/{data.faculty.slug}">{data.faculty.name}</a><span class="sep">/</span>
		<a href="/onboarding/{data.faculty.slug}/{data.department.slug}">{data.department.name}</a><span class="sep">/</span>
		<span class="current">Year {data.year}</span>
	</div>

	<div class="step-indicator">Step 4 of 5</div>
	<h1 class="page-title">Year {data.year} courses</h1>
	<p class="page-intro">Pick a course to start practicing, or add one that's missing.</p>

	{#if submitMessage}
		<div class="error-banner success"><div class="error-content"><p>{submitMessage}</p></div></div>
	{/if}
	{#if submitError}
		<div class="error-banner"><div class="error-content"><p>{submitError}</p></div></div>
	{/if}

	<h2 class="section-heading">Core</h2>
	<div class="option-grid">
		{#each data.coreCourses as course}
			<a href="/onboarding/{data.faculty.slug}/{data.department.slug}/{data.year}/{course.id}" class="option-card">
				<span class="option-name">{course.name}{course.code ? ` (${course.code})` : ''}</span>
				<span class="option-arrow">&rarr;</span>
			</a>
		{/each}
		{#if data.coreCourses.length === 0}
			<p class="empty-state-inline">No core courses listed for this year yet.</p>
		{/if}
	</div>

	<h2 class="section-heading">Elective / Extra credit</h2>
	<div class="option-grid">
		{#each data.electiveCourses as course}
			<a href="/onboarding/{data.faculty.slug}/{data.department.slug}/{data.year}/{course.id}" class="option-card">
				<span class="option-name">{course.name}{course.code ? ` (${course.code})` : ''}</span>
				<span class="option-arrow">&rarr;</span>
			</a>
		{/each}
		{#if data.electiveCourses.length === 0}
			<p class="empty-state-inline">No elective courses listed for this year yet.</p>
		{/if}
	</div>

	{#if !showAddForm}
		<button class="btn btn-secondary add-course-toggle" on:click={() => (showAddForm = true)}>
			+ Add a course not listed here
		</button>
	{:else}
		<form class="add-course-form" on:submit={submitCourse}>
			<h3 class="form-heading">Add a course</h3>
			<p class="form-note">
				Submitted courses are reviewed by an admin before they appear for other students — you'll
				keep access to it here in the meantime.
			</p>

			<div class="form-group">
				<label for="courseName">Course name</label>
				<input id="courseName" type="text" bind:value={newCourseName} required disabled={submitting} placeholder="e.g. Operating Systems" />
			</div>

			<div class="form-group">
				<label for="courseCode">Course code (optional)</label>
				<input id="courseCode" type="text" bind:value={newCourseCode} disabled={submitting} placeholder="e.g. CSC305" />
			</div>

			<div class="form-group">
				<label for="courseKind">Type</label>
				<select id="courseKind" bind:value={newCourseKind} disabled={submitting}>
					<option value="core">Core</option>
					<option value="elective">Elective</option>
					<option value="extra_credit">Extra credit</option>
				</select>
			</div>

			<div class="form-actions">
				<button type="submit" class="btn btn-primary" disabled={submitting}>
					{submitting ? 'Submitting...' : 'Submit for approval'}
				</button>
				<button type="button" class="btn btn-secondary" disabled={submitting} on:click={() => (showAddForm = false)}>
					Cancel
				</button>
			</div>
		</form>
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
		margin-bottom: 1.5rem;
	}

	.section-heading {
		font-size: 0.85rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--muted);
		margin: 1.5rem 0 0.6rem;
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

	.empty-state-inline {
		color: var(--muted);
		font-size: 0.85rem;
		padding: 0.5rem 0;
	}

	.add-course-toggle {
		margin-top: 1.75rem;
	}

	.add-course-form {
		margin-top: 1.75rem;
		padding: 1.25rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-card);
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.form-heading {
		font-size: 1rem;
	}

	.form-note {
		font-size: 0.8rem;
		color: var(--muted);
		margin-top: -0.5rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.form-group label {
		font-family: var(--font-mono);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--muted);
		font-size: 0.7rem;
	}

	.form-actions {
		display: flex;
		gap: 0.6rem;
	}
</style>
