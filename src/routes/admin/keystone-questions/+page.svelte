<script lang="ts">
	import type { PageData, ActionData } from './$types';
	export let data: PageData;
	export let form: ActionData;

	type PendingQuestion = {
		id: number;
		prompt: string;
		options: { id: string; text: string }[];
		correct_option_id: string;
		explanation: string | null;
		difficulty: number | null;
		source: string;
		created_at: string;
		courses: { id: number; name: string; code: string } | null;
	};

	const pending = data.pending as unknown as PendingQuestion[];
</script>

<div class="wrap">
	<h1>Pending Keystone Questions</h1>
	<p class="sub">{pending.length} awaiting review</p>

	{#if form?.message}
		<p class="error">{form.message}</p>
	{/if}

	{#if pending.length === 0}
		<p class="empty">Nothing pending — every submitted question has been reviewed.</p>
	{:else}
		<ul class="list">
			{#each pending as q (q.id)}
				<li class="card">
					<div class="meta">
						<span class="course">{q.courses?.name ?? 'Unknown course'} ({q.courses?.code ?? '—'})</span>
						<span class="tag">{q.source}</span>
						{#if q.difficulty}<span class="tag">difficulty {q.difficulty}</span>{/if}
					</div>
					<p class="prompt">{q.prompt}</p>
					<ul class="options">
						{#each q.options as opt}
							<li class:correct={opt.id === q.correct_option_id}>
								{opt.text}
								{#if opt.id === q.correct_option_id}<span class="correct-label">correct</span>{/if}
							</li>
						{/each}
					</ul>
					{#if q.explanation}<p class="explanation">{q.explanation}</p>{/if}

					<div class="actions">
						<form method="POST" action="?/approve">
							<input type="hidden" name="id" value={q.id} />
							<button type="submit" class="btn approve">Approve</button>
						</form>
						<form method="POST" action="?/reject">
							<input type="hidden" name="id" value={q.id} />
							<button type="submit" class="btn reject">Reject</button>
						</form>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.wrap {
		max-width: 760px;
		margin: 0 auto;
		padding: 2rem;
	}
	h1 {
		font-family: var(--font-display, inherit);
		font-size: 1.75rem;
		letter-spacing: -0.02em;
	}
	.sub {
		color: var(--muted, #666);
		margin-bottom: 1.5rem;
	}
	.error {
		color: #b91c1c;
		margin-bottom: 1rem;
	}
	.empty {
		color: var(--muted, #666);
	}
	.list {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}
	.card {
		border: 1px solid var(--border, #ddd);
		border-radius: var(--radius-card, 8px);
		padding: 1.25rem;
	}
	.meta {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		margin-bottom: 0.75rem;
		font-size: 0.75rem;
	}
	.course {
		font-weight: 700;
	}
	.tag {
		background: var(--surface, #f2f2f2);
		border-radius: 4px;
		padding: 0.15rem 0.5rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--muted, #666);
	}
	.prompt {
		font-weight: 600;
		margin-bottom: 0.5rem;
	}
	.options {
		list-style: none;
		margin-bottom: 0.5rem;
	}
	.options li {
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
	}
	.options li.correct {
		background: rgba(34, 139, 34, 0.12);
		font-weight: 600;
	}
	.correct-label {
		font-size: 0.7rem;
		text-transform: uppercase;
		color: #228b22;
		margin-left: 0.4rem;
	}
	.explanation {
		font-size: 0.85rem;
		color: var(--muted, #666);
		margin-bottom: 0.75rem;
	}
	.actions {
		display: flex;
		gap: 0.5rem;
	}
	.btn {
		border: none;
		border-radius: 6px;
		padding: 0.5rem 1rem;
		font-weight: 600;
		cursor: pointer;
	}
	.btn.approve {
		background: #228b22;
		color: #fff;
	}
	.btn.reject {
		background: #b91c1c;
		color: #fff;
	}
</style>
