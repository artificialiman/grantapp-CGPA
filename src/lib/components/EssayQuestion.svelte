<script lang="ts">
	// An essay or article question: a writing box with a live word count. The draft is reported
	// upward on every keystroke. The word limit is a guide, never a block.
	import { createEventDispatcher } from 'svelte';
	import type { EssayQuestion, WrittenAnswer } from '$lib/offline/types';
	import { wordCount } from '$lib/offline/written';

	export let q: EssayQuestion;
	export let answer: WrittenAnswer | undefined = undefined;

	const dispatch = createEventDispatcher<{ change: WrittenAnswer }>();

	$: text = answer?.text ?? '';
	$: words = wordCount(text);
	$: over = q.word_limit != null && words > q.word_limit;
	$: countText = `${words} ${words === 1 ? 'word' : 'words'}${q.word_limit ? ` of ${q.word_limit}` : ''}${over ? ' — over the guide' : ''}`;

	function onInput(e: Event) {
		dispatch('change', { ...answer, text: (e.currentTarget as HTMLTextAreaElement).value });
	}
</script>

<p class="prompt">{q.prompt}</p>
<p class="hint">
	Worth {q.marks} {q.marks === 1 ? 'mark' : 'marks'}.
	{#if q.word_limit}Aim for no more than {q.word_limit} words.{/if}
	Write in your own words. You will see a model answer and the points to cover after the test.
</p>
<textarea
	rows="10"
	value={text}
	on:input={onInput}
	aria-label="Your answer"
	placeholder="Write your answer here…"
></textarea>
<p class="count" class:over>{countText}</p>

<style>
	.prompt {
		font-size: 1.05rem;
		line-height: 1.5;
		margin-bottom: 0.5rem;
	}
	.hint {
		color: var(--muted);
		font-size: 0.82rem;
		line-height: 1.5;
		margin: 0 0 0.75rem;
	}
	textarea {
		width: 100%;
		box-sizing: border-box;
		padding: 0.75rem 0.85rem;
		border-radius: var(--radius-md);
		border: 1px solid var(--border-2);
		background: var(--surface);
		color: var(--text);
		font: inherit;
		line-height: 1.55;
		resize: vertical;
	}
	textarea:focus {
		border-color: var(--accent);
		outline: none;
	}
	.count {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--muted);
		margin: 0.4rem 0 1.5rem;
	}
	.count.over {
		color: var(--red);
	}
</style>
