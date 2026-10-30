// Shapes shared by the offline engine. They mirror what scripts/build-packs.py writes.

export type PackOption = { id: string; text: string };

export type PackQuestion = {
	id: string;
	prompt: string;
	options: PackOption[];
	correct_option_id: string;
	explanation: string;
	cognitive_patterns: string[];
	information_types: string[];
	difficulty: number;
};

export type Pack = {
	format: number;
	key: string; // "faculty/course"
	faculty: string;
	course: string;
	departments: string[];
	questions: PackQuestion[];
};

export type PackMeta = {
	key: string;
	faculty: string;
	course: string;
	departments: string[];
	path: string; // relative to the site root, e.g. "packs/law/x.1a2b3c4d.json"
	sha256: string;
	bytes: number;
	gz_bytes: number;
	count: number;
	released_on: string;
	starter: boolean;
};

export type Manifest = {
	format: number;
	release: string;
	content_hash: string;
	totals: Record<string, number>;
	packs: PackMeta[];
};

export type StoredPack = { key: string; sha256: string; released_on: string; pack: Pack };

export type Answer = { question_id: string; selected_option_id: string | null };

export type AttemptStatus = 'pending' | 'sent' | 'failed';

export type Attempt = {
	id: string; // idempotency key, sent to the server with the answers
	course_key: string;
	started_at: string;
	finished_at: string;
	answers: Answer[];
	status: AttemptStatus;
	tries: number;
	last_error?: string;
};
