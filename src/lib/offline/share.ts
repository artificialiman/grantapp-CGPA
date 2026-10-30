import type { PackQuestion } from './types';
import type { TestResult } from './session';
import type { Analytics, Band, Bucket } from './analytics';

// The score-and-feedback file a student sends to the group on WhatsApp.
// Plain text on purpose: it opens on every phone, it is small, and it reads inside WhatsApp itself.

export type ReportInput = {
	studentName: string;
	department: string;
	courseLabel: string;
	finishedAt: Date;
	analytics: Analytics;
	questions: PackQuestion[];
	result: TestResult;
};

export const BAND_NOTE: Record<Band, string> = {
	Strong: '70% and above',
	Fair: '50% to 69%',
	'Needs work': 'below 50%'
};

export function formatDuration(seconds: number | null): string {
	if (seconds == null) return 'not recorded';
	const m = Math.floor(seconds / 60);
	const s = seconds % 60;
	return m > 0 ? `${m} min ${s} s` : `${s} s`;
}

const MAX_PART = 40;

/** "medicine/pco320" -> "PCO320"; "law/nigerian-legal-system" -> "nigerian legal system". */
export function courseLabelFor(packKey: string): string {
	const slug = packKey.split('/').pop() ?? packKey;
	return /^[a-z]{3,4}\d{3}$/.test(slug) ? slug.toUpperCase() : slug.replace(/-/g, ' ');
}

/** Letters and digits only, words joined with hyphens, so the name is safe on any phone. */
export function fileSafe(text: string): string {
	const cleaned = text
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^A-Za-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
	return cleaned.slice(0, MAX_PART).replace(/-+$/g, '');
}

