# DECISIONS.md — GrantApp CGPA

Append-only log of founder decisions that resolved a genuine fork —
not a running commentary, just the decision, the date, and enough
context that INVARIANTS.md/DATA_DICTIONARY.md's cross-references back
to this file mean something. Never edit a past entry; if a decision
changes, add a new entry that supersedes it and say so explicitly.

---

## 2026-09-11 — Infrastructure ownership
**Decision:** Shared Supabase project with UTME, separated by Postgres
schema (`cgpa` vs UTME's `public`) — not a new project.
**Context:** The org is at its free-tier 2-project limit (confirmed by
an actual rejected project-creation attempt, not assumed) — the same
limit found earlier this session when checking grantapp-shell's org.
Schema-level separation keeps no table names colliding and no RLS
policy crossing schemas, matching the doctrine's "fully separate
suites" rule as closely as one Postgres instance allows. Both schemas
share `auth.users` (one login can hold both a UTME and a CGPA account)
— that's the only shared surface, same as ROLE_ADMIN being the one
deliberately shared tool across both products. See
`supabase/migrations/20260911070251_cgpa_0001_init.sql`.
**Vercel:** still unresolved as of this entry — check current project
list before assuming either way.

## 2026-09-11 — Taxonomy/mastery engine
**Decision:** Reuse GrantApp UTME's taxonomy engine as the starting
shape (multi-tag arrays across a cognitive-pattern axis and an
information-type axis), not a separate scheme built from scratch.
**Context:** PROJECT_BRIEF had flagged this explicitly as undecided.
Founder's stated condition: CGPA's real vocabulary will need to grow
well past UTME's fixed set, since a whole degree across 7 faculties has
far more curriculum breadth than UTME's national syllabus — "iterative."
**Resolved as:** INVARIANTS.md #17, and the new `taxonomy_tags` table in
DATA_DICTIONARY.md (a real, growable table seeded with UTME's exact
baseline as `scope: global`, extended per-faculty as real content
surfaces gaps) rather than a hardcoded value list.

## 2026-09-11 — Visual brand
**Decision:** Another agent is forking the grantapp-shell codebase as
CGPA's starting point (not a from-scratch build, not an extracted
shared-package approach).
**Context:** Asked whether CGPA gets a standalone brand/BRAND.md or
shares grantapp-shell's design tokens via a real package; founder's
answer describes a third option (repo fork) neither offered choice
anticipated. BRAND.md still needs writing once the fork lands and it's
clear what, if anything, gets reskinned versus kept as-is.

## 2026-09-11 — Visual brand SUPERSEDES the entry above
**Decision:** NOT a full grantapp-shell repo fork. Only the design
tokens/style guide (grantapp-shell's DESIGN_SYSTEM.md + the reusable
parts of app.css — surfaces, typography, buttons, forms, the grain
overlay) get reused. Everything else — routes, auth flow, schema,
onboarding, quiz-UI — is a custom SvelteKit app built directly to
cgpa-state-of-play.md, not derived from grantapp-shell's code.
**Context:** Two different builds were in flight simultaneously — one
agent had started a full-repo fork (the entry directly above this one),
another had already scaffolded a from-scratch app reusing only the
design tokens, on the understanding that "fork" meant style guide only.
Founder's explicit resolution: keep the custom app, stop the full-repo
fork.
**Status as of this entry:** the custom app (auth: signup/login, device
fingerprinting, 2-device self-serve limit; schema: cgpa.students/
faculties/departments/courses/devices) is built and pushed. If the
other agent's full-repo fork produced anything not yet superseded by
this entry, it should be discarded in favor of the custom build,
not merged alongside it.

## 2026-09-13 — Onboarding-flow merge EXECUTED
**Status update to the 2026-09-12 19:57 UTC entry above:** the merge
strategy recorded there has now been carried out (commit 280f747,
performed by Sloww standing in for Arty, who is currently paused).
`obase`'s `/faculties/*` route tree is live on `main` as the canonical
onboarding flow; `sloww`'s parallel `/onboarding/*` routes have been
deleted. All of `sloww`'s other screens (Tools nav, Transcript tracker,
Path-to-first-class, CGPA calculator/converter, Upload Course Material,
WhatsApp Groups) are merged in and rewired to point at `/faculties/*`.
Migration filename collision resolved (sloww's two migrations renamed
0003->0005, 0004->0006). EXPERIENCE_CONTEXT.md and glow-shimmer-
motion.css from the beforemerge_12-09/ upload are now live at their
real paths and wired into the app. Full build verified clean post-merge.

## 2026-10-30 — Final-lap answers (offline-first, ownership, money, compliance)
**Source:** the founder's answers to the intake doc ("GrantApp CGPA —
Context, Standards and Invariants") and his closing notes. Recorded as
stated. Items that conflict with an earlier invariant, with the law as
read, or with another answer are listed under **Unresolved** and are
NOT silently resolved.

**Decided**
- **Offline first.** The whole app installs on the phone with at least
  500 questions across all tracks. Online is for updates, feedback and
  progress only. A weekly update never exceeds 50 MB and the app always
  asks before downloading in the background.
