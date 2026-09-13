<script context="module" lang="ts">
	export type ExamQuestion = {
		id: number;
		course_id: number;
		prompt: string;
		options: { id: string; text: string }[];
		correct_option_id: string;
		explanation: string | null;
	};

	export type ExamAnswer = {
		question_id: number;
		selected_option_id: string | null; // null = skipped
		time_taken_ms: number;
		confidence_rating: number | null;
	};
</script>

<script lang="ts">
	import { createEventDispatcher, onMount, onDestroy } from 'svelte';
	import { beforeNavigate } from '$app/navigation';
	import { examActive } from '$lib/stores/examActive';

	/**
	 * Functionally ported from grantapp-shell's QuizShell.svelte --
	 * doctrine Clause 1 ("inherits UTME's 100-day-mastery flow shape...
	 * not built fresh"), same proven interaction model (practice/exam
	 * modes, confidence rating, skip, local-first batched writes,
	 * leave-confirmation guards). Renamed course label field (subject ->
	 * courseLabel) and question type (keystone_questions' shape has no
	 * topic/subtopic).
	 *
	 * The one genuinely new piece, not in the UTME source: answer
	 * feedback uses EXPERIENCE_CONTEXT.md §3's glow-pulse language
	 * (`.answer-option.correct` / `.answer-option.incorrect`, from
	 * glow-shimmer-motion.css (root src/, not lib/ -- integrated there
	 * by the merge-strategy patch execution) instead of UTME's flat
	 * static color-swap -- doctrine item 14 names this the single
	 * highest-value animation moment on the highest-value screen in
	 * the app, so it gets the real treatment, not a placeholder.
	 */
	export let courseLabel: string = '';
	export let questions: ExamQuestion[] = [];
	export let mode: 'practice' | 'exam' = 'practice';
	export let onAnswer: ((answer: ExamAnswer) => void | Promise<void>) | null = null;
	export let onComplete: (answers: ExamAnswer[]) => void | Promise<void>;

	const dispatch = createEventDispatcher<{ answered: ExamAnswer }>();

	let index = 0;
	let selectedOptionId: string | null = null;
	let confidenceRating: number | null = null;
	let revealed = false;
	let questionShownAt = Date.now();
	let submitting = false;
	let finished = false;
	const answers: ExamAnswer[] = [];

	// EXPERIENCE_CONTEXT.md §4 item 11: shimmer only on route transition
	// into a test, fixed duration, never gated on real data (questions
	// are already in memory via the `questions` prop by the time this
	// mounts -- there is no fetch for this to represent). Runs once,
	// on mount, then never again for the rest of the session -- moving
	// between questions afterward is NOT a "route transition" per the
	// doctrine's own restraint principle (item 12: never on
	// already-settled content).
	let showEntryShimmer = true;
	onMount(() => {
		const timer = setTimeout(() => (showEntryShimmer = false), 300);
		return () => clearTimeout(timer);
	});

	$: currentQuestion = questions[index];
	$: isLastQuestion = index === questions.length - 1;
	$: progressPct = questions.length > 0 ? Math.round((index / questions.length) * 100) : 0;

	onMount(() => examActive.set(true));
	onDestroy(() => examActive.set(false));

	beforeNavigate((navigation) => {
		if (finished) return;
		if (typeof window === 'undefined') return;
		const confirmed = window.confirm(
			'Leave this session? Your answers so far will be lost -- they only save once you finish.'
		);
		if (!confirmed) navigation.cancel();
	});

	function handleBeforeUnload(event: BeforeUnloadEvent) {
		if (finished) return;
		event.preventDefault();
		event.returnValue = '';
	}

	onMount(() => {
		window.addEventListener('beforeunload', handleBeforeUnload);
		return () => window.removeEventListener('beforeunload', handleBeforeUnload);
	});

	function resetForQuestion() {
		selectedOptionId = null;
		confidenceRating = null;
		revealed = false;
		questionShownAt = Date.now();
	}

	async function commitAnswer(optionId: string | null) {
		if (submitting) return;
		submitting = true;

		const answer: ExamAnswer = {
			question_id: currentQuestion.id,
			selected_option_id: optionId,
			time_taken_ms: Date.now() - questionShownAt,
			confidence_rating: confidenceRating
		};

		answers.push(answer);
		dispatch('answered', answer);
		if (onAnswer) await onAnswer(answer);

		if (mode === 'practice') {
			selectedOptionId = optionId;
			revealed = true;
			submitting = false;
			return;
		}

		await advance();
		submitting = false;
	}

	async function advance() {
		if (isLastQuestion) {
			finished = true;
			await onComplete(answers);
			return;
		}
		index += 1;
		resetForQuestion();
	}

	function selectOption(optionId: string) {
		if (mode === 'practice' && revealed) return;
		if (mode === 'exam') {
			selectedOptionId = optionId;
			return;
		}
		commitAnswer(optionId);
	}

	function confirmExamAnswer() {
		commitAnswer(selectedOptionId);
	}

	function skip() {
		commitAnswer(null);
	}
</script>

