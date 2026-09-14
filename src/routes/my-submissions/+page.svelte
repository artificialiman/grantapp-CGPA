<script lang="ts">
	import type { PageData } from './$types';
	export let data: PageData;

	type Submission = {
		id: number;
		notes_text: string | null;
		status: string;
		detected_course_ids: number[];
		created_at: string;
		courses: { id: number; name: string; code: string | null } | null;
	};

	const submissions = data.submissions as unknown as Submission[];

	function statusLabel(status: string): string {
		if (status === 'processed') return 'Processed';
		if (status === 'rejected') return 'Not usable';
		return 'Pending review';
	}

	function statusBadgeClass(status: string): string {
		if (status === 'processed') return 'live';
		if (status === 'rejected') return 'soon';
		return 'pending';
	}
</script>

<div class="wrap">
	<h1 class="page-title">My Submissions</h1>
	<p class="page-intro">Everything you've sent in via Upload Course Material.</p>

	<a href="/upload-course-material" class="btn btn-secondary new-submission-link">+ New submission</a>

	{#each submissions as sub}
		<div class="submission-card">
			<div class="submission-header">
				<span class="badge {statusBadgeClass(sub.status)}">{statusLabel(sub.status)}</span>
				<span class="submission-date">{new Date(sub.created_at).toLocaleDateString()}</span>
			</div>

			{#if sub.courses}
				<div class="submission-course">For: {sub.courses.name}{sub.courses.code ? ` (${sub.courses.code})` : ''}</div>
			{/if}

			{#if sub.notes_text}
				<p class="submission-notes">{sub.notes_text}</p>
			{/if}

			{#if sub.detected_course_ids.length > 0}
				<div class="detected-courses">
					<span class="detected-label">Detected in your text:</span>
					{#each sub.detected_course_ids as id}
						<span class="detected-tag">{data.detectedCourseNames[id] ?? `Course ${id}`}</span>
					{/each}
				</div>
			{/if}
		</div>
	{/each}

	{#if submissions.length === 0}
		<p class="empty-state">No submissions yet. <a href="/upload-course-material">Send your first one</a>.</p>
	{/if}
</div>

<style>
	.wrap {
		max-width: 700px;
		margin: 0 auto;
		padding: 2rem;
	}

	.page-title {
		font-size: clamp(1.75rem, 4vw, 2.25rem);
		letter-spacing: -0.03em;
		margin-bottom: 0.4rem;
	}

	.page-intro {
		color: var(--muted);
		margin-bottom: 1.25rem;
	}

	.new-submission-link {
		margin-bottom: 1.5rem;
	}

	.submission-card {
		padding: 1.25rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-card);
		margin-bottom: 0.75rem;
	}

	.submission-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.5rem;
	}

	.submission-date {
		font-size: 0.75rem;
		color: var(--muted);
	}

	.submission-course {
		font-weight: 600;
		font-size: 0.9rem;
		margin-bottom: 0.3rem;
	}

	.submission-notes {
		font-size: 0.85rem;
		color: var(--muted);
		white-space: pre-wrap;
	}

	.detected-courses {
		margin-top: 0.6rem;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem;
	}

	.detected-label {
		font-size: 0.7rem;
		color: var(--muted);
	}

	.detected-tag {
		font-size: 0.72rem;
		background: var(--accent-dim);
		color: var(--accent);
		padding: 0.15rem 0.5rem;
		border-radius: var(--radius-sm);
	}

	.empty-state {
		color: var(--muted);
		text-align: center;
		padding: 3rem 0;
	}
</style>
