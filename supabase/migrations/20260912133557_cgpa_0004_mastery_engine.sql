-- Mastery engine for CGPA -- doctrine Clause 1: "CGPA quiz-ui inherits
-- UTME's 100-day-mastery flow shape (not the flat Cluster Prep loop)
-- as its base behavior, not built fresh." This migration is the data
-- model that shape depends on -- faithfully mirrored from
-- grantapp-shell's public.mastery_state and public.daily_assignments
-- (see that repo's 0003_question_bank_and_mastery.sql and
-- 0017_mastery_100_day_sets.sql).
--
-- One deliberate improvement over the original: UTME's
-- daily_assignments started with no subject column at all, then
-- needed a later migration to add one plus widen the unique
-- constraint, because a student doing two subjects the same day
-- collided on (student_id, assigned_date). CGPA's course-scoped
-- equivalent includes course_id in the constraint from this first
-- migration -- the same fix, just not deferred to a second one, now
-- that the mistake and its fix are both known upfront.

-- cgpa.mastery_state: the (cognitive_pattern x information_type)
-- grid, scoped by course_id instead of subject. Same EMA-based
-- scoring as UTME (see lib/quiz/mastery.ts -- ported unchanged, not
-- reinvented, in the app code that reads/writes this table).
create table cgpa.mastery_state (
  id bigint generated always as identity primary key,
  student_id uuid not null references cgpa.students(id) on delete cascade,
  course_id bigint not null references cgpa.courses(id) on delete cascade,
  cognitive_pattern text not null,
  information_type text not null,

  attempts smallint not null default 0,
  correct smallint not null default 0,
  mastery_score numeric check (mastery_score is null or mastery_score between 0 and 1),

  last_attempted_at timestamptz,
  updated_at timestamptz not null default now(),

  unique (student_id, course_id, cognitive_pattern, information_type)
);

comment on table cgpa.mastery_state is 'Adaptive-selection read model, CGPA-scale equivalent of grantapp-shell public.mastery_state. EMA-scored per (cognitive_pattern, information_type) combo, scoped by course_id rather than subject.';

alter table cgpa.mastery_state enable row level security;

create policy "students read own mastery state" on cgpa.mastery_state
  for select to authenticated using (auth.uid() = student_id);

-- Written only server-side (service_role), same convention as every
-- other write-path table in this schema (migrations 0001-0003).

create index idx_cgpa_mastery_state_student_course on cgpa.mastery_state(student_id, course_id);

-- cgpa.mastery_assignments: the 5-set/2-gate structure, CGPA-scale
-- equivalent of grantapp-shell public.daily_assignments (post-0017
-- shape -- course_id/subject-equivalent included from creation here,
-- not bolted on after the fact the way UTME's was).
create table cgpa.mastery_assignments (
  id bigint generated always as identity primary key,
  student_id uuid not null references cgpa.students(id) on delete cascade,
  course_id bigint not null references cgpa.courses(id) on delete cascade,
  assigned_date date not null default current_date,

  question_sets jsonb, -- {"1": [ids...], ..., "5": [ids...]} -- sets 2+ absent until their gate fires
  current_set smallint not null default 1,
  completed_count smallint not null default 0,

  gate_1_fired_at timestamptz,
  gate_2_fired_at timestamptz,
  gate_1_degraded boolean not null default false,
  gate_2_degraded boolean not null default false,

  created_at timestamptz not null default now(),

  unique (student_id, course_id, assigned_date)
);

comment on table cgpa.mastery_assignments is 'Mastery 100/day session state (5 sets of 20, 2 adaptive stage gates), CGPA-scale equivalent of grantapp-shell public.daily_assignments. course_id + assigned_date + student_id unique from creation -- UTME''s equivalent table needed a later migration to add this scoping after a real collision bug; built correctly here from the start.';
comment on column cgpa.mastery_assignments.gate_1_fired_at is 'When Gate 1 computed strength tags from Set 1 and generated Sets 2+3. Null = not yet reached.';
comment on column cgpa.mastery_assignments.gate_2_fired_at is 'When Gate 2 computed weak tags from Sets 1-3 and generated Sets 4+5. Null = not yet reached.';
comment on column cgpa.mastery_assignments.gate_1_degraded is 'True if Gate 1 could not live-fetch targeted questions and fell back to more new questions instead (offline-degradation clause, mirrors UTME''s exact fallback behavior).';
comment on column cgpa.mastery_assignments.gate_2_degraded is 'Same as gate_1_degraded, for Gate 2.';

alter table cgpa.mastery_assignments enable row level security;

create policy "students read own mastery assignments" on cgpa.mastery_assignments
  for select to authenticated using (auth.uid() = student_id);

create index idx_cgpa_mastery_assignments_student_date on cgpa.mastery_assignments(student_id, assigned_date desc);

-- Per PERMISSIONS.md §7 lesson 1 (grantapp-command) / this schema's
-- own established convention (0001-0003): explicit GRANTs alongside
-- RLS, in the same migration, not discovered via a live error later.
grant select, insert, update on cgpa.mastery_state to service_role;
grant select, insert, update on cgpa.mastery_assignments to service_role;
