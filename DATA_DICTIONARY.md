# DATA_DICTIONARY.md — GrantApp CGPA

Every table and column, in plain language. Sensitive columns are flagged
inline per §12.1 of the doctrine. Status tags match INVARIANTS.md:
`[CONFIRMED]` schema decided, `[OPEN]` shape not yet decided — listed as a
placeholder table/column set so nobody invents a second version of it.

Lifecycle states (active → inactive → archived → recycled) apply to
`students` and any other person/long-lived-entity table per doctrine §7.4.
No table here has RLS policies attached yet — do not treat any table
below as ready to migrate until an explicit RLS policy is written
alongside it (§7.2), in the same PR.

---

## `keystone_questions` `[OPEN — core table, needs priority design pass]`
The 10,000-question-per-degree bank (INVARIANTS §11). This is the
product's core content table — should be designed before the peripheral
tables below, not after. Placeholder shape only.

| Column | Meaning | Sensitive? | Who may write |
|---|---|---|---|
| `id` | Stable unique identifier | No | System |
| `faculty` / `course_code` | Which faculty/course this question belongs to | No | Content team / admin |
| `source` | `standard` (keystone bank) vs `user_submitted` (school/lecturer-specific, INVARIANTS §14) | No | System, set at creation |
| `verification_status` | Whether a user-submitted question has been reviewed — `[OPEN]`, review process undecided per INVARIANTS §15 | No | Admin/reviewer role — `[OPEN]` who that is |
| `content` | The question itself | No | Content team or student submitter |

## `lesson_notes` `[OPEN — core table, needs priority design pass]`
The "proper/standard lesson notes" content (INVARIANTS §13), plus
school/lecturer-specific submissions (INVARIANTS §14). Placeholder shape
only.

| Column | Meaning | Sensitive? | Who may write |
|---|---|---|---|
| `id` | Stable unique identifier | No | System |
| `faculty` / `course_code` | Which faculty/course | No | Content team / admin |
| `source` | `standard` vs `user_submitted` | No | System |
| `content` | The note itself | No | Content team or student submitter |

## `student_question_progress` `[OPEN]`
Tracks a student's progress toward the 10,000-question target
(INVARIANTS §11) — the mastery-engine equivalent of grantapp-shell's
mastery tracking, but scoped to a whole degree rather than one exam.
Whether this reuses grantapp-shell's taxonomy/mastery engine or is a
separate implementation is still an open architecture question
(PROJECT_BRIEF "explicitly out of scope").

| Column | Meaning | Sensitive? | Who may write |
|---|---|---|---|
| `student_id` | FK → `students.id` | No | System |
| `keystone_question_id` | FK → `keystone_questions.id` | No | System |
| `answered_at` / `result` | When answered and outcome | Yes — feeds rank | System |

## `opportunity_listings` `[OPEN]`
The internships / research community / survey-questionnaire demographic
content that makes clear what a given degree offers (INVARIANTS §16).
Distinct from the sister app's placement/matching function — this is
GrantApp CGPA's own "here's what exists for your degree" awareness
layer, not the application/matching pipeline itself. `[OPEN]` whether
this table overlaps with or feeds the sister app's listings at all.

| Column | Meaning | Sensitive? | Who may write |
|---|---|---|---|
| `id` | Stable unique identifier | No | System |
| `faculty` | Which degree/faculty this is relevant to | No | Content team / admin |
| `type` | internship / research community / survey-questionnaire / other | No | Content team |
| `description` | What it is | No | Content team |

## `students` `[OPEN — fields below are a starting proposal, not final]`
The core person-entity table. Lifecycle: active → inactive → archived
(→ recycled, if ever applicable).

| Column | Meaning | Sensitive? | Who may write |
|---|---|---|---|
| `id` | Stable unique identifier | No | System only |
| `faculty` | One of the 7 starting faculties (enum) | No | Student, at signup; immutable after unless an explicit transfer flow exists — `[OPEN]` |
| `school` | Institution name/free text — "any school" per PROJECT_BRIEF | No | Student |
| `status` | active / inactive / archived | No | System, per §7.4 rules — never a silent background job |
| `grading_scale` | Which grading-scale variant applies (5.0/4.0 etc.) | No | System, derived from faculty/school — `[OPEN]` whether this is faculty-wide or school-specific per INVARIANTS §3 |

## `academic_records` `[OPEN]`
Per-course, per-semester grade entries feeding the CGPA calculation.
Table name/shape placeholder only — the real grading-scale model
(INVARIANTS §1) needs to be finalized before columns are locked, since
First Class/2:1/2:2/Third/Pass classification logic depends on it.

| Column | Meaning | Sensitive? | Who may write |
|---|---|---|---|
| `student_id` | FK → `students.id` | No | System |
| `course_code` | Which course this record is for | No | Student or institution feed — `[OPEN]` |
| `grade_raw` | The actual score/grade earned | Yes — academic performance, treat as sensitive by default | Student-entered or verified import — `[OPEN]` |
| `semester` | Which academic term | No | Student |

## `exam_prep_activity` `[OPEN — superseded by student_question_progress above for keystone tracking]`
Generic prep-activity tracking, kept as a placeholder for any prep
behavior that isn't a keystone-question answer (e.g. lesson-note reading
time, practice sessions). Most of what this table originally covered is
now the dedicated `student_question_progress` table above — this one
narrows to "everything else."

## `transcript_exports` `[OPEN]`
The durable artifact a student's profile converts into per INVARIANTS §4
when they go inactive/graduate. Trigger, generation logic, and exact
contents are undecided (INVARIANTS §5) — this row exists in the
dictionary now only so the archival step in §7.5 ("archive before you
free anything") has a named destination once designed.

| Column | Meaning | Sensitive? | Who may write |
|---|---|---|---|
| `student_id` | FK → `students.id` (archived, not live) | No | System |
| `content` | The generated transcript itself | Yes — full academic history | System only |
| `generated_at` | When this snapshot was taken | No | System |

## `grantapp_wrapped` `[OPEN]`
The retrospective-summary artifact from INVARIANTS §4. No columns
defined yet — contents undecided (INVARIANTS §5).

## `placement_sharing_consent` `[OPEN — but the RULE governing it is CONFIRMED]`
Records a student's explicit opt-in before the sister listings/placement
app may read anything from their profile (INVARIANTS §7). This table
existing at all is not optional — automatic/shared-backend access is
explicitly disallowed, so some consent record must exist before any
cross-app read is implemented. Exact granularity (whole-profile vs.
field-level, revocable vs. one-time, per-listing vs. blanket) is
INVARIANTS §8, still open.

| Column | Meaning | Sensitive? | Who may write |
|---|---|---|---|
| `student_id` | FK → `students.id` | No | System |
| `sister_app_id` | Which requesting app/integration this consent covers | No | System |
| `scope` | What was consented to share — shape TBD per §8 | Yes — governs sensitive-data flow | Student only |
| `granted_at` / `revoked_at` | Consent timestamps | No | Student |

---

## Retention exceptions (§7.6)
`[OPEN]` — no ephemeral/session/cache tables defined yet. When any are
added (e.g. session logs, feed caches), their retention/cleanup rule goes
here explicitly rather than being left implicit.

## Cross-app handoff contract
`[OPEN]` — the technical shape of what crosses to the sister app (API
call, shared view, export file) is undecided per INVARIANTS §9. This
section is a placeholder until that's resolved — do not build an
integration against a guessed shape.
