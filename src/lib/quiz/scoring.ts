/**
 * Extracted from submit-quick-test/+server.ts (where it was a local,
 * unexported function) so submit-mastery-set can use the same scoring
 * without a second declaration.
 *
 * Scoring model: simple +1 correct / 0 skip / 0 wrong — no negative
 * marking. PROVISIONAL, not a doctrine-confirmed decision: UTME's
 * negative-marking scheme (skip beats guessing) is specific to JAMB's
 * real exam-day psychology and isn't something CGPA's docs ask for.
 * Kept as a single named function so it's an easy, deliberate change
 * once a real CGPA scoring model is confirmed, not buried separately
 * in each endpoint that scores an answer.
 */
export function scoreAnswer(isSkipped: boolean, isCorrect: boolean): number {
	if (isSkipped) return 0;
	return isCorrect ? 1 : 0;
}
