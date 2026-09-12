-- Resolves DATA_DICTIONARY.md's taxonomy_tags/keystone_questions/
-- student_question_progress design (INVARIANTS §17, DECISIONS.md
-- 2026-09-11 "Taxonomy/mastery engine"). lesson_notes stays out of
-- this migration -- still [OPEN] in DATA_DICTIONARY.md, not resolved
-- by the taxonomy decision, not guessed at here.

-- taxonomy_tags: the growable vocabulary keystone_questions tags
-- against. A real table, not a check-constraint value list, precisely
-- so a new tag is an ordinary write (reviewable, attributable) instead
-- of a migration+deploy -- see DATA_DICTIONARY.md's reasoning in full.
-- scope_faculty_id null = global (UTME's exact baseline, seeded
-- below); non-null = that one faculty's own addition, matching the
-- founder's "iterative... more variables" condition rather than
-- inflating the global set for everyone.
create table cgpa.taxonomy_tags (
  id bigint generated always as identity primary key,
  axis text not null check (axis in ('cognitive_pattern', 'information_type')),
  tag_name text not null,
  scope_faculty_id bigint references cgpa.faculties(id) on delete cascade,
  introduced_by uuid references auth.users(id) on delete set null, -- null for the seeded UTME baseline below; set for anything added later via the admin tool
  created_at timestamptz not null default now(),
  unique (axis, tag_name, scope_faculty_id)
);

comment on table cgpa.taxonomy_tags is 'Growable tag vocabulary for keystone_questions/lesson_notes. INVARIANTS #17: seeded with UTME''s exact 5+5 baseline as global (scope_faculty_id null), extended per-faculty as real content surfaces gaps grantapp-shell''s fixed set doesn''t cover.';
comment on column cgpa.taxonomy_tags.scope_faculty_id is 'Null = global (applies to every faculty). Non-null = only meaningful within that one faculty''s content.';

alter table cgpa.taxonomy_tags enable row level security;

create policy "taxonomy tags readable by authenticated" on cgpa.taxonomy_tags
  for select to authenticated using (true);

-- UTME's exact baseline (grantapp-shell/TAXONOMY.md), global scope.
-- Kept verbatim, not reworded -- this IS the "starting shape" the
-- founder's decision was to reuse, so the seed should be traceable
-- back to the source rather than a paraphrase of it.
insert into cgpa.taxonomy_tags (axis, tag_name, scope_faculty_id) values
  ('cognitive_pattern', 'Pragmatic', null),
  ('cognitive_pattern', 'Logical', null),
  ('cognitive_pattern', 'Canon / Administrative', null),
  ('cognitive_pattern', 'Statistical / Predictive', null),
  ('cognitive_pattern', 'Pure Mathematical', null),
  ('information_type', 'Essential / definitive', null),
  ('information_type', 'Contextual / rhetoric', null),
  ('information_type', 'Abstract / Visual', null),
  ('information_type', 'Procedural / supply chain', null),
  ('information_type', 'Mathematical Proofs', null);

-- keystone_questions: the 10,000-question-per-degree bank (INVARIANTS
-- §11). course_id FKs into cgpa.courses directly rather than a loose
-- faculty/course_code text pair -- migration 0001 already gives a real
-- table to point at, so a text duplicate would just be a second,
-- driftable source of the same fact.
--
-- cognitive_patterns/information_types stay text[] (matching
-- grantapp-shell's questions table exactly, and taxonomy_tags.tag_name
-- above) rather than a join table -- Postgres has no native
-- FK-into-array-element constraint, so membership is validated at the
-- application layer against taxonomy_tags, same trade-off UTME already
-- accepted for its own questions table, not a new one introduced here.
--
-- approval_status reuses cgpa.courses' exact pattern and value set
-- (pending/approved/rejected) rather than a differently-named
-- verification_status with different values -- one approval vocabulary
-- across the schema, not two.
create table cgpa.keystone_questions (
  id bigint generated always as identity primary key,
  course_id bigint not null references cgpa.courses(id) on delete cascade,
  cognitive_patterns text[] not null default '{}',
  information_types text[] not null default '{}',
  prompt text not null,
  options jsonb not null,
  correct_option_id text not null,
  explanation text,
  difficulty smallint check (difficulty between 1 and 5), -- same 1-5 range as UTME's questions.difficulty constraint -- kept identical rather than picking a fresh scale
  source text not null default 'standard' check (source in ('standard', 'user_submitted')),
  approval_status text not null default 'approved' check (approval_status in ('pending', 'approved', 'rejected')),
  submitted_by uuid references cgpa.students(id) on delete set null, -- null for standard/admin-seeded questions, matching cgpa.courses.submitted_by's exact convention
  created_at timestamptz not null default now()
);

comment on table cgpa.keystone_questions is 'The 10,000-question-per-degree bank, INVARIANTS #11. Student-submitted questions (source=user_submitted) start approval_status=pending, same pipeline as cgpa.courses -- see INVARIANTS #15 (review process for user-submitted content, admin/reviewer role still [OPEN] in DATA_DICTIONARY.md pending who exactly holds it).';

alter table cgpa.keystone_questions enable row level security;

create policy "approved keystone questions readable by authenticated" on cgpa.keystone_questions
  for select to authenticated using (approval_status = 'approved');

-- student_question_progress: per-answer record toward the 10,000
-- target, the CGPA-scale equivalent of UTME's answer_events. Kept as
-- one row per answer (not an aggregate-only rollup) since "progress
-- toward 10,000" needs an actual count of distinct questions
-- answered, not just a derived percentage -- an aggregate table can
-- always be built FROM this later; the reverse (recovering per-answer
-- history from an aggregate) can't.
create table cgpa.student_question_progress (
  id bigint generated always as identity primary key,
  student_id uuid not null references cgpa.students(id) on delete cascade,
  keystone_question_id bigint not null references cgpa.keystone_questions(id) on delete cascade,
  is_correct boolean not null,
  is_skipped boolean not null default false,
  points_awarded numeric not null default 0,
  answered_at timestamptz not null default now(),
  unique (student_id, keystone_question_id) -- one progress record per question per student; a re-answer updates this row rather than accumulating duplicates, matching "progress toward 10,000 distinct questions" rather than "total answers ever given"
);

comment on table cgpa.student_question_progress is 'Per-question progress toward the 10,000-question target, INVARIANTS #11. Sensitive (DATA_DICTIONARY.md flags answered_at/result as feeding rank) -- RLS restricts read to the student''s own rows only, no broader authenticated-read policy the way taxonomy_tags/courses/keystone_questions get.';

alter table cgpa.student_question_progress enable row level security;

create policy "students read own progress" on cgpa.student_question_progress
  for select to authenticated using (auth.uid() = student_id);

-- No INSERT/UPDATE/DELETE policies on any of the three tables above --
-- same convention as migration 0001: every write goes through the
-- service-role client from server endpoints, RLS here is a read-side
-- safety net only.
