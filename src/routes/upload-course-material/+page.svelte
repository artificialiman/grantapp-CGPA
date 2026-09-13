<script lang="ts">
	import { WHATSAPP_URL } from '$lib/content/contact';
	import type { PageData } from './$types';

	export let data: PageData;

	let selectedCourseId: number | '' = '';

	$: selectedCourse = data.courses.find((c) => c.id === selectedCourseId);
</script>

<div class="wrap">
	<h1 class="page-title">Upload Course Material</h1>
	<p class="page-intro">
		Send your own institution's notes or past questions and we'll turn them into a study set for
		you.
	</p>

	<div class="notice-card">
		<span class="badge live">How it works right now</span>
		<p>
			Uploads aren't processed automatically yet — message us on WhatsApp with your files and
			Tinggy will get them turned into questions and a Mastery path for your course. Mention which
			course it's for when you message.
		</p>
	</div>

	{#if data.courses.length > 0}
		<div class="form-group">
			<label for="course">Which course is this for? (optional, but helps us prioritize)</label>
			<select id="course" bind:value={selectedCourseId}>
				<option value="">Not sure / general</option>
				{#each data.courses as course}
					<option value={course.id}>{course.name}{course.code ? ` (${course.code})` : ''}</option>
				{/each}
			</select>
		</div>
	{/if}

	<a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" class="btn btn-primary whatsapp-btn">
		<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
			<path
				d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"
			/>
			<path
				d="M12.004 2C6.486 2 2 6.486 2 12.004c0 1.87.505 3.66 1.463 5.226L2 22l4.883-1.44a10.03 10.03 0 0 0 5.121 1.396h.005c5.518 0 10.004-4.487 10.004-10.005C22.013 6.486 17.527 2 12.004 2zm0 18.278h-.004a8.29 8.29 0 0 1-4.226-1.156l-.303-.18-3.145.928.938-3.07-.198-.315a8.294 8.294 0 0 1-1.276-4.435c0-4.578 3.727-8.303 8.31-8.303 2.219 0 4.305.864 5.875 2.435a8.244 8.244 0 0 1 2.433 5.876c0 4.578-3.727 8.22-8.404 8.22z"
			/>
		</svg>
		{selectedCourse ? `Message us about ${selectedCourse.name}` : 'Message us on WhatsApp'}
	</a>

	<a href="/dashboard" class="back-link">Back to dashboard</a>
</div>

<style>
	.wrap {
		max-width: 600px;
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
		margin-bottom: 1.5rem;
	}

	.notice-card {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-card);
		padding: 1.25rem;
		margin-bottom: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.notice-card p {
		font-size: 0.85rem;
		color: var(--muted);
		line-height: 1.5;
	}

	.badge {
		align-self: flex-start;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		margin-bottom: 1.5rem;
	}

	.form-group label {
		font-family: var(--font-mono);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--muted);
		font-size: 0.68rem;
	}

	.whatsapp-btn {
		width: 100%;
		justify-content: center;
		padding: 0.85rem;
		font-size: 0.95rem;
	}

	.back-link {
		display: block;
		text-align: center;
		margin-top: 1.25rem;
		font-size: 0.85rem;
		color: var(--muted);
	}
</style>
