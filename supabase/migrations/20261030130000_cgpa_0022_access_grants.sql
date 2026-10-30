-- 0022: the two sign-ups (DECISIONS 2026-10-30, latest).
--
-- Normal sign-up: the 500-question install, nothing to record.
-- Manual sign-up: the founder adds the person by hand; the row below qualifies the account for
-- constant updates to the question bank. The tier belongs to the account, not the device.
--
-- Students can read their own row and can never write it: there is no insert/update policy, so
-- only the founder (SQL editor / service role) can grant or revoke.
--
-- To grant by hand (SQL editor):
--   insert into cgpa.access_grants (student_id, note)
--   select id, 'manual sign-up' from auth.users where email = 'person@example.com'
--   on conflict (student_id) do nothing;
-- To revoke:
--   delete from cgpa.access_grants where student_id = (select id from auth.users where email = 'person@example.com');
--
-- Applied by the founder. No agent applies migrations (handoff/LANES.md).

create table if not exists cgpa.access_grants (
  student_id uuid primary key references cgpa.students(id) on delete cascade,
  tier text not null default 'updates' check (tier in ('updates')),
  granted_at timestamptz not null default now(),
  note text
);

alter table cgpa.access_grants enable row level security;

create policy "own access grant readable" on cgpa.access_grants
  for select to authenticated using (student_id = auth.uid());

comment on table cgpa.access_grants is 'Accounts the founder added by hand (manual sign-up). A row means: offer question-bank updates. Deleted with the student.';
