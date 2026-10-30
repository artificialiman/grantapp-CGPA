# PRODUCTION_PLAN.md — GrantApp CGPA, December window

Owner: manchi (head). Drafted 2026-10-30. Exams begin in December, so the freeze is 2026-11-30. Everything below is sized to that date.

## 1. Where the build stands (measured, not assumed)

**Content.** 56 approved keystone questions across 7 courses, out of roughly 200 seeded courses (the course count is a pattern count over the seed migrations, so approximate). The target in INVARIANTS #11 is up to 10,000 questions per degree. The shape of the 56:
- Difficulty: 30 at level 1, 22 at level 2, 4 at level 3, none above.
- Correct answer position: `b` in 28 (50%), `a` in 19, `c` in 9, `d` never.
- Tags: three combinations only (40 Logical + Essential, 8 Pragmatic + Essential, 8 Pure Mathematical + Computation). The mastery engine weights by tag combination, so it has almost nothing to separate.
- One prompt appears twice (heart chambers, in both Anatomy courses). One tag, `Computation (skill)`, is not in the seeded vocabulary.

**Exam path.** Every step needs the network: `quick-test-session` loads the questions, `check-mastery-answer` returns correctness and the explanation, `submit-*` records results. The service worker deliberately skips `/api/*`, so no question can load offline today. `PROJECT_BRIEF.md` says the service worker is never registered. SvelteKit registers `src/service-worker.ts` by default and `svelte.config.js` does not turn that off, so the claim needs checking against a deployed build before anyone relies on it.

**Hosting.** CGPA shares one Supabase project with UTME, separated by schema (DECISIONS 2026-09-11), and the organisation is at the free two-project cap. There is no staging database. The only Supabase project visible to this session is named `tenderexam`; Tendercare is a separate business, so I did not query it and this plan contains no live usage numbers.

## 2. What December needs, in order
1. A student can sit a timed test on a bad connection.
2. The bank is deep enough to be worth sitting.
3. New questions reach devices cheaply and on a schedule.
4. The sidebar widget, as a study aid.

Lagoslife is an interface contract in this window and nothing more (section 8).

## 3. The decathlon

| # | Event | Owner | Done by | Proof |
|---|---|---|---|---|
| E1 | Question depot and validator | manchi, obase (C-O1) | Nov 3 | `check-content.py` exits 0 on all 56 questions |
| E2 | Pack builder and manifest (sealed packs) | manchi | Nov 7 | `scripts/build-packs.py` emits one gzipped pack per course plus a manifest with SHA-256 and sizes |
| E3 | Offline engine: pack cache, IndexedDB, submission queue | manchi | Nov 14 | Airplane-mode run: open a course, load its pack, start a test |
| E4 | Offline Quick Test, graded on reconnect | manchi, sloww (screens) | Nov 17 | Queued answers reach `submit-quick-test` on reconnect with no duplicate rows |
| E5 | Update channel: scheduled releases, manifest check on launch | manchi | Nov 20 | A new release reaches a device by downloading only the changed pack |
| E6 | Exam-depth content batches | obase writes, Iman approves | Gates Nov 6, 13, 20, 27 | Validator green, then approved by Iman |
| E7 | Low-end interface pass: touch, safe area, skeleton, install prompt | sloww | Nov 14 | Checks clean; run on one low-end Android phone |
| E8 | Capital files, drift report, export script | iman | Nov 13 | `BRAND.md`, `drift-report.md`, export dry-run |
| E9 | Sidebar extension, tiers A and B (no network needed) | manchi | Nov 24 | Works on a page with the network off |
| E10 | Hardening and freeze | all; manchi gates | Nov 27–30 | Restore drill, load check, release tag |

**Content ceiling.** A content commit holds at most 40 questions so it can be reviewed in one sitting. Planning figure: Iman reviews about 100 questions a week. That gives roughly 400 new questions by the freeze, about 8 to 10 courses at 40 to 50 each. More than that needs more reviewer hours, not more agents. Adjust the figure and the plan follows.

