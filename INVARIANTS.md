# INVARIANTS.md — GrantApp CGPA

Numbered, status-tagged rules that must survive any redesign. Update the
moment a rule changes — never silently.

Status legend: `[CONFIRMED]` founder-stated · `[OPEN]` deliberately
undecided, flagged rather than guessed · `[PROPOSED]` agent-suggested,
awaiting confirmation.

## Grading & academic model

1. `[CONFIRMED]` The app models real university grading scales per
   Nigerian university norms (e.g. 5.0/4.0 CGPA systems, First Class /
   Second Class Upper (2:1) / Second Class Lower (2:2) / Third Class /
   Pass classifications) — this is not abstracted away or simplified.
2. `[CONFIRMED]` Grading exists in service of deliberate exam/test
   preparation — the goal is helping a student maximize ("max out")
   their actual exam/test results, not just record them after the fact.
3. `[OPEN]` Which grading scale(s) apply per faculty — whether all 7
   starting faculties (Medicine, Pharmacy, Biochemistry, Microbiology,
   Law, Economics, Insurance) share one university-grading model or
   have faculty-specific variations — is undecided.

## Data lifecycle

4. `[CONFIRMED]` A student's habits/results/rank profile is not deleted
   when they stop using the app or graduate. It converts into two durable
   artifacts: (a) a transcript, and (b) a "GrantApp Wrapped"-style
   retrospective summary of their academic journey.
5. `[OPEN]` The exact contents, format, and generation trigger for the
   transcript and the "Wrapped" artifact are not yet defined — belongs in
   DATA_DICTIONARY.md once scoped.
6. `[OPEN]` Whether "graduate" is a state the app can detect automatically
   (vs. a student self-reporting it) is undecided.

## Cross-app data sharing (sister listings/placement app)

7. `[CONFIRMED]` The sister app (listings/placement) may NOT read a
   student's profile automatically or by default. Sharing requires
   explicit, per-student opt-in — there is no shared-backend/implicit-
   access shortcut, regardless of how technically convenient that would
   be.
8. `[OPEN]` What "opt-in" covers — the whole profile vs. selected fields,
   one-time vs. revocable, per-listing vs. blanket — is undecided and
   belongs in PERMISSIONS.md once resolved.
9. `[OPEN]` The sister app's name and the technical shape of the handoff
   (API, shared DB view, export file, etc.) are undecided — belongs in
   DATA_DICTIONARY.md.

## Scope boundary (carried from PROJECT_BRIEF.md)

10. `[CONFIRMED]` GrantApp CGPA does not build or operate the
    internship/fellowship/scholarship/apprenticeship listings and
    matching itself — that is the sister app's job. CGPA's responsibility
    ends at producing a trustworthy habits/results/rank profile.
