import { writable } from 'svelte/store';

/**
 * Ported from grantapp-shell's lib/stores/quizActive.ts. True while
 * ExamShell is mounted and running (a question is on screen) -- the
 * nav shell (built separately) reads this to simplify itself during
 * an active session, same reasoning as UTME's equivalent.
 */
export const examActive = writable(false);
