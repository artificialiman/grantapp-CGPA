# PROJECT_BRIEF.md — GrantApp CGPA

## What this is
GrantApp CGPA is the university-level counterpart to GrantApp UTME. Where
UTME gets a student *into* the best school, CGPA is built to get a student
the best *placement* once they're there — internships, fellowships,
scholarships, apprenticeship contracts — while satisfactorily preparing
them for the exams and tests that stand between them and those outcomes.

It is not a GPA calculator. "CGPA" in the name signals "university-level,"
not "grade math."

## Who for
Any student, at any school, in any of the initial 7 courses/faculties:
Medicine, Pharmacy, Biochemistry, Microbiology, Law, Economics, Insurance.
No institutional gatekeeping — self-serve, like GrantApp UTME.

## What success looks like
- **The core is mastery, not rank.** A student answers up to 10,000
  keystone questions across their degree before graduation, backed by
  proper/standard lesson notes, covering every course on the way to a
  perfect CGPA — the same rigor as GrantApp UTME's taxonomy engine, aimed
  at a full degree instead of a single entrance exam.
- Students can submit notes/questions specific to their own school or
  lecturer — the keystone bank is standard, but real courses vary by
  institution and instructor, and the app accounts for that rather than
  assuming one national syllabus.
- The app makes clear, early, the full range of opportunities a specific
  degree actually offers — internships, research communities, survey/
  questionnaire demographics to participate in — because most students
  enter university not knowing this and find out too late.
- As a byproduct of sustained mastery-engine use, the app curates a
  student's habits, results, and rank — which, only with explicit
  per-student opt-in, can feed a sister app responsible for actual
  internship/fellowship/scholarship/apprenticeship listings and matching.
  This is a downstream benefit of the mastery core, not the product's
  starting point.
- Faculty/course content is genuinely distinct per faculty, not a reskin
  of one generic template across 7 labels.

## Explicitly out of scope (for now)
- Plain GPA/CGPA arithmetic as a standalone utility/calculator — if it
  exists at all, it's a minor feature inside the exam-prep flow, not the
  product.
- Sharing the taxonomy/mastery cognitive-profiling engine from
  GrantApp UTME (grantapp-shell) — not decided either way yet; treat as
  a separate, later decision, not an assumed inheritance.
- Institution-specific/partner deployments (e.g. a TCC-style single-school
  build) — this is the any-student-any-school version.
- Building or operating the internship/fellowship/scholarship/
  apprenticeship listings and matching itself — that's a sister app's job.
  CGPA's job ends at producing a trustworthy habits/results/rank profile;
  how that profile is consumed by the sister app is that app's concern,
  though the handoff contract between the two (what data crosses, in what
  shape) belongs in DATA_DICTIONARY.md once defined.

## Status
Draft — corrected after founder clarification: this is a course/degree
MASTERY app (10,000-keystone-question engine + lesson notes +
school/lecturer-specific content), not primarily a rank/credibility
layer for the sister app. Ready for INVARIANTS.md, DATA_DICTIONARY.md,
PERMISSIONS.md, and DECISIONS.md to be built/revised on top of it. Open:
the name and integration contract of the sister listings/placement app;
exactly how school/lecturer-specific submissions are vetted before
joining the keystone bank.
