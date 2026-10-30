# LANES.md — who may write what, window budget, and the first cards

This is the access-and-ownership map required by BUILD-DOCTRINE section 4, item 9. It also sets the working rules for the three agents on the free plan.

## 1. Lanes

| Agent | Lane | May write | Must not write |
|---|---|---|---|
| manchi (head, agent 001) | Architecture, offline engine, packs, `static/packs/**`, vetting, merge gate, release | Anything not exclusive to another lane | Nothing is off limits, but antitheft files change only with Iman's word |
| obase | Content depot | `content/**`, `scripts/extract-course-map.py`, migrations numbered 0100–0199 (content seeding only) | `src/**`, other scripts |
| sloww | Interface | `src/routes/**` (pages only, not `api/`, not `*.server.ts`), `src/lib/components/**`, `src/app.css`, `static/**` except `static/packs/**` | `src/routes/api/**`, auth, service worker, migrations |
| iman | Capital files, audit, export, compliance | Root `*.md` except `DECISIONS.md` and `INVARIANTS.md` (founder and manchi only), `handoff/**` (own section of `pausa.md` only), `scripts/export-db.py`, migrations 0200–0299 (documentation and RLS fixes only) | `src/**` |

Lanes were inferred from `DECISIONS.md`: obase built the `/faculties/*` tree, sloww built the Tools screens and calculators. Migration ranges: manchi 0020–0099, obase 0100–0199, iman 0200–0299. Shipped migrations 0001–0020 are never touched.

## 2. Window budget (obase, sloww, iman)

Assumption: one 5-hour free window per agent per day. The plan fills four hours and leaves one deliberately empty, because tool latency and rejected pushes always eat it.

| Block | Time |
|---|---|
| Read-in: digest, `pausa.md`, your card | 15 min |
| Up to 3 cards | 60 min each at most |
| Reserve: fixes, a rejected push, writing `pausa.md` | 45 min |

Stop rules:
- A card that is not green at 75 minutes stops. Commit nothing broken, write the blocker into `pausa.md`, start the next card.
- At four hours elapsed, stop. Push whatever is green and write `pausa.md`.
- A missing fact becomes `[OPEN]`. Do not search the repo broadly: read the files the card names, plus three more at most.
- Work on a branch and open one pull request per card; never commit to `main`. One commit may change at most 200 lines. Content commits have no question cap (founder decision, 2026-10-30).
- Head review: manchi reads `git log` since the last review once per window. A bad commit is fixed forward by a new commit, never rewritten.

## 3. Card template

`ID · Owner · Goal · Read · Write · Do · Done when · Commit message shape · Estimate`

## 4. Cards — first window

### C-O1 · DONE 2026-10-30 by manchi (script `scripts/sql-to-depot.py`) — kept for the record
**Goal:** the 56 approved questions become 7 JSON files in the depot, so later steps can build packs from them.
**Read:** `supabase/migrations/20260916052227_cgpa_0012_keystone_questions_pending_review_batch1.sql` (rows grouped by `course_id` comments), `supabase/migrations/20261001173918_cgpa_0015_approve_batch1_keystone_questions.sql`, the docstring of `scripts/check-content.py`, `content/taxonomy.json`.
**Write:** these seven files only.

| Course (SQL comment) | File | `faculty_slug` | `department_slugs` |
|---|---|---|---|
| Anatomy I (39) | `content/medicine/anatomy-i.json` | medicine | `["human-medicine"]` |
| Pharmacology I (160) | `content/pharmacy/pharmacology-i.json` | pharmacy | `["pharmacy"]` |
| Anatomy for Nursing (168) | `content/nursing/anatomy-for-nursing.json` | nursing | `["nursing-science"]` |
| Nigerian Legal System (24) | `content/law/nigerian-legal-system.json` | law | `["common-law"]` |
| Engineering Mathematics I (9) | `content/engineering/engineering-mathematics-i.json` | engineering | `["*"]` |
| GST101 (183) | `content/general-studies/gst101.json` | general-studies | `["general-studies"]` |
| Principles of Toxicology (194) | `content/science/principles-of-toxicology.json` | science | `["environmental-management-and-toxicology"]` |

