-- The actual root cause behind three separate defensive fixes this
-- session (check-device's login 500, submit-quick-test's silent
-- progress-save failure, enroll-course's silent enrollment-save
-- failure): every write into a table with a foreign key on
-- cgpa.students(id) assumed a students row already exists for a
-- logged-in user. Because auth-last build-doctrine deliberately
-- doesn't gate anything on "signup fully completed", a real user can
-- be authenticated (has an auth.users row, has a session) with no
-- cgpa.students row yet -- and every one of those writes would fail
-- with an opaque foreign-key violation.
--
-- This trigger removes the whole class of bug at its source: the
-- moment a new auth.users row is created, a matching cgpa.students
-- row is created automatically, in the same transaction, before any
-- app code ever runs. Every downstream write (devices, enrollments,
-- student_question_progress) can now trust the row exists, without
-- each endpoint needing its own defensive upsert -- those upserts
-- (added earlier this session in check-device, submit-quick-test,
-- enroll-course) are now redundant safety nets, not load-bearing, and
-- can stay as-is with no downside.
create or replace function cgpa.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = cgpa, public
as $$
begin
  insert into cgpa.students (id, full_name)
  values (new.id, coalesce(split_part(new.email, '@', 1), 'Student'))
  on conflict (id) do nothing;
  return new;
end;
$$;

comment on function cgpa.handle_new_user is
  'Auto-creates a cgpa.students row for every new auth.users signup, so no downstream write (devices/enrollments/student_question_progress, all FK''d to students) can ever fail with a foreign-key violation due to a missing profile row. security definer + explicit search_path since this needs to write into cgpa from a trigger on auth.users, which the invoking role may not otherwise have direct insert rights on.';

drop trigger if exists on_auth_user_created_cgpa on auth.users;
create trigger on_auth_user_created_cgpa
  after insert on auth.users
  for each row
  execute function cgpa.handle_new_user();

-- One-time backfill: any account created before this trigger existed
-- (12 real accounts across both UTME and CGPA signups, confirmed at
-- migration time) gets its missing cgpa.students row created now,
-- rather than only fixing the problem going forward.
insert into cgpa.students (id, full_name)
select u.id, coalesce(split_part(u.email, '@', 1), 'Student')
from auth.users u
left join cgpa.students s on s.id = u.id
where s.id is null
on conflict (id) do nothing;
