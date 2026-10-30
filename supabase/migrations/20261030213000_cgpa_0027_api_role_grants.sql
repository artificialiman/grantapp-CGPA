-- 0027: let the API roles reach the cgpa schema.
-- Found 2026-10-30: anon, authenticated and service_role had no USAGE on schema cgpa, and no table grants
-- except service_role on two mastery tables. Every server call that reads or writes cgpa failed or came back empty.
-- Row-level security is on for every table and already limits rows, so this grants only what those policies
-- were written for. Nothing here widens a policy. Safe to apply twice.

grant usage on schema cgpa to anon, authenticated, service_role;

-- Public catalogue: the same three tables that have anon read policies.
grant select on cgpa.faculties, cgpa.departments, cgpa.courses to anon;

-- Signed-in students: read only, one table per existing select policy. Rows are limited by those policies.
grant select on
  cgpa.access_grants, cgpa.courses, cgpa.departments, cgpa.devices, cgpa.enrollments, cgpa.faculties,
  cgpa.keystone_questions, cgpa.mastery_assignments, cgpa.mastery_state, cgpa.offline_attempts,
  cgpa.student_question_progress, cgpa.students, cgpa.submissions, cgpa.taxonomy_tags
to authenticated;

-- The server (service role bypasses row-level security): writes happen only here.
grant select, insert, update, delete on all tables in schema cgpa to service_role;
grant usage, select on all sequences in schema cgpa to service_role;
alter default privileges in schema cgpa grant select, insert, update, delete on tables to service_role;
alter default privileges in schema cgpa grant usage, select on sequences to service_role;
