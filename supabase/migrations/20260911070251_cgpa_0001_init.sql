-- Grant CGPA lives in its own Postgres schema within the shared
-- Supabase project (free-tier constraint: org is at its 2-project
-- limit, confirmed via Supabase project-creation being rejected for a
-- 3rd free project). Schema-level separation, not a shared 'public'
-- namespace with UTME -- no table names collide, no RLS policy
-- references the other schema, matching the doctrine's "fully
-- separate suites" rule as closely as one Postgres instance allows.
-- Both schemas share the same auth.users (a person CAN have both a
-- UTME and a CGPA account under one login), but that's the only
-- shared surface -- same as ROLE_ADMIN being the one deliberately
-- shared tool across both products.
create schema if not exists cgpa;

-- Students table: doctrine Section 0 -- "Student is the only
-- client-side account type... Departments and Lecturers are treated
-- as vendors, not app personas with their own logins."
create table cgpa.students (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  created_at timestamptz not null default now()
);

-- Faculty -> Department -> course-path-to-graduation, split by year
-- (Section 1, onboarding steps 1-3). Courses are NOT a flat catalog --
-- doctrine step 4 explicitly makes elective/extra-credit course
-- addition free-text + admin-approved, so the schema needs an
-- approval-state column from day one, not bolted on later.
create table cgpa.faculties (
  id bigint generated always as identity primary key,
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table cgpa.departments (
  id bigint generated always as identity primary key,
  faculty_id bigint not null references cgpa.faculties(id) on delete cascade,
  name text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  unique (faculty_id, slug)
);

-- One row per (department, year, course) -- year is part of the
-- identity, not a separate table, since "the course-path-to-
-- graduation, split by year" (Section 1) is fundamentally a
-- department-year-course tree, not courses-that-happen-to-have-a-
-- year-tag.
create table cgpa.courses (
  id bigint generated always as identity primary key,
  department_id bigint not null references cgpa.departments(id) on delete cascade,
  year smallint not null check (year between 1 and 7), -- 7 is a generous ceiling (e.g. Medicine's longer programs), not a hard doctrine number -- revisit if a real program needs more
  name text not null,
  code text, -- institution course code, when known -- nullable since free-text submissions may not have one
  kind text not null check (kind in ('core', 'elective', 'extra_credit')),
  -- Free-text course submission (doctrine step 4) needs an approval
  -- pipeline -- 'pending' is the only state a student-submitted course
  -- can be created in; only Tinggy/admin can move it to approved or
  -- rejected. Admin-seeded/curated courses (Section 1's "1" answer to
  -- seed content) go straight to 'approved'.
  approval_status text not null default 'approved' check (approval_status in ('pending', 'approved', 'rejected')),
  submitted_by uuid references cgpa.students(id) on delete set null, -- null for admin-seeded courses
  created_at timestamptz not null default now()
);

comment on table cgpa.faculties is 'Top-level list, doctrine Section 1 onboarding step 1.';
comment on table cgpa.departments is 'Within a faculty, doctrine Section 1 onboarding step 2.';
comment on table cgpa.courses is 'The course-path-to-graduation, split by year, doctrine Section 1 onboarding steps 3-4. Student-submitted (free-text) courses start approval_status=pending and require admin approval before enrollment/browse actions can see them -- see approval_status check constraint.';
comment on column cgpa.courses.submitted_by is 'Which student free-text-submitted this course, if any. Null for admin-seeded/curated courses (the "seed set exists, admin approves the rest" model confirmed for the first buildable slice).';

alter table cgpa.students enable row level security;
alter table cgpa.faculties enable row level security;
alter table cgpa.departments enable row level security;
alter table cgpa.courses enable row level security;

-- Faculties/departments/approved courses are readable by any
-- authenticated CGPA student (onboarding browse, doctrine Section 2:
-- "Faculty/Department/Course browse, onboarding | Yes | Yes | --").
-- Pending/rejected courses are NOT visible in this policy -- a
-- student's own pending submission is a separate, later concern
-- (their own submission history), not solved by widening this browse
-- policy.
create policy "faculties readable by authenticated" on cgpa.faculties
  for select to authenticated using (true);

create policy "departments readable by authenticated" on cgpa.departments
  for select to authenticated using (true);

create policy "approved courses readable by authenticated" on cgpa.courses
  for select to authenticated using (approval_status = 'approved');

create policy "students read own row" on cgpa.students
  for select to authenticated using (auth.uid() = id);

-- No INSERT/UPDATE/DELETE policies yet for any of these tables --
-- every write (course approval, student creation at signup, etc.)
-- goes through the service-role client from server endpoints, same
-- convention public.students/public.questions already use in the
-- UTME schema. RLS here is a read-side safety net, not the write
-- boundary -- consistent with how the shared project's existing
-- schema already works.
