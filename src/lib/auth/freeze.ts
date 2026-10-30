/**
 * AUTH FREEZE — for testing and demos (founder instruction 2026-10-30:
 * "don't send data anywhere and don't verify entries, keep the auth and
 * onboard screens but make the buttons ordinary routes that don't check
 * for permission").
 *
 * While AUTH_FROZEN is true:
 *  - /login, /signup and /onboarding/programme still show, but their
 *    buttons are plain links. Nothing is sent to Supabase or to our own
 *    API, and no entry is checked.
 *  - Every server route sees one fixed demo student (see hooks.server.ts).
 *  - The programme a visitor picks is kept in a browser cookie only.
 *
 * To restore real auth: set AUTH_FROZEN to false and restore the three
 * screens from git history (the commit before "Freeze auth and signup").
 */
export const AUTH_FROZEN = true;

export const DEMO_STUDENT_ID = '00000000-0000-0000-0000-000000000001';
export const DEMO_STUDENT_EMAIL = 'demo@grantapp.local';
export const DEMO_STUDENT_NAME = 'Demo Student';

/** Cookie holding the picked programme as "facultySlug/departmentSlug". Browser-only; never written to the database. */
export const PROGRAMME_COOKIE = 'demo_programme';

export function rememberProgramme(facultySlug: string, departmentSlug: string): void {
	try {
		document.cookie = `${PROGRAMME_COOKIE}=${encodeURIComponent(`${facultySlug}/${departmentSlug}`)}; path=/; max-age=31536000; samesite=lax`;
	} catch {
		// Cookies blocked: the demo still works, the programme just is not remembered.
	}
}
