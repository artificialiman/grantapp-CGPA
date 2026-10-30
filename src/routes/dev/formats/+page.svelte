<script lang="ts">
	import SixOptionQuestion from '$lib/components/SixOptionQuestion.svelte';
	import FillQuestion from '$lib/components/FillQuestion.svelte';
	import EssayQuestion from '$lib/components/EssayQuestion.svelte';
	import WrittenReview from '$lib/components/WrittenReview.svelte';
	import { sampleEssay, sampleLines, sampleSix, sampleTable } from '$lib/dev/format-fixtures';
	import type { WrittenAnswer } from '$lib/offline/types';

	let picked: string | null = null;
	let revealed = false;
	let written: Record<string, WrittenAnswer> = {};
	let reviewing = false;

	function change(id: string, e: CustomEvent<WrittenAnswer>) {
		written = { ...written, [id]: e.detail };
	}
</script>

<div class="wrap">
	<h1>Question formats (preview)</h1>
	<p class="note">Development only. These interfaces are not in the live test.</p>

	<section>
		<h2>Six options</h2>
		<SixOptionQuestion q={sampleSix} selected={picked} reveal={revealed} on:select={(e) => (picked = e.detail)} />
		<button class="btn btn-secondary" on:click={() => (revealed = !revealed)}>{revealed ? 'Hide' : 'Show'} the answer</button>
	</section>

	<section>
		<h2>Fill in: table</h2>
		<FillQuestion q={sampleTable} answer={written[sampleTable.id]} on:change={(e) => change(sampleTable.id, e)} />
	</section>

	<section>
		<h2>Fill in: lines</h2>
		<FillQuestion q={sampleLines} answer={written[sampleLines.id]} on:change={(e) => change(sampleLines.id, e)} />
	</section>

	<section>
		<h2>Essay</h2>
		<EssayQuestion q={sampleEssay} answer={written[sampleEssay.id]} on:change={(e) => change(sampleEssay.id, e)} />
	</section>

	<section>
		<h2>After the test</h2>
		<button class="btn btn-primary" on:click={() => (reviewing = !reviewing)}>{reviewing ? 'Hide' : 'Show'} the review</button>
		{#if reviewing}
			<ol class="review">
				<WrittenReview q={sampleTable} answer={written[sampleTable.id]} />
				<WrittenReview q={sampleLines} answer={written[sampleLines.id]} />
				<WrittenReview q={sampleEssay} answer={written[sampleEssay.id]} />
			</ol>
		{/if}
	</section>
</div>

<style>
	.wrap {
		max-width: 40rem;
		margin: 0 auto;
		padding: 1.5rem 1rem 4rem;
	}
	h1 {
		font-size: 1.6rem;
		margin-bottom: 0.25rem;
	}
	h2 {
		font-size: 1.05rem;
		margin: 0 0 0.75rem;
	}
	.note {
		color: var(--muted);
		font-size: 0.85rem;
		margin-bottom: 1.5rem;
	}
	section {
		margin-bottom: 2.5rem;
		padding-top: 1rem;
		border-top: 1px solid var(--border);
	}
	.review {
		list-style: none;
		padding: 0;
		margin: 1rem 0 0;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
</style>
