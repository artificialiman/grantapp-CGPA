<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;

	let activeYear = data.years[0]?.year ?? 1;

	let showAddForm = false;
	let newCourseName = '';
	let newCourseCode = '';
	let newCourseKind: 'core' | 'elective' | 'extra_credit' = 'elective';
	let newCourseYear = activeYear;
	let submitting = false;
	let submitMessage = '';

	const kindLabel: Record<string, string> = {
		core: 'Core',
		elective: 'Elective',
		extra_credit: 'Extra credit'
	};

	async function submitCourse() {
		if (!newCourseName.trim()) return;
		submitting = true;
		submitMessage = '';
		try {
			const res = await fetch('/api/submit-course', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					department_id: data.department.id,
					year: newCourseYear,
					name: newCourseName,
					code: newCourseCode || undefined,
					kind: newCourseKind
				})
			});
			const body = await res.json();
			if (!res.ok) throw new Error(body.message ?? 'Failed to submit');
			submitMessage = body.message;
			newCourseName = '';
			newCourseCode = '';
		} catch (e) {
			submitMessage = e instanceof Error ? e.message : 'Failed to submit';
		} finally {
			submitting = false;
		}
	}
</script>

<div class="wrap">
	<div class="breadcrumb">
		<a href="/faculties">Faculties</a><span class="sep">/</span>
		<a href="/faculties/{data.faculty.slug}">{data.faculty.name}</a><span class="sep">/</span>
		<span class="current">{data.department.name}</span>
	</div>

	<h1 class="page-title">{data.department.name}</h1>

	{#if data.years.length === 0}
		<p class="empty-state">No courses listed yet for this department.</p>
	{:else}
		<div class="year-tabs">
			{#each data.years as y}
				<button
					type="button"
					class="year-tab"
					class:active={activeYear === y.year}
					on:click={() => (activeYear = y.year)}
				>
					Year {y.year}
				</button>
			{/each}
		</div>

		{#each data.years as y}
			{#if activeYear === y.year}
				<ul class="course-list">
					{#each y.courses as course}
						<li class="course-row">
							<span class="course-name">{course.name}</span>
							{#if course.code}<span class="course-code">{course.code}</span>{/if}
							<span class="course-kind kind-{course.kind}">{kindLabel[course.kind]}</span>
						</li>
					{/each}
				</ul>
			{/if}
		{/each}
	{/if}

	<!-- COPY NEEDED: real label/help text for the free-text course-add flow -->
	{#if !showAddForm}
		<button class="btn btn-secondary" on:click={() => { showAddForm = true; newCourseYear = activeYear; }}>
			Don't see your course? Add it
		</button>
	{:else}
		<form class="add-course-form" on:submit|preventDefault={submitCourse}>
			<h2 class="form-title">Add a course</h2>
			<p class="form-note">Submitted courses need admin approval before they show up here.</p>

			<label>
				Course name
				<input type="text" bind:value={newCourseName} required />
			</label>
			<label>
				Course code (optional)
				<input type="text" bind:value={newCourseCode} />
			</label>
			<label>
				Year
				<select bind:value={newCourseYear}>
					{#each Array(7) as _, i}
						<option value={i + 1}>Year {i + 1}</option>
					{/each}
				</select>
			</label>
			<label>
				Type
				<select bind:value={newCourseKind}>
					<option value="core">Core</option>
					<option value="elective">Elective</option>
					<option value="extra_credit">Extra credit</option>
				</select>
			</label>

			<div class="form-actions">
				<button type="submit" class="btn btn-primary" disabled={submitting}>
					{submitting ? 'Submitting…' : 'Submit'}
				</button>
				<button type="button" class="btn btn-secondary" on:click={() => (showAddForm = false)}>Cancel</button>
			</div>

			{#if submitMessage}
				<p class="submit-message">{submitMessage}</p>
			{/if}
		</form>
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

	.year-tabs {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		margin-bottom: 1.25rem;
	}

	.year-tab {
		padding: 0.4rem 0.9rem;
		border-radius: 999px;
		border: 1px solid var(--border-2);
		background: var(--surface);
		color: var(--muted);
		font-size: 0.82rem;
		cursor: pointer;
	}

	.year-tab.active {
		border-color: var(--accent);
		color: var(--text);
		background: var(--accent-dim);
	}

	.course-list {
		list-style: none;
		padding: 0;
		margin: 0 0 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.course-row {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.75rem 1rem;
		border-radius: var(--radius-md);
		background: var(--surface);
		border: 1px solid var(--border);
	}

	.course-name {
		font-weight: 600;
		flex: 1;
	}

	.course-code {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--muted);
	}

	.course-kind {
		font-size: 0.7rem;
		padding: 0.15rem 0.5rem;
		border-radius: 999px;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.kind-core {
		background: var(--accent-dim);
		color: var(--accent);
	}

	.kind-elective {
		background: var(--surface-2);
		color: var(--muted);
	}

	.kind-extra_credit {
		background: var(--surface-2);
		color: var(--muted);
	}

	.add-course-form {
		margin-top: 1rem;
		padding: 1.25rem;
		border-radius: var(--radius-card);
		background: var(--surface);
		border: 1px solid var(--border);
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.form-title {
		font-family: var(--font-display);
		font-weight: 600;
		font-size: 1.1rem;
	}

	.form-note {
		font-size: 0.8rem;
		color: var(--muted);
		margin: -0.4rem 0 0.2rem;
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		font-size: 0.82rem;
		color: var(--muted);
	}

	input,
	select {
		padding: 0.5rem 0.7rem;
		border-radius: var(--radius-md);
		border: 1px solid var(--border-2);
		background: var(--bg);
		color: var(--text);
		font-size: 0.9rem;
	}

	.form-actions {
		display: flex;
		gap: 0.6rem;
	}

	.submit-message {
		font-size: 0.82rem;
		color: var(--muted);
	}

	@media (max-width: 480px) {
		.wrap {
			padding: 1.2rem;
		}
	}
</style>
