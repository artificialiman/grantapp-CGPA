-- Neither the transcript tracker nor the path-to-first-class tree
-- (both required by the dashboard content list) can render anything
-- real without a concept of "which courses has this student actually
-- taken, and with what grade" -- cgpa.courses is the catalog only, not
-- a per-student record. This table is that missing link, built now
-- because both features genuinely depend on it, not invented ahead of
-- need.
create table cgpa.enrollments (
  id bigint generated always as identity primary key,
  student_id uuid not null references cgpa.students(id) on delete cascade,
  course_id bigint not null references cgpa.courses(id) on delete cascade,
  -- Semester as a simple integer counter (1, 2, 3...) rather than a
  -- real academic-calendar concept (no "2024/2025 Harmattan
  -- semester" modeling exists anywhere in this schema yet) -- matches
  -- the doctrine's own year-based course-path model (courses.year is
  -- already a plain smallint, not a calendar-year), so this stays
  -- consistent with that rather than introducing calendar precision
  -- the rest of the schema doesn't have.
  semester smallint not null check (semester between 1 and 2),
  -- Null grade = enrolled/in-progress, not yet graded -- a student
  -- planning their path-to-first-class needs to be able to add a
  -- course before they've sat its exam, and the transcript tracker
  -- needs to distinguish "taken and graded" from "currently taking"
  -- rather than treat every enrollment row as a completed one.
  grade text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, course_id) -- a student enrolls in a given course once; re-taking a failed course is a real academic scenario but not modeled yet -- would need a retake/attempt-number column, deliberately left for when that's actually asked for
);

comment on table cgpa.enrollments is
  'A student''s actual taken/in-progress courses, distinct from cgpa.courses (the catalog). Powers the transcript tracker and path-to-first-class projections. grade is null while in-progress.';
comment on column cgpa.enrollments.grade is
  'Null = enrolled, not yet graded. Letter grade (matching one of the grading-scale letters in lib/cgpa/scales.ts) once graded -- validated in application code against the student''s chosen scale, not a DB check constraint, since the valid letter set differs between the 5.0 and 4.0 scales.';

alter table cgpa.enrollments enable row level security;

create policy "students read own enrollments" on cgpa.enrollments
  for select to authenticated using (auth.uid() = student_id);

-- No write policies -- enrollment create/update/grade-entry goes
-- through service-role server endpoints, same convention as every
-- other write path in this schema.
