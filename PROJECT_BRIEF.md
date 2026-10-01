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
Any student, at any school. No institutional gatekeeping — self-serve,
like GrantApp UTME. A student locks their faculty/department (and
implicitly their course) at signup, in the same request as account
creation — not a later onboarding step.

As-seeded faculties (9, catalog.ts — supersedes any earlier 7-faculty
list, which was never actually built): Science, Engineering, Law,
Medicine, Pharmacy, Nursing, General Studies, Economics, Insurance.
Four of these are launch-priority per explicit founder ordering —
Medicine, Cybersecurity (dept. under Science), Environmental Toxicology,
Medical Laboratory Science (dept. under Medicine) — but all four
currently have zero course content seeded; they're browsable, empty
department pages.

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
- Institution-specific/partner deployments (e.g. a TCC-style single-school
  build) — this is the any-student-any-school version.
- Building or operating the internship/fellowship/scholarship/
  apprenticeship listings and matching itself — that's a sister app's job.
  CGPA's job ends at producing a trustworthy habits/results/rank profile;
  how that profile is consumed by the sister app is that app's concern,
  though the handoff contract between the two (what data crosses, in what
  shape) belongs in DATA_DICTIONARY.md once defined.

## Resolved since draft
- Taxonomy/mastery cognitive-profiling engine: reused from GrantApp UTME
  (grantapp-shell) as the starting shape, not built separately — see
  INVARIANTS.md #17. Not a static inheritance: CGPA's real vocabulary is
  expected to grow well past UTME's fixed set as real degree-breadth
  content gets tagged.
- Faculty count: the originally-drafted 7 faculties were never actually
  seeded. Real build has 9 (see "Who for" above) — brief corrected to
  match reality rather than keep re-surfacing as a doc/build mismatch.
- Programme (faculty+department) is now locked at signup, in the signup
  request itself — not a separate post-signup onboarding step.
- Device antitheft is built and solid (fingerprint, 2-device cap enforced
  at signup and every login, self-serve removal, no admin path) — see
  INVARIANTS.md #18-21. The gap closed by this update was documentation
  only; the mechanism itself needed no fixes.

## Status
Live build, iterating. Core loop (signup+programme-lock → browse catalog
→ enroll → Quick Test / 100-day Mastery → dashboard/mastery tracking) is
confirmed working end-to-end. Capital files were running behind the
actual build for a while (see "Resolved since draft") — this pass
reconciles them. Known real gaps going forward: service worker exists
but is never registered (offline infra currently inert on-device); no
touch-first nav/bottom-tab-bar; zero page-transition animation; .btn
touch targets under the 44px minimum; no skeleton/loading-state
component; no safe-area-inset handling for notched devices. Also open:
the name and integration contract of the sister listings/placement app;
exactly how school/lecturer-specific submissions are vetted before
joining the keystone bank; whether "graduate" is auto-detected or
self-reported; the 4 priority courses' zero content; Cybersecurity's
placement under Science and Medical Lab Science's placement under
Medicine are reasonable-guess assumptions, not founder-confirmed.
