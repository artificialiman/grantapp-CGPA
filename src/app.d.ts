// See https://svelte.dev/docs/kit/types#app.d.ts
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			// SupabaseClient<Database, SchemaName> — the schema generic
			// defaults to 'public' if left unspecified, which is WRONG
			// here: every client in this app (hooks.server.ts, lib/
			// supabase.ts) is created with { db: { schema: 'cgpa' } },
			// since Grant CGPA's tables live in their own Postgres schema,
			// not public (which is UTME's, in the same shared Supabase
			// project — see supabase/migrations/..._cgpa_0001_init.sql's
			// own comment). Explicitly parameterized to 'cgpa' so this
			// type actually matches what's constructed at runtime, rather
			// than silently type-checking against the wrong schema.
			supabase: SupabaseClient<any, 'cgpa', 'cgpa', any, any>;
			/** Reads the session cookie without re-validating the JWT against Supabase's auth server. Prefer safeGetSession() for anything access-gated. */
			getSession(): Promise<Session | null>;
			/** Re-validates the JWT via getUser() before trusting the session. Use this for any route that gates access (onboarding, dashboard, admin). */
			safeGetSession(): Promise<{ session: Session | null; user: User | null }>;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
