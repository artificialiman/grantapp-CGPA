<script lang="ts">
	// Fill in the blanks of a table (properties) or of lines of text. The student's entries are
	// reported upward on every keystroke, so nothing typed is lost when they move on.
	import { createEventDispatcher } from 'svelte';
	import type { FillQuestion, WrittenAnswer } from '$lib/offline/types';
	import { blankKey, isBlank } from '$lib/offline/written';

	export let q: FillQuestion;
	export let answer: WrittenAnswer | undefined = undefined;

	const dispatch = createEventDispatcher<{ change: WrittenAnswer }>();

	function set(key: string, value: string) {
		dispatch('change', { ...answer, fills: { ...(answer?.fills ?? {}), [key]: value } });
	}
	function onInput(key: string, e: Event) {
		set(key, (e.currentTarget as HTMLInputElement).value);
	}
</script>

<p class="prompt">{q.prompt}</p>
<p class="hint">Type into the empty boxes. Leave a box empty if you do not know it.</p>

{#if q.columns && q.columns.length > 0}
	<div class="scroll">
		<table>
			<thead>
				<tr>{#each q.columns as col}<th scope="col">{col}</th>{/each}</tr>
			</thead>
			<tbody>
				{#each q.rows as row, r}
					<tr>
						{#each row as cell, c}
							<td>
								{#if isBlank(cell)}
									<input
										type="text"
										autocomplete="off"
										autocapitalize="none"
										spellcheck="false"
										aria-label="Row {r + 1}, {q.columns[c] ?? `column ${c + 1}`}"
										value={answer?.fills?.[blankKey(r, c)] ?? ''}
										on:input={(e) => onInput(blankKey(r, c), e)}
									/>
								{:else}
									{cell.text}
								{/if}
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{:else}
	<div class="lines">
		{#each q.rows as row, r}
			<p>
				{#each row as cell, c}
					{#if isBlank(cell)}
						<input
							class="inline"
							type="text"
							autocomplete="off"
							autocapitalize="none"
							spellcheck="false"
							aria-label="Blank {r + 1}.{c + 1}"
							value={answer?.fills?.[blankKey(r, c)] ?? ''}
							on:input={(e) => onInput(blankKey(r, c), e)}
						/>
					{:else}
						{cell.text}
					{/if}
				{/each}
			</p>
		{/each}
	</div>
{/if}

<style>
	.prompt {
		font-size: 1.05rem;
		line-height: 1.5;
		margin-bottom: 0.5rem;
	}
	.hint {
		color: var(--muted);
		font-size: 0.82rem;
		margin: 0 0 1rem;
	}
	.scroll {
		overflow-x: auto;
		margin-bottom: 1.5rem;
		-webkit-overflow-scrolling: touch;
	}
	table {
		border-collapse: collapse;
		width: 100%;
		min-width: 18rem;
	}
	th,
	td {
		border: 1px solid var(--border-2);
		padding: 0.5rem 0.6rem;
		text-align: left;
		vertical-align: middle;
		font-size: 0.92rem;
	}
	th {
		background: var(--surface);
		font-family: var(--font-mono);
		font-size: 0.72rem;
		text-transform: uppercase;
		color: var(--muted);
	}
	input {
		width: 100%;
		box-sizing: border-box;
		padding: 0.5rem 0.6rem;
		border-radius: var(--radius-md);
		border: 1px solid var(--accent);
		background: var(--surface);
		color: var(--text);
		font: inherit;
		min-width: 6rem;
	}
	.lines {
		margin-bottom: 1.5rem;
	}
	.lines p {
		line-height: 2.3;
		margin: 0 0 0.5rem;
	}
	input.inline {
		display: inline-block;
		width: 9rem;
		padding: 0.25rem 0.5rem;
	}
</style>