- **Answers ship with the questions (fork F-1 = yes).** Correct answer and
  explanation live on the device so a test works end to end offline.
  This SUPERSEDES the CGPA default that answer keys stay on the server.
  Auth and device-binding files remain founder-only.
- **Ownership.** manchi (agent 001) vets questions, gates merges and
  applies migrations; obase writes content; sloww owns screens and
  navigation with full creative latitude; the iman agent owns audit
  files, export, permissions, API and "govtech". Student data requests
  reach the founder on WhatsApp, who routes them. Compliance decisions are
  never made by an agent alone.
- **Questions.** One bank serves every department that carries the same
  course (F-2 = yes). Build the entire platform whatever the December
  course list (F-3). Tag `Computation (skill)` is kept (F-4).
- **Onboarding and session.** Biodata, programme and target scores are
  taken at onboarding; a remember-me session is kept on the device.
- **Navigation.** Years are never blocked: a student states their year and
  may take any year's tests. After a skippable tour, a student does not see
  other faculties' pathways. Analytics gets shimmer animation. The navigation
  between pages, analytics and settings is to be redesigned.
- **Money.** Budget stays zero. Features unlock after payment via a
  WhatsApp link (profile to be supplied). Donations fund the other
  programmes. Traffic is to be spread over several Supabase accounts for
  the same project.
- **Working setup.** manchi runs in the desktop app and the VS Code
  extension; the other agents run on the web and commit on GitHub web.
  Market is scholars and researchers only; an API for outside developers
  comes later.
- **Deletion and age.** Deletion is initiated by the client. The founder
  states there is no age limit.

**Unresolved (named, not guessed)**
1. Feedback timing: after each question, or after the whole test.
2. Deletion on request versus INVARIANTS #4 (profile never deleted).
3. No age limit versus a customer of 16 and the Data Protection Act,
   section 31, which requires a guardian's consent for a child.
4. Paid unlock versus Vercel Hobby (non-commercial only).
5. Whether the unlock belongs to the account or the device, and which
   features it covers.
6. Several Supabase accounts versus the 2-device cap and cross-device sync.
7. Who files the regulator registration ("myself" in one answer, "team"
   in another).
8. "Sticky widget, keyboard or network pop-up" needs a native Android app;
   the app is a web app.
9. Who sets `approved` on a question: manchi, or "an agent".
10. Fork F-5 (export location) answered "keep"; D-7 left blank, so its
    default applies: a push runs check and build automatically.

## 2026-10-30 (later) — Founder's replies to the listed conflicts
Replies to the ten "Unresolved" items in the entry above. Where a reply
settles an item it SUPERSEDES that part of the entry above; nothing above
is edited.

**Decided**
- **Money.** All money is donation. A subscription donation unlocks a
  special tier. (Replaces "paid unlock".) Vercel's Hobby terms exempt
  "asking for donations" from commercial use; whether a donation that
  unlocks a tier stays inside that exemption is Vercel's reading to make.
- **Age.** All ages are welcome. The university admission age in Nigeria is
  16 and anyone may test. There is no age gate. The Data Protection Act
  s.31 requires a guardian's consent for a child, and the Act takes its
  definition of child from the Child's Rights Act; the founder's decision
  stands as recorded, with that reading noted here.
- **Registration.** "Myself" and "team" are the same: the founder files.
- **Deletion.** Data is deleted on the client's request. This supersedes
  INVARIANTS #4 ("not deleted when they stop using the app").
- **500 and 10,000.** 500 questions in the first install, with answers and
  feedback on the device, do not threaten the target of up to 10,000
  questions per course (INVARIANTS #11). 500 is the install, not a ceiling.
- **Review and sourcing.** manchi reviews and tags every question and sets
  `approved`. The founder generates or sources questions manually and
  hands them over.
- **Priority.** The app working end to end outranks question count.
  Questions are a continuum; 10,000 will not arrive at once. Content
  numbers in the plan are pace markers, not gates.
- **Routing.** A faculty-based rule will route users to a Supabase account.
  The rule is to be supplied.

## 2026-10-30 (latest) — Founder's replies to the four open items

- **Feedback timing.** Feedback comes after the whole test, not after each
  question. A test is as long as the quick test is split today (the current
  question count per test is kept; no new length is set).
- **Two sign-ups.** *Normal* gives access to the 500-question install.
  *Manual* means the founder adds the person by hand to a database that
  qualifies them for constant updates to the app's question bank. The special
  tier is therefore the update stream, and it belongs to the account (a row
  the founder adds), not to the device.
- **Faculty.** The faculty is chosen at the very first sign-up. It is the key
  the routing rule uses. The mapping of faculty to Supabase account is still
  to be supplied; until then every faculty maps to the one existing project.
- **Sticky widget.** Built with the native apps once the offline web app is
  finished. It is outside the December window.

**Still open**
1. The faculty-to-Supabase-account mapping (one project today, so nothing
   blocks the build).
2. What manual sign-up holders receive beyond updates, if anything.
