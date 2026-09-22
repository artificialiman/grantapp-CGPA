-- Closes a real gap in the core submit->test->track loop: clicking
-- "Upload Course Material" sent a student to WhatsApp with zero
-- record kept anywhere in the app -- no way to see what was
-- submitted, or its status, ever again. This table is that record.
--
-- Content itself is NOT stored here (no file storage, no live AI-gen
-- pipeline yet per doctrine -- "routes to the WhatsApp group... at
-- launch"). This is a lightweight tracking row: what a student SAID
-- they were sending, which course it's for (explicit pick, or
-- detected from pasted text against real course codes -- see the
-- detected_course_ids array), and a manually-updated status Tinggy
-- can move forward once material is actually processed.
create table cgpa.submissions (
  id bigint generated always as identity primary key,
  student_id uuid not null references cgpa.students(id) on delete cascade,
  -- Explicit course pick, if the student chose one from their own
  -- enrolled list (nullable -- "Not sure / general" is a valid
  -- choice, matching upload-course-material's existing UI).
  course_id bigint references cgpa.courses(id) on delete set null,
  -- Free text the student typed describing what they're sending
  -- (e.g. pasted notes, a description, question text) -- this is what
  -- the course-code detection scans, not a file upload.
  notes_text text,
  -- Course codes found in notes_text by matching against real
  -- cgpa.courses.code values at submission time -- an array since a
  -- pasted block of notes/questions can plausibly reference more than
  -- one course code. Detected once, at insert time, not re-scanned
  -- later if courses.code data changes afterward.
  detected_course_ids bigint[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'processed', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table cgpa.submissions is
  'Tracking record for "Upload Course Material" -- what a student said they sent, not the material itself (no file storage yet). detected_course_ids is populated by matching notes_text against courses.code at submission time.';
comment on column cgpa.submissions.detected_course_ids is
  'Course IDs whose code appeared in notes_text at submission time, detected server-side. Empty array if none matched or notes_text was blank -- not null, so callers never need a null-check before iterating it.';

alter table cgpa.submissions enable row level security;

create policy "students read own submissions" on cgpa.submissions
  for select to authenticated using (auth.uid() = student_id);

-- No write policy -- inserts go through a service-role server
-- endpoint (same convention as every other write path in this
-- schema); status updates (pending -> processed/rejected) are a
-- manual admin action, also service-role, once the admin side of this
-- flow exists.
