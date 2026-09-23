-- Fix: faculties/departments/courses were readable by `authenticated`
-- only, but /faculties (and its child routes down to course detail)
-- deliberately run with NO auth gate -- per that route's own comment,
-- this matches cgpa-state-of-play.md's onboarding order: "Open app ->
-- see Faculties" is step 1, before signup exists at all.
--
-- Under RLS, an anonymous request against an authenticated-only policy
-- doesn't error -- it just returns zero rows, silently. That's exactly
-- what "no faculty available yet" was: not missing content (the real
-- seeded faculties/departments/courses are all there), not a stale
-- deploy, but every unauthenticated visitor being handed an empty
-- result set by RLS before the query even reached the seeded rows.
--
-- keystone_questions is deliberately NOT touched here and stays
-- authenticated-only. Faculty/department/course names are just catalog
-- structure -- fine to browse before signing up. The actual question
-- bank is exactly the thing worth keeping behind a login (also the
-- only real mitigation in place right now against anonymous scraping,
-- given no rate limiting exists yet -- see the CGPA agent-audit
-- register, C10).

drop policy "faculties readable by authenticated" on cgpa.faculties;
create policy "faculties readable by anyone" on cgpa.faculties
  for select to authenticated, anon using (true);

drop policy "departments readable by authenticated" on cgpa.departments;
create policy "departments readable by anyone" on cgpa.departments
  for select to authenticated, anon using (true);

drop policy "approved courses readable by authenticated" on cgpa.courses;
create policy "approved courses readable by anyone" on cgpa.courses
  for select to authenticated, anon using (approval_status = 'approved');

-- keystone_questions itself stays gated (see reasoning above), but the
-- course-detail page (also public, same onboarding doctrine — see its
-- own +page.server.ts comment) shows an approved-question COUNT for
-- the course being browsed, and needs that count to be accurate for
-- an anonymous visitor too. A security-definer function that returns
-- only a number -- never row content -- lets that count be correct
-- pre-signup without granting anon any read access to the actual
-- question bank.
create or replace function cgpa.approved_question_count(p_course_id bigint)
returns bigint
language sql
security definer
set search_path = cgpa, pg_temp
as $$
  select count(*) from cgpa.keystone_questions
  where course_id = p_course_id and approval_status = 'approved';
$$;

grant execute on function cgpa.approved_question_count(bigint) to authenticated, anon;