**Do:** ids `q001`–`q008` in SQL order. `status` is `approved`. Strip the `[PENDING REVIEW] ` prefix from every explanation. Copy prompts, options, answers, tags and difficulty exactly. Do not reword, fix or add questions: changes belong to a later card.
**Done when:** the files exist, they hold 56 questions in total, and `python3 scripts/check-content.py` exits 0. Expected warnings, to be listed in the commit body and left unfixed: one prompt that appears in both Anatomy files (heart chambers), and answer-position bias in some files.
**Commit:** `content: move batch1 (56 questions) from SQL into the JSON depot`. The body says why: ids in SQL are not portable and the offline packs need a depot.

### C-O2 · obase · Course map extractor (60 min)
**Goal:** one machine-readable list of every seeded course, so the validator and pack builder can confirm a course exists.
**Read:** the course-seeding migrations `…_cgpa_0007_…`, `…_0008_…`, `…_0011_…`, `…_0013_…`, `…_0019_…`, `…_0020_…`, and `…_0016_course_slug.sql` for the slug rule: `lower(regexp_replace(coalesce(code, name), '[^a-zA-Z0-9]+', '-', 'g'))`.
**Write:** `scripts/extract-course-map.py`, then its output `content/course-map.json`.
**Do:** parse the `values (...)` tuples with the standard library only. Emit `{faculty_slug, department_slug, year, name, code, kind, slug}` per course. Print counts per faculty.
**Done when:** the script runs with `python3` and no arguments, the output has no duplicate `(department_slug, slug)` pair, and every course named in C-O1 appears.
**Commit:** `content: generate course-map.json from the seed migrations`.

### C-O3 · obase · ON HOLD — the founder sources questions
Founder decision 2026-10-30: he generates or sources questions by hand and manchi reviews and tags them (intake: `inbox/README.md`). obase writes questions only if the founder asks. After C-O2, obase waits for a new card.

### C-S1 · sloww · Touch targets and safe areas (30 min)
**Goal:** the known gaps in `PROJECT_BRIEF.md` status: buttons under 44 px, no notch handling.
**Read:** `src/app.css`.
**Write:** `src/app.css` only.
**Do:** give `.btn` a `min-height` and `min-width` of 44px. Add `env(safe-area-inset-*)` padding to the page container and any fixed element. No colour or wording changes.
**Done when:** CI is green and `grep -n "44px" src/app.css` shows the rule.
**Commit:** `ui: 44px touch targets and safe-area insets`.

### C-S2 · sloww · Skeleton loader (45 min)
**Goal:** a loading placeholder so slow connections never show a blank page.
**Read:** `src/app.css` (existing tokens), `src/routes/dashboard/+page.svelte`.
**Write:** `src/lib/components/Skeleton.svelte` (props: `lines`, `height`), and use it in `src/routes/dashboard/+page.svelte` only.
**Do:** use existing CSS tokens. No animation library. Respect `prefers-reduced-motion`.
**Done when:** CI is green.
**Commit:** `ui: Skeleton component, first use on the dashboard`.

### C-I1 · iman · BRAND.md (40 min)
**Goal:** the presentation-layer counterpart to `INVARIANTS.md`, required by doctrine section 3 and still missing.
**Read:** `src/app.css`, `static/manifest.webmanifest`, `EXPERIENCE_CONTEXT.md`.
**Write:** `BRAND.md`.
**Do:** record the real tokens (colours, type, spacing, radii) exactly as they appear in `app.css`. Invent no value. Anything unclear is `[OPEN]`.
**Done when:** every token in `app.css` is listed once, with where it is used.
**Commit:** `docs: BRAND.md from the tokens in app.css`.

### C-I2 · iman · DATA_DICTIONARY drift report (60 min)
**Goal:** find where the dictionary and the migrations disagree.
**Read:** `DATA_DICTIONARY.md`, all migrations 0001–0020.
**Write:** `handoff/drift-report.md`. Do not edit `DATA_DICTIONARY.md`.
**Do:** list every table or column present in the migrations but absent from the dictionary, and the reverse. Quote the file and line for each.
**Done when:** every table in `supabase/migrations` appears in one of three lists: matched, missing from the dictionary, or stale in the dictionary.
**Commit:** `docs: data dictionary drift report against migrations 0001-0020`.

