-- Student bio: the programme a student picked during onboarding.
--
-- Stored as slugs, not foreign keys, on purpose: the faculty/
-- department catalog is hardcoded in the app bundle (src/lib/catalog.ts)
-- and course/department ids are DB-generated identities the client never
-- sees. Slugs are the identity the catalog and the DB agree on.
-- Validation happens in /api/set-programme against the static catalog
-- before anything is written, so these columns can only ever hold a
-- real (faculty, department) pair.
--
-- Nullable: a signed-in student who hasn't picked yet is a normal state
-- (the row is auto-created on signup by the auth trigger). The
-- dashboard sends them to /onboarding/programme until it's set.
--
-- No new RLS policy: writes go through the server endpoint using the
-- service role after a session check, same pattern as submit-course and
-- enroll-course. Students keep the existing select-own policy only --
-- they can read their own bio, never write it directly from a browser.

alter table cgpa.students add column faculty_slug text;
alter table cgpa.students add column department_slug text;

alter table cgpa.students add constraint students_programme_both_or_neither
  check ((faculty_slug is null) = (department_slug is null));
