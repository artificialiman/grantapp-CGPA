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

// ---- Question formats that are built but not yet in the live test ----------------------------
// The live test (LocalTest.svelte) still handles multiple choice only. These shapes belong to the
// fill-in, essay and six-option interfaces in src/lib/components/ and content/FORMATS.md.

/** One cell of a fill-in table: fixed text, or a blank the student fills. */
export type FillCell = { text: string } | { blank: string; accept?: string[]; numeric?: boolean; tolerance?: number };

type FormatBase = Omit<PackQuestion, 'options' | 'correct_option_id'>;

/** Fill in properties or blanks. With `columns` it is shown as a table, without it as lines of text. */
export type FillQuestion = FormatBase & {
	type: 'fill';
	columns?: string[];
	rows: FillCell[][];
};

export type RubricPoint = { point: string; marks: number };

/** An essay or article: written by the student, compared with a model answer. */
export type EssayQuestion = FormatBase & {
	type: 'essay';
	marks: number;
	word_limit?: number;
	model_answer: string;
	rubric: RubricPoint[];
};

/** The six-option multiple choice: one right answer and five kinds of near miss (see formats.ts). */
export type SixOptionQuestion = PackQuestion & {
	type?: 'mcq';
	/** Option id -> kind of near miss, for the five wrong options. */
	distractor_kinds: Record<string, string>;
};

/** What the student wrote for a fill-in or essay question. */
export type WrittenAnswer = { fills?: Record<string, string>; text?: string };
