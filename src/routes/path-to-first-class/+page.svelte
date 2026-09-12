<script lang="ts">
	import { GRADING_SCALES } from '$lib/cgpa/scales';
	import { calculateCgpa, type CourseEntry } from '$lib/cgpa/calculate';
	import type { PageData } from './$types';

	export let data: PageData;

	const scale = GRADING_SCALES['nuc-5.0'];
	const FIRST_CLASS_THRESHOLD = 4.5;
	const DEFAULT_CREDIT_UNITS = 3;

	type Row = {
		id: number;
		semester: number;
		grade: string | null;
		courses: { id: number; name: string; code: string | null; kind: string; year: number } | null;
	};

	const rows = data.enrollments as unknown as Row[];

	const byYear = new Map<number, Row[]>();
	for (const row of rows) {
		const year = row.courses?.year ?? 0;
		if (!byYear.has(year)) byYear.set(year, []);
		byYear.get(year)!.push(row);
	}
	const years = [...byYear.keys()].sort((a, b) => a - b);

	function yearCgpa(yearRows: Row[]): number | null {
		const entries: CourseEntry[] = yearRows
			.filter((r) => r.grade)
			.map((r) => ({ id: String(r.id), name: r.courses?.name ?? '', creditUnits: DEFAULT_CREDIT_UNITS, grade: r.grade! }));
		return calculateCgpa(entries, scale);
	}

	const yearNodes = years.map((year) => {
		const cgpa = yearCgpa(byYear.get(year) ?? []);
		return { year, cgpa, onTrack: (cgpa ?? 0) >= FIRST_CLASS_THRESHOLD };
	});

	const overallEntries: CourseEntry[] = rows
		.filter((r) => r.grade)
		.map((r) => ({ id: String(r.id), name: r.courses?.name ?? '', creditUnits: DEFAULT_CREDIT_UNITS, grade: r.grade! }));
	const overallCgpa = calculateCgpa(overallEntries, scale);
	const gap = overallCgpa !== null ? Math.max(0, FIRST_CLASS_THRESHOLD - overallCgpa) : null;

	const nodeSpacing = 160;
	const svgWidth = Math.max(500, (yearNodes.length + 1) * nodeSpacing + 40);
	const svgHeight = 180;
	const nodeY = 90;
	const targetCx = 40 + yearNodes.length * nodeSpacing;
</script>

<div class="wrap">
	<h1 class="page-title">Path to First Class</h1>
	<p class="page-intro">Your year-by-year trajectory toward a First Class CGPA (4.50+ on the NUC 5.0 scale).</p>

	{#if overallCgpa !== null}
		<div class="summary-row">
			<div class="summary-item">
				<span class="summary-label">Current CGPA</span>
				<span class="summary-value">{overallCgpa.toFixed(2)}</span>
			</div>
			{#if gap !== null && gap > 0}
				<div class="summary-item">
					<span class="summary-label">Gap to First Class</span>
					<span class="summary-value gap">{gap.toFixed(2)}</span>
				</div>
			{:else}
				<div class="summary-item">
					<span class="summary-label">Status</span>
					<span class="summary-value on-track">On track for First Class</span>
				</div>
			{/if}
		</div>
	{/if}

	<div class="svg-scroll">
		<svg viewBox="0 0 {svgWidth} {svgHeight}" width={svgWidth} height={svgHeight}>
			<line
				x1="40"
				y1={nodeY}
				x2={40 + yearNodes.length * nodeSpacing}
				y2={nodeY}
				stroke="var(--border-2)"
				stroke-width="2"
			/>

			{#each yearNodes as node, i}
				{@const cx = 40 + i * nodeSpacing}
				<circle
					cx={cx}
					cy={nodeY}
					r="28"
					fill={node.onTrack ? 'var(--green-dim)' : 'var(--accent-dim)'}
					stroke={node.onTrack ? 'var(--green)' : 'var(--accent)'}
					stroke-width="2"
				/>
				<text x={cx} y={nodeY - 5} text-anchor="middle" font-family="var(--font-display)" font-size="13" font-weight="700" fill="var(--text)">
					Y{node.year}
				</text>
				<text x={cx} y={nodeY + 12} text-anchor="middle" font-family="var(--font-mono)" font-size="11" fill="var(--muted)">
					{node.cgpa !== null ? node.cgpa.toFixed(2) : '—'}
				</text>
				<text x={cx} y={nodeY + 50} text-anchor="middle" font-family="var(--font-sans)" font-size="11" fill="var(--muted)">
					Year {node.year}
				</text>
			{/each}

			<circle
				cx={targetCx}
				cy={nodeY}
				r="32"
				fill={overallCgpa !== null && overallCgpa >= FIRST_CLASS_THRESHOLD ? 'var(--green-dim)' : 'var(--surface-2)'}
				stroke="var(--accent)"
				stroke-width="2.5"
				stroke-dasharray={overallCgpa !== null && overallCgpa >= FIRST_CLASS_THRESHOLD ? 'none' : '4,3'}
			/>
			<text x={targetCx} y={nodeY - 3} text-anchor="middle" font-family="var(--font-display)" font-size="12" font-weight="700" fill="var(--accent)">
				4.50+
			</text>
			<text x={targetCx} y={nodeY + 52} text-anchor="middle" font-family="var(--font-sans)" font-size="11" fill="var(--muted)">
				First Class
			</text>
		</svg>
	</div>

	{#if years.length === 0}
		<p class="empty-state">No graded courses yet — your path will appear here as you add and grade courses.</p>
	{/if}

	<p class="schema-note">
		Note: course credit units aren't tracked yet, so every course above counts as {DEFAULT_CREDIT_UNITS}
		units for this projection — treat it as directional until real credit-unit data is added.
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
		margin-bottom: 0.4rem;
	}

	.page-intro {
		color: var(--muted);
		margin-bottom: 1.5rem;
	}

	.summary-row {
		display: flex;
		gap: 1.5rem;
		margin-bottom: 2rem;
	}

	.summary-item {
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
		font-size: 1.4rem;
		font-weight: 700;
	}

	.summary-value.gap {
		color: var(--accent);
	}

	.summary-value.on-track {
		color: var(--green);
		font-size: 1rem;
	}

	.svg-scroll {
		overflow-x: auto;
		margin-bottom: 1.5rem;
	}

	.empty-state {
		color: var(--muted);
		text-align: center;
		padding: 2rem 0;
	}

	.schema-note {
		font-size: 0.78rem;
		color: var(--muted);
		background: var(--surface-2);
		border: 1px solid var(--border-2);
		border-radius: var(--radius-md);
		padding: 0.75rem 1rem;
	}
</style>
