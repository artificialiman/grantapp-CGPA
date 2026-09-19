<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;

	// Minimal, self-contained quiz UI for this first Quick Test slice —
	// NOT the full "Quiz-UI" component (diagrams/illustrations/
	// comprehension-passage support) grantapp-shell's original scope
	// called for. A proper shared Quiz-UI component is a real follow-up
	// piece, not something this pass pretends to already be.

	type Option = { id: string; text: string };
	type Question = {
		id: number;
		prompt: string;
		options: Option[];
		// correct_option_id and explanation are deliberately NOT part of
		// this type — quick-test-session/+server.ts strips both before
		// sending questions to the client (see that file's own comment),
		// so this type reflects what actually arrives, not what the DB
		// row originally had. Grading happens entirely server-side in
		// submit-quick-test, which re-fetches these columns itself.
	};

	type ResultData = {
		answered_count: number;
		correct_count: number;
		skipped_count: number;
		total_score: number;
		is_guest: boolean;
	};

	let phase: 'config' | 'loading' | 'running' | 'submitting' | 'results' | 'error' = 'config';
	let errorMessage = '';
	let questions: Question[] = [];
	let currentIndex = 0;
	let selected: Record<number, string | null> = {};
	let result: ResultData | null = null;

	async function startSession() {
		phase = 'loading';
		errorMessage = '';
		try {
			const res = await fetch(`/api/quick-test-session?course_id=${data.courseId}&count=20`);
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.message ?? `Failed to start (${res.status})`);
			}
			const body = await res.json();
			questions = body.questions;
			currentIndex = 0;
			selected = {};
			phase = 'running';
		} catch (e) {
			errorMessage = e instanceof Error ? e.message : 'Failed to start session';
			phase = 'error';
		}
	}

	function choose(optionId: string) {
		selected[questions[currentIndex].id] = optionId;
		selected = { ...selected };
	}

	function skip() {
		selected[questions[currentIndex].id] = null;
		selected = { ...selected };
		advance();
	}

	function advance() {
		if (currentIndex < questions.length - 1) {
			currentIndex += 1;
		} else {
			submit();
		}
	}

	async function submit() {
		phase = 'submitting';
		try {
			const answers = questions.map((q) => ({
				question_id: q.id,
				selected_option_id: selected[q.id] ?? null
			}));
			const res = await fetch('/api/submit-quick-test', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ course_id: data.courseId, answers })
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.message ?? `Failed to submit (${res.status})`);
			}
			result = await res.json();
			phase = 'results';
		} catch (e) {
			errorMessage = e instanceof Error ? e.message : 'Failed to submit';
			phase = 'error';
		}
	}
</script>

<div class="wrap">
	<div class="breadcrumb">
		<a href="/faculties/{data.facultySlug}/{data.deptSlug}/{data.courseId}">Course</a>
		<span class="sep">/</span><span class="current">Quick Test</span>
	</div>

	{#if phase === 'config'}
		<h1 class="page-title">Quick Test</h1>
		<p class="page-intro">
			<!-- COPY NEEDED: real intro copy for the Quick Test config screen -->
			20 questions, one pass, no stage gates. Skip a question if you're unsure — it scores zero,
			same as a wrong answer, but doesn't teach you the wrong thing.
		</p>
		<button class="btn btn-primary" on:click={startSession}>Start</button>
	{:else if phase === 'loading'}
		<p class="status-text">Building your set…</p>
	{:else if phase === 'running' && questions.length > 0}
		{@const q = questions[currentIndex]}
		<div class="progress-note">Question {currentIndex + 1} of {questions.length}</div>
		<p class="prompt">{q.prompt}</p>
		<div class="options">
			{#each q.options as opt}
				<button
					type="button"
					class="option"
					class:selected={selected[q.id] === opt.id}
					on:click={() => choose(opt.id)}
				>
					{opt.text}
				</button>
			{/each}
		</div>
		<div class="runner-actions">
			<button class="btn btn-secondary" on:click={skip}>Skip</button>
			<button class="btn btn-primary" disabled={!selected[q.id]} on:click={advance}>
				{currentIndex < questions.length - 1 ? 'Next' : 'Finish'}
			</button>
		</div>
	{:else if phase === 'submitting'}
		<p class="status-text">Scoring…</p>
	{:else if phase === 'results' && result}
		<h1 class="page-title">Results</h1>
		<div class="total-score">
			<span class="total-score-num">{result.correct_count}</span>
			<span class="total-score-label">/ {result.answered_count} correct</span>
		</div>
		<p class="answered-note">{result.skipped_count} skipped</p>
		{#if result.is_guest}
			<!-- COPY NEEDED: real signup-nudge copy -->
			<p class="guest-note">Sign up to save this progress toward your 10,000-question target.</p>
		{/if}
		<div class="results-actions">
			<a href="/faculties/{data.facultySlug}/{data.deptSlug}/{data.courseId}" class="btn btn-secondary">
				Back to course
			</a>
			<button class="btn btn-primary" on:click={startSession}>Try another set</button>
		</div>
	{:else if phase === 'error'}
		<p class="status-text error-text">{errorMessage}</p>
		<button class="btn btn-secondary" on:click={() => (phase = 'config')}>Try again</button>
	{/if}
</div>

<style>
	.wrap {
		max-width: 700px;
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
		margin-bottom: 0.5rem;
	}

	.page-intro {
		color: var(--muted);
		margin-bottom: 1.5rem;
		line-height: 1.6;
	}

	.status-text,
	.error-text {
		color: var(--muted);
		font-size: 0.9rem;
		padding: 2rem 0;
		text-align: center;
	}

	.error-text {
		color: var(--red);
	}

	.progress-note {
		font-family: var(--font-mono);
		font-size: 0.78rem;
		color: var(--muted);
		margin-bottom: 1rem;
	}

	.prompt {
		font-size: 1.05rem;
		line-height: 1.5;
		margin-bottom: 1.25rem;
	}

	.options {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
	}

	.option {
		text-align: left;
		padding: 0.85rem 1rem;
		border-radius: var(--radius-md);
		background: var(--surface);
		border: 1px solid var(--border-2);
		color: var(--text);
	}

	.option.selected {
		border-color: var(--accent);
		background: var(--accent-dim);
	}

	.runner-actions,
	.results-actions {
		display: flex;
		gap: 0.75rem;
	}

	.total-score {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		margin: 1rem 0 0.5rem;
	}

	.total-score-num {
		font-family: var(--font-display);
		font-size: 2.5rem;
		font-weight: 700;
	}

	.total-score-label {
		color: var(--muted);
	}

	.answered-note {
		font-size: 0.78rem;
		color: var(--muted);
		margin-bottom: 1rem;
	}

	.guest-note {
		font-size: 0.85rem;
		color: var(--muted);
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		padding: 0.75rem 1rem;
		margin-bottom: 1.5rem;
	}

	@media (max-width: 480px) {
		.wrap {
			padding: 1.2rem;
		}

		.runner-actions,
		.results-actions {
			flex-direction: column;
		}
	}
</style>