## 4. Offline design

**Sealed packs.** One gzipped JSON pack per course under `static/packs/`, holding id, prompt, options, tags and difficulty. No `correct_option_id` and no explanation, so no answer key leaves the server and the antitheft rule in `DOCTRINE_DIGEST.md` stays intact. The manifest lists `{course key, department_slugs, path, sha256, bytes, count, released_on}`.

**Size.** grantapp-shell measured about 134 bytes per question gzipped. At that rate 400 questions is about 54 KB and a full 10,000-question course about 1.3 MB. Questions with diagrams will cost more.

**Grading.** An offline attempt is stored in IndexedDB, not `localStorage`, with an idempotency key per attempt, then sent to the existing submit endpoint on reconnect. A retry cannot create a second row.

**Updates.** On launch and on the `online` event the app fetches the manifest (under 2 KB) and downloads only packs whose hash it lacks. Releases go out on a schedule from a GitHub Actions cron, with a manual push as the exception, which matches the cold-by-default rule in the CGPA doctrine.

**What sealed packs cannot do.** Instant right-or-wrong with an explanation after each answer, which is the Mastery flow. That flow needs the answer key on the device. See F-1.

**Named fallbacks (doctrine 2.5).**

| If this fails | The student still can |
|---|---|
| Supabase down or paused | Open a cached pack, sit a test, queue the result |
| Vercel unreachable | Use the packs already cached by the service worker |
| No signal at exam time | Everything above, then sync later |

## 5. Rules for exam-depth content (card C-O3)
- University level for the named course, not secondary-school recall. At least half the questions at difficulty 3 or above.
- At least three tag combinations in every 40 questions, drawn only from `content/taxonomy.json`.
- No answer letter correct in more than 35% of a file. The validator warns at 50%.
- Each explanation says why the right option is right and why the nearest wrong option is wrong. No invented citations, page numbers or textbook names.
- Every question is `pending`. Only Iman sets `approved`.
- No prompt repeated anywhere in the depot.

## 6. Forks and inputs for Iman
Each one blocks only the work named. If there is no answer, the default applies.

| ID | Question | Blocks | Default |
|---|---|---|---|
| F-1 | May the correct answer and explanation ship to the device, encrypted per device and time-limited, so Mastery practice works offline? | Offline Mastery only | No. Sealed packs only. |
| F-2 | Does one question bank serve every department that carries the same course? Engineering Mathematics I exists in 7 departments and batch1 is attached to the civil one alone. | Manifest shape (E2) | Yes: `department_slugs: ["*"]` |
| F-3 | Which courses do students sit in December? | C-O3 (E6) | None; content waits |
| F-4 | Ratify or replace the tag `Computation (skill)`. | Nothing; the depot mirrors it | Keep, scoped to engineering |
| F-5 | Where does the database export land, outside public GitHub repos? | Restore drill (E10) | Local only |

## 7. Risks
- **No staging database.** The free two-project cap leaves no second project. Free agents therefore write migration files and never apply them; manchi reviews each before it runs.
- **Free-tier pause.** Check the exact inactivity rule on the current plan before Nov 15. A paused project means no sign-in and no grading, which is what the named fallbacks cover.
- **Shared project.** A UTME spike and a CGPA exam week land on the same instance.
- **Reviewer time** is the content limit (section 3).
- **Free-agent output quality.** Controlled by the validator, the 200-line commit cap and the daily head review.

## 8. Outside the December window
- **Sidebar tier C** (generating questions from a page with a model): needs a server route and a per-student quota. After the freeze.
- **Lagoslife:** a module reads the same packs and receives results through one call, `startExam({course, count, seed})`. INVARIANTS #7 applies in spirit: no automatic read of a student's profile; the student opts in. No build in this window.
- **Business model, the play of each app and extension, and the standardised invariants** come next, in that order, as Iman set out.
