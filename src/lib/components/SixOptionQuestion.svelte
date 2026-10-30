<script lang="ts">
	// Multiple choice with six options (a to f). While answering it behaves like the ordinary
	// question. With `reveal` it shows the right answer and, for each wrong option, the kind of
	// mistake it stands for. Not yet used by the live test.
	import { createEventDispatcher } from 'svelte';
	import type { SixOptionQuestion } from '$lib/offline/types';
	import { DISTRACTOR_LABELS, type DistractorKind } from '$lib/offline/formats';

	export let q: SixOptionQuestion;
	export let selected: string | null = null;
	export let reveal = false;

	const dispatch = createEventDispatcher<{ select: string }>();

	function kindOf(id: string) {
		const k = q.distractor_kinds?.[id] as DistractorKind | undefined;
		return k ? DISTRACTOR_LABELS[k] : null;
	}
</script>

<p class="prompt">{q.prompt}</p>
<div class="options" role="radiogroup" aria-label="Answer options">
	{#each q.options as opt}
		{@const right = reveal && opt.id === q.correct_option_id}
		{@const wrongPick = reveal && selected === opt.id && opt.id !== q.correct_option_id}
		<button
			type="button"
			role="radio"
			aria-checked={selected === opt.id}
			class="option"
			class:selected={selected === opt.id}
			class:right
			class:wrong={wrongPick}
			disabled={reveal}
			on:click={() => dispatch('select', opt.id)}
		>
			<span class="letter">{opt.id.toUpperCase()}</span>
			<span class="text">
				{opt.text}
				{#if reveal && !right}
					{@const k = kindOf(opt.id)}
					{#if k}<span class="kind">{k.name}: {k.meaning}</span>{/if}
				{/if}
			</span>
		</button>
	{/each}
</div>

<style>
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
		display: flex;
		gap: 0.75rem;
		align-items: flex-start;
		text-align: left;
		padding: 0.8rem 1rem;
		border-radius: var(--radius-md);
		background: var(--surface);
		border: 1px solid var(--border-2);
		color: var(--text);
	}
	.option.selected {
		border-color: var(--accent);
		background: var(--accent-dim);
	}
	.option.right {
		border-color: var(--accent);
	}
	.option.wrong {
		border-color: var(--red);
	}
	.letter {
		font-family: var(--font-mono);
		font-size: 0.78rem;
		color: var(--muted);
		min-width: 1.1rem;
		padding-top: 0.15rem;
	}
	.text {
		flex: 1;
		line-height: 1.45;
	}
	.kind {
		display: block;
		margin-top: 0.3rem;
		font-size: 0.8rem;
		color: var(--muted);
	}
</style>