### C-I3 · iman · Independent export script (60 min)
**Goal:** a periodic copy of the database that survives losing the platform (doctrine 7.7).
**Read:** the table list in migrations 0001–0020.
**Write:** `scripts/export-db.py`, and an `export/` line in `.gitignore`.
**Do:** read the project URL and service key from environment variables only. Never print or log the key. Page through each `cgpa` table through the PostgREST API with the `Accept-Profile: cgpa` header and write one JSON file per table under `export/<UTC date>/`. A `--dry-run` flag lists the tables and does no network call. The output holds student data, so it is never committed to this repository.
**Done when:** `python3 scripts/export-db.py --dry-run` lists every table and exits 0.
**Commit:** `ops: independent database export script, dry-run first`.

## 5. Cards added 2026-10-30

### C-S3 · sloww · Navigation between pages, analytics, settings and back (two windows)
**Goal:** the founder likes the styling and calls the navigation amateur. You have full creative latitude inside the existing design tokens.
**Read:** `src/routes/+layout.svelte`, `src/app.css`, `EXPERIENCE_CONTEXT.md`, the dashboard page.
**Write:** `src/routes/+layout.svelte`, new components under `src/lib/components/nav/`.
**Do:** one consistent way to reach home, courses, analytics, transcript and settings from any page on a phone; a back control that always works; no dead ends. Touch targets 44 px. Phones as small as 360 px wide.
**Done when:** CI green, and the pull request lists every top-level route with the number of taps to reach it (two or fewer).

### C-S4 · sloww · Year switching without blocking
**Goal:** a student states their current year but may open any year's tests. Nothing is locked by year.
**Read:** `src/routes/faculties/[facultySlug]/[deptSlug]/+page.svelte`.
**Write:** that page and one new component.
**Done when:** CI green; the page shows all years, marks the student's own, and lets them switch.

### C-S5 · sloww · Faculty lock and a skippable tour
**Goal:** after onboarding, a student sees their own faculty's pathway and not the others'; general and shared courses (GST, common Maths) stay visible to everyone. The tour walks the routes end to end and can be skipped.
**Read:** `src/routes/+layout.server.ts` (read only), `src/routes/onboarding/`, `src/routes/faculties/`.
**Write:** pages and components only.
**Stop rule:** if the student's faculty is not available to the page from existing load data, write `[OPEN]` in `pausa.md` and stop. Do not edit a `*.server.ts` file.

### C-S6 · sloww · Analytics shimmer
**Goal:** shimmer on the analytics cards for liveliness, not loading state. Use `src/glow-shimmer-motion.css`; stop animation under `prefers-reduced-motion`.
**Write:** the analytics page and its components.

### C-I4 · iman · COMPLIANCE.md data inventory (60 min)
**Goal:** list every personal-data field the app collects.
**Read:** migrations 0001–0020 and `src/routes/signup/`, `src/routes/onboarding/`.
**Write:** `COMPLIANCE.md`.
**Do:** one table: field, purpose, where stored, who can read it (from the RLS policies), how it is deleted today. Mark every decision about consent, age, retention or deletion `[FOUNDER]`; you never decide them. Add a breach runbook skeleton: who is told, the regulator's 72-hour clock (`DECISIONS.md` 2026-10-30, Data Protection Act s.40), and what is logged.
**Done when:** every table with student data in `supabase/migrations` appears.

### C-I5 · iman · PERMISSIONS.md and NOT_NOW.md (45 min)
**Write:** `PERMISSIONS.md` (who may read and write each table, taken from the RLS policies) and `NOT_NOW.md` (copy section 8 of `PRODUCTION_PLAN.md`, one line each, with why it waits).

## 6. Cards added after the engine landed
Full text, order and the capstone are in `handoff/ASSIGNMENTS.md`.
- obase: C-O4 (`--queue`: SOURCING_QUEUE.md), C-O5 (`--coverage`: COVERAGE.md).
- sloww: C-S7 (saved-on-phone badge), C-S8 (restyle `LocalTest.svelte`, markup and styles only).
- iman: C-I6 (`handoff/DELETION.md`), C-I7 (`handoff/AIRPLANE_TEST.md`).
- manchi: E10 in `PRODUCTION_PLAN.md`. E3 to E5 and the data side of E9 are built.
