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

## `exam_prep_activity` `[OPEN]`
Tracks the "deliberate prep for maxing exams/tests" behavior
(INVARIANTS §2) that the habits/rank profile is built from. Placeholder
only — needs its own design pass, likely echoing (but not necessarily
reusing — see PROJECT_BRIEF "explicitly out of scope") the shape of
grantapp-shell's taxonomy/mastery tracking.

| Column | Meaning | Sensitive? | Who may write |
|---|---|---|---|
| `student_id` | FK → `students.id` | No | System |
| `activity_type` | What kind of prep action this is | No | System |
| `result_data` | Outcome of the prep activity | Yes — feeds rank, treat as sensitive | System |

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
