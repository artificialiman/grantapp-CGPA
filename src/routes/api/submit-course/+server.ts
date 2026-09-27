import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

const SERVICE_ROLE_KEY = env.SERVICE_ROLE_KEY;

/**
 * cgpa-state-of-play.md onboarding step 4: free-text course
 * submission, admin-approved before it's browsable (migration 0001's
 * approval_status pipeline). No auth requirement here — build-doctrine
 * invariant, same as the three browse routes on this branch. If a
 * session happens to exist, submitted_by is set from it (real
 * attribution when we have it); if not, submitted_by stays null rather
 * than blocking the submission on signing in first.
 *
 * Service-role client, not locals.supabase — migration 0001 gives
 * cgpa.courses exactly one RLS policy (SELECT, approved rows,
 * authenticated only), no INSERT policy at all, so the RLS-scoped
 * client would be denied outright regardless of auth state. Same
 * pattern api/complete-signup already uses for its own write.
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const { session, user } = await locals.safeGetSession();

		const body = (await request.json()) as {
			faculty_slug: string;
			dept_slug: string;
			year: number;
			name: string;
			code?: string;
			kind: 'core' | 'elective' | 'extra_credit';
		};

		const { faculty_slug, dept_slug, year, name, code, kind } = body;

		if (!faculty_slug || !dept_slug || !year || !name?.trim() || !kind) {
			return json(
				{ message: 'Missing faculty_slug, dept_slug, year, name, or kind' },
				{ status: 400 }
			);
		}
		if (!['core', 'elective', 'extra_credit'].includes(kind)) {
			return json({ message: 'Invalid kind' }, { status: 400 });
		}

		if (!SERVICE_ROLE_KEY) {
			console.error('SERVICE_ROLE_KEY not configured');
			return json({ message: 'Server configuration error' }, { status: 500 });
		}

		const { createClient } = await import('@supabase/supabase-js');
		const supabaseUrl = env.VITE_SUPABASE_URL;
		if (!supabaseUrl) {
			return json({ message: 'Server configuration error' }, { status: 500 });
		}

		const adminClient = createClient(supabaseUrl, SERVICE_ROLE_KEY, { db: { schema: 'cgpa' } });

		// The browse pages are fully static now (see $lib/catalog.ts) and
		// never fetch a numeric department id — this endpoint is the one
		// place that still needs it, and it already has to touch the DB
		// to do the insert anyway, so resolving here costs nothing extra.
		const { data: department, error: deptLookupError } = await adminClient
			.from('departments')
			.select('id, faculties!inner(slug)')
			.eq('slug', dept_slug)
			.eq('faculties.slug', faculty_slug)
			.maybeSingle();

		if (deptLookupError || !department) {
			return json({ message: 'Unknown faculty or department' }, { status: 400 });
		}

		// courses.slug is NOT NULL (migration 0016) and must match
		// exactly what that migration's backfill computes, so a
		// student-submitted course slots into the same lookup scheme as
		// every seeded one. code, when present, wins; a duplicate within
		// this department is still possible (e.g. two different students
		// both leaving code blank for a course called "Seminar") --
		// department_slug_unique will reject the insert rather than
		// silently colliding, and that's surfaced as a normal failure
		// below rather than swallowed.
		const slugSource = code?.trim() || name.trim();
		const slug = slugSource
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '');

		const { data, error } = await adminClient
			.from('courses')
			.insert({
				department_id: department.id,
				year,
				name: name.trim(),
				code: code?.trim() || null,
				slug,
				kind,
				approval_status: 'pending',
				submitted_by: session && user ? user.id : null
			})
			.select('id')
			.single();

		if (error) {
			console.error('submit-course insert error:', error);
			return json({ message: 'Failed to submit course' }, { status: 500 });
		}

		return json({ id: data.id, message: 'Submitted for admin review' });
	} catch (err) {
		console.error('submit-course error:', err);
		return json({ message: 'Internal server error' }, { status: 500 });
	}
};
