<script lang="ts">
	import { onMount } from 'svelte';
	import ExamShell, {
		type ExamQuestion,
		type ExamAnswer,
		type AnswerCheckResult
	} from '$lib/components/ExamShell.svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	async function checkAnswer(questionId: number, selectedOptionId: string | null): Promise<AnswerCheckResult> {
		const res = await fetch('/api/check-mastery-answer', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ question_id: questionId, selected_option_id: selectedOptionId })
		});
		if (!res.ok) {
			throw new Error('Failed to check answer');
		}
		return res.json();
	}

	// State machine ported from grantapp-shell's daily-100/+page.svelte --
	// doctrine Clause 1. No 'config'/picker phase: unlike UTME's daily-100
	// (subject chosen on the page itself), the course here is already
	// fixed by the route, so the session starts loading immediately on
	// mount instead of waiting for a click.
	let phase: 'loading' | 'gate-pending' | 'running' | 'set-complete' | 'session-complete' | 'error' =
		'loading';
	let errorMessage = '';
	let questions: ExamQuestion[] = [];
	let masteryAssignmentId: number | null = null;
	let currentSet = 1;
	let lastSetScore = 0;
	let totalScoreToday = 0;

	async function loadSet() {
		phase = 'loading';
		errorMessage = '';

		try {
			const res = await fetch(`/api/mastery-set?course_id=${data.courseId}`);
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.message ?? `Failed to load today's set (${res.status})`);
			}
			const body = await res.json();

			masteryAssignmentId = body.mastery_assignment_id ?? masteryAssignmentId;
			currentSet = body.current_set ?? currentSet;

			if (body.gate_pending) {
				phase = 'gate-pending';
				return;
			}

			questions = body.questions;

			if (questions.length === 0) {
				phase = 'session-complete';
				return;
			}
			phase = 'running';
		} catch (e) {
			errorMessage = e instanceof Error ? e.message : "Failed to load today's set";
			phase = 'error';
		}
	}

	async function handleSetComplete(answers: ExamAnswer[]) {
		if (!masteryAssignmentId) return;
		phase = 'loading';

		try {
			const res = await fetch('/api/submit-mastery-set', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					mastery_assignment_id: masteryAssignmentId,
					course_id: data.courseId,
					set_number: currentSet,
					answers
				})
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.message ?? `Failed to submit set (${res.status})`);
			}
			const result = await res.json();
			lastSetScore = result.set_score;
			totalScoreToday += result.set_score;

			if (result.session_complete) {
				phase = 'session-complete';
				return;
			}

			currentSet = result.next_set;
			phase = 'set-complete';
		} catch (e) {
			errorMessage = e instanceof Error ? e.message : 'Failed to submit set';
			phase = 'error';
		}
	}

	function continueToNextSet() {
		loadSet();
	}

	onMount(loadSet);
</script>

<div class="wrap">
	<div class="breadcrumb">
		<a href="/faculties/{data.facultySlug}/{data.deptSlug}/{data.courseId}">{data.courseCode}</a>
		<span class="sep">/</span><span class="current">100-day Mastery</span>
	</div>

	{#if phase === 'loading'}
		<p class="status-text">Building your set…</p>
	{:else if phase === 'gate-pending'}
		<p class="status-text">Working out what to focus on next…</p>
	{:else if phase === 'running'}
		<div class="progress-note">Set {currentSet} of 5 — {data.courseName}</div>
		<ExamShell
			courseLabel={data.courseName}
			{questions}
			mode="practice"
			{checkAnswer}
			onComplete={handleSetComplete}
		/>
	{:else if phase === 'set-complete'}
		<h1 class="page-title">Set {currentSet - 1} done</h1>
		<p class="page-intro">
			{lastSetScore} marks this set · {totalScoreToday} total today for {data.courseName}.
		</p>
		<button class="btn btn-primary" on:click={continueToNextSet}>Continue to set {currentSet}</button>
	{:else if phase === 'session-complete'}
		<h1 class="page-title">All 5 sets done</h1>
		<p class="page-intro">
			{totalScoreToday} total marks today for {data.courseName}. Come back tomorrow to keep going.
		</p>
		<a href="/faculties/{data.facultySlug}/{data.deptSlug}/{data.courseId}" class="btn btn-secondary">
			Back to course
		</a>
	{:else if phase === 'error'}
		<p class="status-text error-text">{errorMessage}</p>
		<button class="btn btn-secondary" on:click={loadSet}>Try again</button>
	{/if}
</div>

<style>
	.wrap {
		max-width: 900px;
		margin: 0 auto;
		padding: 2rem 2rem 5rem;
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
		margin: 1rem 0 0.4rem;
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
</style>
