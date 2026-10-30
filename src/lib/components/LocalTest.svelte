<script lang="ts">
	// A test that runs entirely on the phone: questions come from a stored pack, grading uses the
	// same scoring function as the server, and the answers and explanations are shown once, after
	// the whole test (DECISIONS 2026-10-30, latest). The finished attempt is queued and sent when
	// the phone is online and signed in.
	import { onMount } from 'svelte';
	import { loadPacks, recordAttempt, syncAttempts } from '$lib/offline/sync';
	import { buildTest, gradeAnswers, type TestQuestion, type TestResult } from '$lib/offline/session';
	import { scoreAnswer } from '$lib/quiz/scoring';
	import type { Answer } from '$lib/offline/types';
	import { analyse, type Analytics } from '$lib/offline/analytics';
	import AnalyticsPanel from '$lib/components/AnalyticsPanel.svelte';
	import ShareResult from '$lib/components/ShareResult.svelte';
	import { courseLabelFor } from '$lib/offline/share';

	export let packKey: string;
	export let backHref: string | null = null;

	const TEST_SIZE = 20; // same length as the online Quick Test

	let phase: 'loading' | 'missing' | 'config' | 'running' | 'review' = 'loading';
	let questions: TestQuestion[] = [];
	let poolSize = 0;
	let index = 0;
	let selected: Record<string, string | null> = {};
	let startedAt = new Date();
	let result: TestResult | null = null;
	let byId: Record<string, TestQuestion> = {};
	let saved = true;
	let analytics: Analytics | null = null;
	let finishedAt = new Date();
	let courseLabel = '';

	onMount(async () => {
		try {
			const packs = await loadPacks([packKey]);
			poolSize = packs.reduce((n, p) => n + p.questions.length, 0);
			phase = poolSize > 0 ? 'config' : 'missing';
		} catch {
			phase = 'missing';
		}
	});

	async function start() {
		const packs = await loadPacks([packKey]);
		questions = buildTest(packs, { count: TEST_SIZE, seed: Date.now() });
		byId = {};
		for (const q of questions) byId[q.id] = q;
		selected = {};
		index = 0;
		startedAt = new Date();
		phase = 'running';
	}

	function choose(optionId: string) {
		selected[questions[index].id] = optionId;
		selected = { ...selected };
	}

	function skip() {
		selected[questions[index].id] = null;
		selected = { ...selected };
		advance();
	}

	function advance() {
		if (index < questions.length - 1) index += 1;
		else finish();
	}

	async function finish() {
		const answers: Answer[] = questions.map((q) => ({
			question_id: q.id,
			selected_option_id: selected[q.id] ?? null
		}));
		result = gradeAnswers(questions, answers, scoreAnswer);
		finishedAt = new Date();
		analytics = analyse(questions, result, (finishedAt.getTime() - startedAt.getTime()) / 1000);
		courseLabel = courseLabelFor(packKey);
		phase = 'review';
		try {
			await recordAttempt(packKey, startedAt, answers);
			saved = true;
			if (navigator.onLine) syncAttempts().catch(() => {});
		} catch {
			saved = false;
		}
	}

	function optionText(q: TestQuestion, id: string | null): string {
		if (id == null) return 'Skipped';
		return q.options.find((o) => o.id === id)?.text ?? id;
	}
</script>

{#if phase === 'loading'}
	<p class="status-text">Opening your saved questions…</p>
{:else if phase === 'missing'}
	<p class="status-text">
		This course is not saved on your phone yet. Connect to the internet once and open it again.
	</p>
{:else if phase === 'config'}
	<h1 class="page-title">Quick Test</h1>
	<p class="page-intro">
		{Math.min(TEST_SIZE, poolSize)} questions from this course. Works without internet. Answers and
		explanations appear after you finish.
	</p>
	<button class="btn btn-primary" on:click={start}>Start</button>
{:else if phase === 'running' && questions.length > 0}
	{@const q = questions[index]}
	<div class="progress-note">Question {index + 1} of {questions.length}</div>
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
			{index < questions.length - 1 ? 'Next' : 'Finish'}
		</button>
	</div>
{:else if phase === 'review' && result}
	<h1 class="page-title">Results</h1>
	<div class="total-score">
		<span class="total-score-num">{result.correct_count}</span>
		<span class="total-score-label">/ {result.answered_count} correct</span>
	</div>
	<p class="answered-note">{result.skipped_count} skipped</p>
	{#if !saved}
		<p class="warn-note">This result could not be saved on your phone.</p>
	{/if}
	{#if analytics}
		<AnalyticsPanel {analytics} />
		<ShareResult {questions} {result} {analytics} {courseLabel} {finishedAt} />
	{/if}
	<ol class="review">
		{#each result.results as r}
			{@const q = byId[r.question_id]}
			<li class="review-item" class:right={r.correct} class:wrong={!r.correct && !r.skipped}>
				<p class="prompt">{q.prompt}</p>
				<p class="line"><span class="tag">Your answer</span> {optionText(q, r.selected_option_id)}</p>
				{#if !r.correct}
					<p class="line"><span class="tag">Correct answer</span> {optionText(q, r.correct_option_id)}</p>
				{/if}
				<p class="why">{r.explanation}</p>
			</li>
		{/each}
	</ol>
	<div class="results-actions">
		{#if backHref}
			<a href={backHref} class="btn btn-secondary">Back</a>
		{/if}
		<button class="btn btn-primary" on:click={start}>Try another set</button>
	</div>
{/if}

<style>
	.status-text {
		color: var(--muted);
		font-size: 0.9rem;
		padding: 2rem 0;
		text-align: center;
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
	.warn-note {
		font-size: 0.85rem;
		color: var(--red);
		margin-bottom: 1rem;
	}
	.review {
		list-style: decimal inside;
		padding: 0;
		margin: 0 0 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.review-item {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		padding: 0.9rem 1rem;
	}
	.review-item.right {
		border-color: var(--accent);
	}
	.review-item.wrong {
		border-color: var(--red);
	}
	.review-item .prompt {
		display: inline;
		font-size: 0.98rem;
	}
	.line {
		font-size: 0.88rem;
		margin: 0.5rem 0 0;
	}
	.tag {
		font-family: var(--font-mono);
		font-size: 0.7rem;
		color: var(--muted);
		margin-right: 0.4rem;
		text-transform: uppercase;
	}
	.why {
		font-size: 0.85rem;
		color: var(--muted);
		line-height: 1.55;
		margin: 0.6rem 0 0;
	}
	@media (max-width: 480px) {
		.runner-actions,
		.results-actions {
			flex-direction: column;
		}
	}
</style>
