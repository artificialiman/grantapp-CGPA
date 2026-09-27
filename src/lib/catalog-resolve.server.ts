import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * The single live touchpoint between the hardcoded, bundled catalog
 * ($lib/catalog.ts) and the real database. Everything about browsing
 * faculties/departments/courses is static now -- this function exists
 * only for the moment a student actually starts a test, where the
 * real numeric course id is genuinely needed (keystone_questions,
 * mastery_state, submissions all key on it, not on slug).
 *
 * .server.ts suffix makes this server-only by SvelteKit convention --
 * it can never end up in a client bundle.
 */
export async function resolveCourseId(
	supabase: SupabaseClient,
	facultySlug: string,
	deptSlug: string,
	courseSlug: string
): Promise<number | null> {
	const { data, error } = await supabase
		.from('courses')
		.select('id, departments!inner(slug, faculties!inner(slug))')
		.eq('slug', courseSlug)
		.eq('departments.slug', deptSlug)
		.eq('departments.faculties.slug', facultySlug)
		.eq('approval_status', 'approved')
		.maybeSingle();

	if (error) {
		console.error('resolveCourseId failed:', error);
		return null;
	}

	return data?.id ?? null;
}
