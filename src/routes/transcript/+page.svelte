<script lang="ts">
	import { GRADING_SCALES, classifyGpa } from '$lib/cgpa/scales';
	import { calculateCgpa, type CourseEntry } from '$lib/cgpa/calculate';
	import type { PageData } from './$types';

	export let data: PageData;

	// Default to the NUC 5.0 scale — same default as the standalone
	// calculator. A student's chosen scale isn't tracked anywhere in
	// the schema yet (INVARIANTS.md #3 is still [OPEN] on this), so
	// this can't read a stored preference; it's a reasonable default,
	// not a resolved decision.
	const scale = GRADING_SCALES['nuc-5.0'];

	type Row = {
		id: number;
		semester: number;
		grade: string | null;
		courses: { id: number; name: string; code: string | null; kind: string; year: number } | null;
	};

	const rows = data.enrollments as unknown as Row[];

	// Group by year, since that's the doctrine's own course-path
	// structure (courses.year, not a calendar semester/session).
	const byYear = new Map<number, Row[]>();
	for (const row of rows) {
		const year = row.courses?.year ?? 0;
		if (!byYear.has(year)) byYear.set(year, []);
		byYear.get(year)!.push(row);
	}
	const years = [...byYear.keys()].sort((a, b) => a - b);

	// cgpa-CGPA's own courses table has no credit_units column yet
	// (DATA_DICTIONARY.md doesn't define one) — every enrollment is
	// treated as 3 credit units here as a working default so the
	// running-CGPA math has SOMETHING to weight by, rather than either
	// fabricating per-course unit counts or blocking this feature
	// entirely on a schema field that doesn't exist. Flagged in the UI
	// note below, not silently assumed.
	const DEFAULT_CREDIT_UNITS = 3;

	function toEntries(gradedRows: Row[]): CourseEntry[] {
		return gradedRows
			.filter((r) => r.grade)
			.map((r) => ({
				id: String(r.id),
				name: r.courses?.name ?? '',
				creditUnits: DEFAULT_CREDIT_UNITS,
				grade: r.grade!
			}));
	}

	const overallEntries = toEntries(rows);
	$: overallCgpa = calculateCgpa(overallEntries, scale);
	$: overallClassification = overallCgpa !== null ? classifyGpa(scale, overallCgpa) : null;
</script>

<div class="wrap">
	<h1 class="page-title">Transcript Tracker</h1>
	<p class="page-intro">Every course you've added, grouped by year.</p>

	<div class="schema-note">
		Note: course credit units aren't tracked yet, so every course below counts as {DEFAULT_CREDIT_UNITS}
		units for this running CGPA — treat the number as directional until real credit-unit data is added.
	</div>

	{#if overallCgpa !== null}
		<div class="result-card">
			<div class="result-cgpa">{overallCgpa.toFixed(2)} <span class="result-max">/ {scale.maxPoint.toFixed(1)}</span></div>
			{#if overallClassification}
				<div class="result-classification">{overallClassification}</div>
			{/if}
		</div>
	{/if}

	{#each years as year}
		<h2 class="year-heading">Year {year}</h2>
		<table class="transcript-table">
			<thead>
				<tr>
					<th>Course</th>
					<th>Semester</th>
					<th>Kind</th>
					<th>Grade</th>
				</tr>
			</thead>
			<tbody>
				{#each byYear.get(year) ?? [] as row}
					<tr>
						<td>{row.courses?.name ?? '—'}{row.courses?.code ? ` (${row.courses.code})` : ''}</td>
						<td>{row.semester}</td>
						<td class="kind-cell">{row.courses?.kind ?? '—'}</td>
						<td>
							{#if row.grade}
								{row.grade}
							{:else}
								<span class="in-progress">In progress</span>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/each}

	{#if years.length === 0}
		<p class="empty-state">No courses added yet — add some from your onboarding path.</p>
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
		margin-bottom: 1rem;
	}

	.schema-note {
		font-size: 0.78rem;
		color: var(--muted);
		background: var(--surface-2);
		border: 1px solid var(--border-2);
		border-radius: var(--radius-md);
		padding: 0.75rem 1rem;
		margin-bottom: 1.5rem;
	}

	.result-card {
		padding: 1.25rem;
		background: var(--surface);
		border: 1px solid var(--accent);
		border-radius: var(--radius-card);
		text-align: center;
		margin-bottom: 2rem;
	}

	.result-cgpa {
		font-family: var(--font-display);
		font-size: 2rem;
		font-weight: 800;
		color: var(--accent);
	}

	.result-max {
		font-size: 1rem;
		color: var(--muted);
	}

	.result-classification {
		margin-top: 0.3rem;
		font-weight: 600;
		font-size: 0.9rem;
	}

	.year-heading {
		font-size: 1rem;
		margin: 1.5rem 0 0.6rem;
	}

	.transcript-table {
		width: 100%;
		border-collapse: collapse;
	}

	.transcript-table th {
		text-align: left;
		font-family: var(--font-mono);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		font-size: 0.65rem;
		color: var(--muted);
		padding: 0.4rem 0.5rem;
		border-bottom: 1px solid var(--border);
	}

	.transcript-table td {
		padding: 0.5rem;
		border-bottom: 1px solid var(--border);
		font-size: 0.85rem;
	}

	.kind-cell {
		text-transform: capitalize;
		color: var(--muted);
	}

	.in-progress {
		color: var(--muted);
		font-style: italic;
	}

	.empty-state {
		color: var(--muted);
		text-align: center;
		padding: 3rem 0;
	}
</style>
