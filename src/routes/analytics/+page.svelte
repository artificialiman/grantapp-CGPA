<script lang="ts">
	import type { PageData } from './$types';
	export let data: PageData;

	type MasteryRow = {
		course_id: number;
		cognitive_pattern: string;
		information_type: string;
		attempts: number;
		correct: number;
		mastery_score: number | null;
		last_attempted_at: string;
	};

	const rows = data.mastery as MasteryRow[];

	const byCourse = new Map<number, MasteryRow[]>();
	for (const row of rows) {
		if (!byCourse.has(row.course_id)) byCourse.set(row.course_id, []);
		byCourse.get(row.course_id)!.push(row);
	}
	const courseIds = [...byCourse.keys()];

	function scoreColor(score: number | null): string {
		if (score === null) return 'var(--surface-2)';
		if (score >= 0.75) return 'var(--green-dim)';
		if (score >= 0.5) return 'var(--accent-dim)';
		return 'var(--red-dim)';
	}

	function scoreBorder(score: number | null): string {
		if (score === null) return 'var(--border-2)';
		if (score >= 0.75) return 'var(--green)';
		if (score >= 0.5) return 'var(--accent)';
		return 'var(--red)';
	}
</script>

<div class="wrap">
	<h1 class="page-title">Analytics</h1>
	<p class="page-intro">
		Your mastery across cognitive patterns and information types, per course. Darker green is
		stronger, red needs work.
	</p>

	<!-- EXPERIENCE_CONTEXT.md §5's per-screen animation budget:
	     "Analytics charts | No | Static render." No hover/transition
	     effects on the grid cells below, on purpose. -->

	{#each courseIds as courseId}
		<h2 class="course-heading">{data.courseNames[courseId] ?? `Course ${courseId}`}</h2>
		<div class="mastery-grid">
			{#each byCourse.get(courseId) ?? [] as row}
				<div
					class="mastery-cell"
					style="background: {scoreColor(row.mastery_score)}; border-color: {scoreBorder(row.mastery_score)};"
				>
					<div class="cell-combo">{row.cognitive_pattern} × {row.information_type}</div>
					<div class="cell-score">
						{row.mastery_score !== null ? `${Math.round(row.mastery_score * 100)}%` : 'Untried'}
					</div>
					<div class="cell-meta">{row.correct}/{row.attempts} correct</div>
				</div>
			{/each}
		</div>
	{/each}

	{#if courseIds.length === 0}
		<p class="empty-state">No mastery data yet — it builds up as you answer questions in your courses.</p>
	{/if}
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
		margin-bottom: 0.4rem;
	}

	.page-intro {
		color: var(--muted);
		margin-bottom: 1.75rem;
	}

	.course-heading {
		font-size: 1rem;
		margin: 1.75rem 0 0.75rem;
	}

	.mastery-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: 0.6rem;
	}

	.mastery-cell {
		border: 1px solid;
		border-radius: var(--radius-md);
		padding: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.cell-combo {
		font-size: 0.72rem;
		color: var(--muted);
		text-transform: capitalize;
	}

	.cell-score {
		font-family: var(--font-display);
		font-size: 1.1rem;
		font-weight: 700;
	}

	.cell-meta {
		font-size: 0.68rem;
		color: var(--muted);
	}

	.empty-state {
		color: var(--muted);
		text-align: center;
		padding: 3rem 0;
	}
</style>
