<script lang="ts">
	/**
	 * Doctrine: "CGPA converter — against a target/partner school's
	 * scale or a global standard." The 5.0-to-4.0 conversion below is
	 * an INTERPOLATED ESTIMATE built from the classification-band
	 * midpoint mapping multiple independent sources agree on — not an
	 * official WES/evaluator table, which this app has no access to
	 * and shouldn't pretend to reproduce. Labeled as a planning
	 * estimate throughout.
	 */
	let nigerianCgpa = 4.5;

	const anchors: [number, number][] = [
		[0, 0],
		[1.0, 1.0],
		[1.5, 1.5],
		[2.4, 2.0],
		[3.5, 2.8],
		[4.49, 3.5],
		[4.5, 3.7],
		[5.0, 4.0]
	];

	function interpolate(cgpa: number): number {
		const clamped = Math.max(0, Math.min(5, cgpa));
		for (let i = 0; i < anchors.length - 1; i++) {
			const [x0, y0] = anchors[i];
			const [x1, y1] = anchors[i + 1];
			if (clamped >= x0 && clamped <= x1) {
				if (x1 === x0) return y0;
				const t = (clamped - x0) / (x1 - x0);
				return y0 + t * (y1 - y0);
			}
		}
		return anchors[anchors.length - 1][1];
	}

	$: usGpaEstimate = interpolate(nigerianCgpa);
</script>

<div class="wrap">
	<h1 class="page-title">CGPA Converter</h1>
	<p class="page-intro">Nigerian 5.0-scale CGPA to an estimated US 4.0 GPA.</p>

	<div class="form-group">
		<label for="cgpa">Your CGPA (out of 5.0)</label>
		<input id="cgpa" type="number" min="0" max="5" step="0.01" bind:value={nigerianCgpa} />
	</div>

	<div class="result-card">
		<div class="result-gpa">{usGpaEstimate.toFixed(2)} <span class="result-max">/ 4.0</span></div>
		<p class="result-note">
			Estimated only — not an official WES or institutional evaluation. Admissions offices and
			evaluators apply their own course-by-course rules; use this for planning, not for a formal
			application.
		</p>
	</div>
</div>

<style>
	.wrap {
		max-width: 600px;
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

	.result-card {
		padding: 1.5rem;
		background: var(--surface);
		border: 1px solid var(--accent);
		border-radius: var(--radius-card);
		text-align: center;
	}

	.result-gpa {
		font-family: var(--font-display);
		font-size: 2.5rem;
		font-weight: 800;
		color: var(--accent);
	}

	.result-max {
		font-size: 1.2rem;
		color: var(--muted);
	}

	.result-note {
		margin-top: 0.75rem;
		font-size: 0.78rem;
		color: var(--muted);
	}
</style>
