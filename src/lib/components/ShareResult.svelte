<script lang="ts">
	// Lets a student name their score-and-feedback file (their name and department) and send it
	// to the WhatsApp group. Every outcome is shown on screen: nothing here fails silently.
	import { onMount } from 'svelte';
	import { WHATSAPP_URL } from '$lib/content/contact';
	import { getDepartment } from '$lib/catalog';
	import { PROGRAMME_COOKIE } from '$lib/auth/freeze';
	import type { PackQuestion } from '$lib/offline/types';
	import type { TestResult } from '$lib/offline/session';
	import type { Analytics } from '$lib/offline/analytics';
	import {
		browserDeps,
		buildReport,
		buildSummary,
		cleanField,
		deliverReport,
		reportFileName,
		type ShareOutcome
	} from '$lib/offline/share';

	export let questions: PackQuestion[];
	export let result: TestResult;
	export let analytics: Analytics;
	export let courseLabel: string;
	export let finishedAt: Date;

	const STORE_KEY = 'cgpa_share_identity';

	let studentName = '';
	let department = '';
	let busy = false;
	let outcome: ShareOutcome | null = null;
	let problem = '';

	$: fileName = reportFileName({ name: studentName, department, course: courseLabel, date: finishedAt });

	onMount(() => {
		// What the student typed last time, then the programme picked at onboarding.
		try {
			const saved = JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null');
			if (saved && typeof saved.name === 'string') studentName = saved.name;
			if (saved && typeof saved.department === 'string') department = saved.department;
		} catch {
			// Storage blocked or unreadable: the fields simply start empty.
		}
		if (!department) {
			try {
				const raw = document.cookie.split('; ').find((c) => c.startsWith(`${PROGRAMME_COOKIE}=`));
				const [faculty, dept] = decodeURIComponent(raw?.split('=')[1] ?? '').split('/');
				const found = faculty && dept ? getDepartment(faculty, dept) : undefined;
				if (found) department = found.department.name;
			} catch {
				// No programme cookie: the student types the department.
			}
		}
	});

	async function send() {
		problem = '';
		outcome = null;
		const name = cleanField(studentName);
		const dept = cleanField(department);
		if (!name) {
			problem = 'Type your name first. It goes on the file so the group can tell whose it is.';
			return;
		}
		studentName = name;
		department = dept;
		try {
			localStorage.setItem(STORE_KEY, JSON.stringify({ name, department: dept }));
		} catch {
			// Not remembered for next time. Sharing still works.
		}
		busy = true;
		try {
			const text = buildReport({ studentName: name, department: dept, courseLabel, finishedAt, analytics, questions, result });
			const summary = buildSummary({ studentName: name, department: dept, courseLabel, analytics });
			outcome = await deliverReport(browserDeps(), { name: fileName, text, summary });
		} catch (err) {
			outcome = { kind: 'failed', message: err instanceof Error ? err.message : 'Something went wrong while preparing the file.' };
		} finally {
			busy = false;
		}
	}
</script>

<section class="share" aria-label="Send your result to WhatsApp">
	<h2 class="heading">Send your result to WhatsApp</h2>
	<p class="help">
		The file holds your score, analytics and the answer and reason for every question. Put your name
		and department on it, then send it to the group.
	</p>

	<label class="field">
		<span>Your name</span>
		<input type="text" bind:value={studentName} maxlength="60" autocomplete="name" placeholder="e.g. Ada Obi" />
	</label>
	<label class="field">
		<span>Your department</span>
		<input type="text" bind:value={department} maxlength="60" placeholder="e.g. Human Medicine" />
	</label>
	<p class="file">File name: <code>{fileName}</code></p>

	<button class="btn btn-primary" type="button" on:click={send} disabled={busy}>
		{busy ? 'Preparing…' : 'Send to WhatsApp'}
	</button>

	<div role="status" aria-live="polite" class="status">
		{#if problem}
			<p class="warn">{problem}</p>
		{:else if outcome?.kind === 'shared'}
			<p class="ok">Choose WhatsApp in the list that opened, then pick the group.</p>
		{:else if outcome?.kind === 'cancelled'}
			<p class="note">Sharing was cancelled. Nothing was sent.</p>
		{:else if outcome?.kind === 'saved'}
			<p class="ok">
				{outcome.reason}
				{#if outcome.downloaded}The file was saved to your phone's downloads.{:else}The file could not be saved.{/if}
				{#if outcome.copied}A short summary was copied.{:else}The summary could not be copied.{/if}
				{#if outcome.downloaded}Open the group below and attach the file with the paperclip.{/if}
			</p>
		{:else if outcome?.kind === 'failed'}
			<p class="warn">{outcome.message} Take a screenshot of this page and send that instead.</p>
		{/if}
	</div>

	<p class="group">
		<a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">Open the WhatsApp group</a>
	</p>
</section>

<style>
	.share {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		padding: 1rem;
		margin: 0 0 1.5rem;
	}
	.heading {
		font-size: 1.1rem;
		margin: 0 0 0.5rem;
	}
	.help,
	.note,
	.file {
		color: var(--muted);
		font-size: 0.85rem;
		line-height: 1.5;
	}
	.help {
		margin: 0 0 0.75rem;
	}
	.field {
		display: block;
		margin: 0 0 0.75rem;
	}
	.field span {
		display: block;
		font-size: 0.8rem;
		margin-bottom: 0.25rem;
	}
	.field input {
		width: 100%;
		box-sizing: border-box;
		padding: 0.7rem 0.8rem;
		border-radius: var(--radius-md);
		border: 1px solid var(--border-2);
		background: var(--bg, transparent);
		color: var(--text);
		font: inherit;
	}
	.file {
		word-break: break-all;
		margin: 0 0 0.75rem;
	}
	.status {
		margin-top: 0.75rem;
		font-size: 0.88rem;
		line-height: 1.5;
	}
	.status p {
		margin: 0;
	}
	.warn {
		color: var(--red);
	}
	.group {
		margin: 0.75rem 0 0;
		font-size: 0.88rem;
	}
</style>