{#if !currentQuestion}
	<div class="exam-shell">
		<p class="placeholder">No questions available.</p>
	</div>
{:else}
	<div class="exam-shell shimmer-flourish" class:shimmer-active={showEntryShimmer}>
		<div class="exam-header">
			<span class="section-title">{courseLabel}</span>
			<span class="exam-progress-label">{index + 1} / {questions.length}</span>
		</div>

		<div class="progress-track">
			<div class="progress-fill" style="width: {progressPct}%"></div>
		</div>

		<div class="exam-content">
			<p class="prompt">{currentQuestion.prompt}</p>

			<div class="options" role="radiogroup" aria-label="Answer options">
				{#each currentQuestion.options as option}
					{@const isSelected = selectedOptionId === option.id}
					{@const isCorrectOption = revealed && option.id === currentQuestion.correct_option_id}
					{@const isWrongPick = revealed && isSelected && option.id !== currentQuestion.correct_option_id}
					<button
						type="button"
						class="answer-option"
						class:selected={isSelected && !revealed}
						class:correct={isCorrectOption}
						class:incorrect={isWrongPick}
						disabled={mode === 'practice' && revealed}
						on:click={() => selectOption(option.id)}
					>
						{option.text}
					</button>
				{/each}
			</div>

			{#if !revealed}
				<div class="confidence-row">
					<span class="confidence-label">Confidence</span>
					{#each [1, 2, 3, 4, 5] as rating}
						<button
							type="button"
							class="confidence-dot"
							class:active={confidenceRating === rating}
							aria-label={`Confidence ${rating} of 5`}
							on:click={() => (confidenceRating = rating)}
						>
							{rating}
						</button>
					{/each}
				</div>
			{/if}

			{#if revealed && currentQuestion.explanation}
				<p class="explanation">{currentQuestion.explanation}</p>
			{/if}

			<div class="actions">
				{#if mode === 'exam'}
					<button class="btn btn-secondary event-card" on:click={skip} disabled={submitting}>
						Skip
					</button>
					<button
						class="btn btn-primary event-card"
						on:click={confirmExamAnswer}
						disabled={submitting || !selectedOptionId}
					>
						{isLastQuestion ? 'Finish' : 'Next'}
					</button>
				{:else if !revealed}
					<button class="btn btn-secondary event-card" on:click={skip} disabled={submitting}>
						Skip
					</button>
				{:else}
					<button class="btn btn-primary event-card" on:click={advance} disabled={submitting}>
						{isLastQuestion ? 'Finish' : 'Next'}
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.exam-shell {
		padding: 1.75rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-card);
	}

	.exam-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
	}

	.section-title {
		font-family: var(--font-display);
		font-weight: 600;
	}

	.exam-progress-label {
		font-family: var(--font-mono);
		font-size: 0.78rem;
		color: var(--muted);
	}

	.progress-track {
		height: 4px;
		border-radius: 999px;
		background: var(--surface-2);
		overflow: hidden;
		margin-bottom: 1.5rem;
	}

	.progress-fill {
		height: 100%;
		background: var(--accent);
		border-radius: 999px;
		transition: width 0.2s ease;
	}

	.exam-content {
		min-height: 200px;
	}

	.prompt {
		font-size: 1.05rem;
		line-height: 1.5;
		margin: 0 0 1.25rem;
	}

	.options {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	/* .answer-option is the interactive element; EXPERIENCE_CONTEXT.md's
	   glow-shimmer-motion.css supplies .correct/.incorrect's animated
	   glow-pulse keyframes (doctrine §3 item 14) -- only the base/
	   hover/selected states are defined here, not duplicated from
	   that stylesheet. */
	.answer-option {
		text-align: left;
		padding: 0.75rem 1rem;
		border-radius: var(--radius-md);
		background: var(--surface-2);
		border: 1px solid var(--border-2);
		color: var(--text);
		font-size: 0.9rem;
		cursor: pointer;
		transition: border-color 0.15s ease, background-color 0.12s ease;
	}

	.answer-option:hover:not(:disabled) {
		border-color: var(--accent);
	}

	.answer-option:active:not(:disabled) {
		background-color: var(--accent-dim);
	}

	.answer-option:disabled {
		cursor: default;
	}

	.answer-option.selected {
		border-color: var(--accent);
		background: var(--accent-dim);
	}

	.confidence-row {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin-bottom: 1.25rem;
	}

	.confidence-label {
		font-size: 0.78rem;
		color: var(--muted);
		margin-right: 0.4rem;
	}

	.confidence-dot {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: var(--surface-2);
		border: 1px solid var(--border-2);
		color: var(--muted);
		font-family: var(--font-mono);
		font-size: 0.75rem;
		cursor: pointer;
	}

	.confidence-dot.active {
		background: var(--accent);
		border-color: var(--accent);
		color: #000;
		font-weight: 700;
	}

	.explanation {
		font-size: 0.85rem;
		line-height: 1.5;
		color: var(--muted);
		background: var(--surface-2);
		border-radius: var(--radius-md);
		padding: 0.85rem 1rem;
		margin-bottom: 1.25rem;
	}

	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.6rem;
	}

	.placeholder {
		color: var(--muted);
		font-style: italic;
		font-size: 0.9rem;
		text-align: center;
		padding: 2rem 0;
	}
</style>
