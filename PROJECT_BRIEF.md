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
- A student can prepare for their in-course exams/tests across their
  faculty's curriculum, the same way UTME preps for entrance exams.
- The app curates a student's habits, results, and rank — building the
  credibility profile that feeds a sister app responsible for actual
  internship/fellowship/scholarship/apprenticeship listings and matching.
  GrantApp CGPA is not itself the placement/listings engine — it produces
  the signal that placement decisions are made on.
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
Draft — confirmed faculty list and agency-scope correction from founder
interview. Ready for INVARIANTS.md, DATA_DICTIONARY.md, PERMISSIONS.md,
and DECISIONS.md to be built on top of it. Open: the name and integration
contract of the sister listings/placement app.
