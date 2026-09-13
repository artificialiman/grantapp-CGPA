<script lang="ts">
	import { GRADING_SCALES, classifyGpa, type ScaleId } from '$lib/cgpa/scales';
	import { calculateCgpa, type CourseEntry } from '$lib/cgpa/calculate';

	let selectedScaleId: ScaleId = 'nuc-5.0';
	$: scale = GRADING_SCALES[selectedScaleId];

	let entries: CourseEntry[] = [
		{ id: crypto.randomUUID(), name: '', creditUnits: 3, grade: 'A' }
	];

	function addRow() {
		entries = [...entries, { id: crypto.randomUUID(), name: '', creditUnits: 3, grade: 'A' }];
	}

	function removeRow(id: string) {
		entries = entries.filter((e) => e.id !== id);
	}

	$: result = calculateCgpa(entries, scale);
	$: classification = result !== null ? classifyGpa(scale, result) : null;
</script>

<div class="wrap">
	<h1 class="page-title">CGPA Calculator</h1>
	<p class="page-intro">Credit-unit-weighted, same formula your institution uses on your transcript.</p>

	<div class="form-group scale-picker">
		<label for="scale">Grading scale</label>
		<select id="scale" bind:value={selectedScaleId}>
			{#each Object.values(GRADING_SCALES) as s}
				<option value={s.id}>{s.name}</option>
			{/each}
		</select>
		<p class="scale-note">{scale.sourceNote}</p>
	</div>

	<table class="course-table">
		<thead>
			<tr>
				<th>Course</th>
				<th>Credit units</th>
				<th>Grade</th>
				<th></th>
			</tr>
		</thead>
		<tbody>
			{#each entries as entry (entry.id)}
				<tr>
					<td><input type="text" bind:value={entry.name} placeholder="e.g. CSC101" /></td>
					<td><input type="number" min="0" bind:value={entry.creditUnits} class="unit-input" /></td>
					<td>
						<select bind:value={entry.grade}>
							{#each scale.grades as g}
								<option value={g.grade}>{g.grade} ({g.points} pts)</option>
							{/each}
						</select>
					</td>
					<td>
						<button type="button" class="btn-icon" on:click={() => removeRow(entry.id)} aria-label="Remove course">✕</button>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>

	<button type="button" class="btn btn-secondary" on:click={addRow}>+ Add course</button>

	{#if result !== null}
		<div class="result-card">
			<div class="result-cgpa">{result.toFixed(2)} <span class="result-max">/ {scale.maxPoint.toFixed(1)}</span></div>
			{#if classification}
				<div class="result-classification">{classification}</div>
			{:else if scale.classifications.length === 0}
				<div class="result-note">Classification bands aren't standardized enough for this scale to show one — see the note above.</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.wrap {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem;
	}

	.page-title {
		font-size: clamp(1.75rem, 4vw, 2.25rem);
		letter-spacing: -0.03em;
		margin-bottom: 0.4rem;
	}

	.page-intro {
		color: var(--muted);
		margin-bottom: 1.75rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		margin-bottom: 1.5rem;
	}

	.form-group label {
		font-family: var(--font-mono);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--muted);
		font-size: 0.7rem;
	}

	.scale-note {
		font-size: 0.78rem;
		color: var(--muted);
		margin-top: 0.2rem;
	}

	.course-table {
		width: 100%;
		border-collapse: collapse;
		margin-bottom: 1rem;
	}

	.course-table th {
		text-align: left;
		font-family: var(--font-mono);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		font-size: 0.68rem;
		color: var(--muted);
		padding-bottom: 0.5rem;
	}

	.course-table td {
		padding: 0.3rem 0.3rem 0.3rem 0;
	}

	.course-table input[type='text'] {
		width: 100%;
	}

	.unit-input {
		width: 70px;
	}

	.result-card {
		margin-top: 1.75rem;
		padding: 1.5rem;
		background: var(--surface);
		border: 1px solid var(--accent);
		border-radius: var(--radius-card);
		text-align: center;
	}

	.result-cgpa {
		font-family: var(--font-display);
		font-size: 2.5rem;
		font-weight: 800;
		color: var(--accent);
	}

	.result-max {
		font-size: 1.2rem;
		color: var(--muted);
	}

	.result-classification {
		margin-top: 0.5rem;
		font-weight: 600;
	}

	.result-note {
		margin-top: 0.5rem;
		font-size: 0.8rem;
		color: var(--muted);
	}
</style>