export function dateStamp(d: Date): string {
	const p = (n: number) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Name_Department_Course_YYYY-MM-DD_score-feedback.txt, with missing parts left out. */
export function reportFileName(parts: { name: string; department: string; course: string; date: Date }): string {
	const bits = [fileSafe(parts.name), fileSafe(parts.department), fileSafe(parts.course), dateStamp(parts.date)]
		.filter((b) => b.length > 0);
	return `${bits.join('_')}_score-feedback.txt`;
}

export function cleanField(text: string, max = 60): string {
	return text.replace(/\s+/g, ' ').trim().slice(0, max);
}

function line(b: Bucket): string {
	const missed = b.total - b.correct;
	const skipped = b.skipped > 0 ? `, ${b.skipped} skipped` : '';
	return `  ${b.label}: ${b.correct} of ${b.total} (${b.percent}%)${missed > 0 ? `, ${missed} missed${skipped}` : ''}`;
}

/** Short message that travels with the file, or stands in for it when the file cannot be shared. */
export function buildSummary(i: Pick<ReportInput, 'studentName' | 'department' | 'courseLabel' | 'analytics'>): string {
	const a = i.analytics;
	const who = [i.studentName, i.department].filter(Boolean).join(' - ');
	const rows = [
		who,
		`${i.courseLabel}: ${a.correct} of ${a.total} correct (${a.percent}%), ${a.band}`
	];
	if (a.focus.length > 0) rows.push(`Revise first: ${a.focus.map((f) => f.label).join('; ')}`);
	return rows.filter(Boolean).join('\n');
}

export function buildReport(i: ReportInput): string {
	const a = i.analytics;
	const byId = new Map(i.questions.map((q) => [q.id, q]));
	const optionText = (q: PackQuestion, id: string | null) =>
		id == null ? 'Skipped' : (q.options.find((o) => o.id === id)?.text ?? id);
	const out: string[] = [];
	out.push('SCORE AND FEEDBACK');
	out.push('==================');
	out.push(`Student:    ${i.studentName || 'Not given'}`);
	out.push(`Department: ${i.department || 'Not given'}`);
	out.push(`Course:     ${i.courseLabel}`);
	out.push(`Date:       ${dateStamp(i.finishedAt)}`);
	out.push(`Time taken: ${formatDuration(a.seconds)}`);
	out.push('');
	out.push('SCORE');
	out.push('-----');
	out.push(`${a.correct} of ${a.total} correct (${a.percent}%)`);
	out.push(`Wrong: ${a.wrong}. Skipped: ${a.skipped}.`);
	out.push(`Result: ${a.band} (${BAND_NOTE[a.band]}).`);
	out.push('A correct answer earns 1 point. A wrong or skipped answer earns 0.');
	out.push('');
	out.push('ANALYTICS');
	out.push('---------');
	out.push('By difficulty:');
	for (const b of a.byDifficulty) out.push(line(b));
	out.push('By way of thinking (weakest first):');
	for (const b of a.byPattern) out.push(line(b));
	out.push('By type of content (weakest first):');
	for (const b of a.byType) out.push(line(b));
	out.push('');
	out.push('WHERE TO REVISE');
	out.push('---------------');
	if (a.focus.length === 0) out.push('Every question was answered correctly. Nothing to revise from this set.');
	else for (const f of a.focus) out.push(`  ${f.label}: ${f.correct} of ${f.total} correct`);
	out.push('');
	out.push('QUESTION BY QUESTION');
	out.push('--------------------');
	let n = 0;
	for (const r of i.result.results) {
		const q = byId.get(r.question_id);
		if (!q) continue;
		n += 1;
		out.push('');
		out.push(`${n}. ${q.prompt}`);
		out.push(`   Result: ${r.correct ? 'Correct' : r.skipped ? 'Skipped' : 'Wrong'}`);
		out.push(`   Your answer: ${optionText(q, r.selected_option_id)}`);
		if (!r.correct) out.push(`   Correct answer: ${optionText(q, r.correct_option_id)}`);
		out.push(`   Why: ${r.explanation}`);
	}
	out.push('');
	return out.join('\n');
}

// ---- Delivery ---------------------------------------------------------------------------------

export type ShareOutcome =
	| { kind: 'shared' }
	| { kind: 'cancelled' }
	| { kind: 'saved'; downloaded: boolean; copied: boolean; reason: string }
	| { kind: 'failed'; message: string };

/** Everything delivery touches in the browser, passed in so the decision logic can be tested. */
export type ShareDeps = {
	canShareFiles: (name: string, text: string) => boolean;
	shareFile: (name: string, text: string, summary: string) => Promise<void>;
	download: (name: string, text: string) => void;
	copy: (text: string) => Promise<void>;
};

function isAbort(err: unknown): boolean {
	return typeof err === 'object' && err !== null && (err as { name?: string }).name === 'AbortError';
}

function describe(err: unknown): string {
	if (err instanceof Error && err.message) return err.message;
	return 'unknown error';
}

/**
 * Send the file through the phone's share sheet when it can carry files (the student then picks
 * WhatsApp and the group). When it cannot, or fails, save the file to the phone and copy the
 * summary, so the student can attach it by hand. Never ends without telling the caller which.
 */
export async function deliverReport(
	deps: ShareDeps,
	file: { name: string; text: string; summary: string }
): Promise<ShareOutcome> {
	let reason = 'This phone cannot send files straight from the browser.';
	let canShare = false;
	try {
		canShare = deps.canShareFiles(file.name, file.text);
	} catch (err) {
		reason = `Sharing is not available here (${describe(err)}).`;
	}
	if (canShare) {
		try {
			await deps.shareFile(file.name, file.text, file.summary);
			return { kind: 'shared' };
		} catch (err) {
			if (isAbort(err)) return { kind: 'cancelled' };
			reason = `Sharing failed (${describe(err)}).`;
		}
	}
	let downloaded = false;
	let copied = false;
	try {
		deps.download(file.name, file.text);
		downloaded = true;
	} catch {
		downloaded = false;
	}
	try {
		await deps.copy(file.summary);
		copied = true;
	} catch {
		copied = false;
	}
	if (!downloaded && !copied) {
		return { kind: 'failed', message: `${reason} The file could not be saved and the summary could not be copied.` };
	}
	return { kind: 'saved', downloaded, copied, reason };
}

/** The real browser pieces. Each one throws when the browser refuses, so the caller can fall back. */
export function browserDeps(): ShareDeps {
	const makeFile = (name: string, text: string) => new File([text], name, { type: 'text/plain' });
	return {
		canShareFiles(name, text) {
			if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return false;
			if (typeof navigator.canShare !== 'function') return false;
			return navigator.canShare({ files: [makeFile(name, text)] });
		},
		async shareFile(name, text, summary) {
			await navigator.share({ files: [makeFile(name, text)], title: name, text: summary });
		},
		download(name, text) {
			const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
			const a = document.createElement('a');
			a.href = url;
			a.download = name;
			a.rel = 'noopener';
			document.body.appendChild(a);
			a.click();
			a.remove();
			setTimeout(() => URL.revokeObjectURL(url), 10000);
		},
		async copy(text) {
			if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
				await navigator.clipboard.writeText(text);
				return;
			}
			// Older browsers: select the text in a hidden box and use the old copy command.
			const box = document.createElement('textarea');
			box.value = text;
			box.setAttribute('readonly', '');
			box.style.position = 'fixed';
			box.style.opacity = '0';
			document.body.appendChild(box);
			box.select();
			const ok = document.execCommand('copy');
			box.remove();
			if (!ok) throw new Error('copy refused');
		}
	};
}
