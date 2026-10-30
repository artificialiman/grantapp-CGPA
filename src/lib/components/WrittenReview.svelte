<script lang="ts">
	// What a fill-in or essay question shows after the test: the student's entries beside the
	// expected ones, or their essay beside the model answer and the points to cover.
	// These questions are not scored.
	import type { EssayQuestion, FillQuestion, WrittenAnswer } from '$lib/offline/types';
	import { blankKey, essayIsEmpty, fillIsEmpty, isBlank, reviewFill, wordCount } from '$lib/offline/written';

	export let q: FillQuestion | EssayQuestion;
	export let answer: WrittenAnswer | undefined = undefined;

	$: blanks = q.type === 'fill' ? reviewFill(q, answer) : [];
	$: byKey = new Map(blanks.map((b) => [b.key, b]));
	$: empty = q.type === 'fill' ? fillIsEmpty(q, answer) : essayIsEmpty(answer);
	$: matched = blanks.filter((b) => b.ok).length;
</script>

<li class="item">
	<p class="prompt">{q.prompt}</p>

	{#if q.type === 'fill'}
		<p class="status">
			{#if empty}Left empty{:else}{matched} of {blanks.length} blanks match{/if}
			<span class="flag">not scored</span>
		</p>
		{#if q.columns && q.columns.length > 0}
			<div class="scroll">
				<table>
					<thead><tr>{#each q.columns as col}<th scope="col">{col}</th>{/each}</tr></thead>
					<tbody>
						{#each q.rows as row, r}
							<tr>
								{#each row as cell, c}
									{@const b = byKey.get(blankKey(r, c))}
									<td class:ok={b?.ok} class:no={b && !b.ok}>
										{#if isBlank(cell) && b}
											<span class="given">{b.given || 'empty'}</span>
											{#if !b.ok}<span class="expected">Expected: {b.expected}</span>{/if}
										{:else if !isBlank(cell)}
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
			{#each q.rows as row, r}
				<p class="line">
					{#each row as cell, c}
						{@const b = byKey.get(blankKey(r, c))}
						{#if isBlank(cell) && b}
							<span class="chip" class:ok={b.ok} class:no={!b.ok}>{b.given || 'empty'}</span>
							{#if !b.ok}<span class="expected">(expected: {b.expected})</span>{/if}
						{:else if !isBlank(cell)}
							{cell.text}
						{/if}
					{/each}
				</p>
			{/each}
		{/if}
	{:else}
		<p class="status">
			{#if empty}Left empty{:else}{wordCount(answer?.text ?? '')} words written{/if}
			<span class="flag">not scored</span>
		</p>
		{#if !empty}
			<p class="label">Your answer</p>
			<p class="written">{answer?.text}</p>
		{/if}
		<p class="label">Points a good answer covers ({q.marks} {q.marks === 1 ? 'mark' : 'marks'})</p>
		<ul class="rubric">
			{#each q.rubric as r}
				<li>{r.point} <span class="marks">({r.marks})</span></li>
			{/each}
		</ul>
		<p class="label">Model answer</p>
		<p class="written model">{q.model_answer}</p>
	{/if}

	<p class="why">{q.explanation}</p>
</li>

<style>
	.item {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		padding: 0.9rem 1rem;
		list-style: decimal inside;
	}
	.prompt {
		display: inline;
		font-size: 0.98rem;
		line-height: 1.5;
	}
	.status {
		font-size: 0.88rem;
		margin: 0.6rem 0;
	}
	.flag {
		font-family: var(--font-mono);
		font-size: 0.68rem;
		text-transform: uppercase;
		color: var(--muted);
		margin-left: 0.5rem;
	}
	.label {
		font-family: var(--font-mono);
		font-size: 0.7rem;
		text-transform: uppercase;
		color: var(--muted);
		margin: 0.8rem 0 0.25rem;
	}
	.written {
		white-space: pre-wrap;
		font-size: 0.9rem;
		line-height: 1.55;
		margin: 0;
	}
	.model {
		color: var(--muted);
	}
	.rubric {
		margin: 0;
		padding-left: 1.1rem;
		font-size: 0.88rem;
		line-height: 1.55;
	}
	.marks {
		color: var(--muted);
	}
	.scroll {
		overflow-x: auto;
	}
	table {
		border-collapse: collapse;
		width: 100%;
	}
	th,
	td {
		border: 1px solid var(--border-2);
		padding: 0.45rem 0.55rem;
		text-align: left;
		font-size: 0.88rem;
	}
	th {
		font-family: var(--font-mono);
		font-size: 0.7rem;
		text-transform: uppercase;
		color: var(--muted);
	}
	td.ok {
		border-color: var(--accent);
	}
	td.no {
		border-color: var(--red);
	}
	.expected {
		display: block;
		color: var(--muted);
		font-size: 0.8rem;
	}
	.line {
		line-height: 2;
		margin: 0.3rem 0;
		font-size: 0.92rem;
	}
	.line .expected {
		display: inline;
	}
	.chip {
		display: inline-block;
		border: 1px solid var(--border-2);
		border-radius: var(--radius-md);
		padding: 0 0.45rem;
	}
	.chip.ok {
		border-color: var(--accent);
	}
	.chip.no {
		border-color: var(--red);
	}
	.why {
		font-size: 0.85rem;
		color: var(--muted);
		line-height: 1.55;
		margin: 0.8rem 0 0;
	}
</style>
