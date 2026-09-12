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
