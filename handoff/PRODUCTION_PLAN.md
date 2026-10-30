# PRODUCTION_PLAN.md — GrantApp CGPA, December window

Owner: manchi (head). v2, 2026-10-30, after the founder's final-lap answers (`DECISIONS.md` 2026-10-30). Exams begin in December; freeze is 2026-11-30.

## 1. Where the build stands (measured)

| Area | Fact |
| --- | --- |
| Content | 56 approved questions in 7 courses, out of roughly 200 seeded courses (a pattern count, so approximate). Target: at least 500 across all faculties in the first install. |
| Depot | `content/` holds the 56 as JSON. `scripts/check-content.py` exits 0 with 11 expected warnings. |
| Packs | `scripts/build-packs.py` builds 7 packs and a manifest from the depot. Packs carry answers and explanations. 56 questions weigh 7.9 KB compressed. |
| Build | `npm run check`: 0 errors. `npm run build`: passes. It failed on a fresh clone before today because `tsconfig.json` hid the generated `$env` types. |
| App weight | Client JavaScript 87 KB, CSS 29 KB, fonts 342 KB, icons about 250 KB, all compressed. About 0.7 MB in total. |
| Service worker | Registered. The built pages carry the registration snippet and SvelteKit has `service_worker: true`. `PROJECT_BRIEF.md` is wrong on this point. |
| Exam path | Still needs the network: `quick-test-session`, `check-mastery-answer` and `submit-*` are live calls. The offline engine is not built. |
| CI | `.github/workflows/ci.yml` runs the validator, pack freshness, check and build on every push. |
| Hosting | One Supabase project for CGPA and UTME, split by schema, at the free two-project cap. No staging database. No usage numbers exist. |

## 2. Decisions that shape this plan
- Everything works offline. Online is for updates, feedback and progress. Answers ship with the questions.
- At least 500 questions in the first install, across all faculties. Weekly updates stay under 50 MB and always ask first.
- Nothing is cut. The date does not move. Budget stays zero. The plan therefore carries no cut order; the capacity facts in section 7 are the early warning instead.
- manchi reviews, tags and approves every question and gates every merge. The founder generates or sources questions by hand (`inbox/`). sloww builds screens, the iman agent writes audit and compliance files, obase maps courses.
- The app working end to end outranks question count. Content numbers below are pace markers, not gates. All money is donation; a subscription donation unlocks a special tier. All ages are welcome. Data is deleted on request.
- Agents other than manchi work on GitHub web: one branch and one pull request per card; CI decides green.

## 3. The decathlon

| # | Event | Owner | Done by | Status | Proof |
| --- | --- | --- | --- | --- | --- |
| E1 | Question depot and validator | manchi | Nov 3 | **Done Oct 30** | Validator exits 0 on all 56 |
| E2 | Pack builder and manifest | manchi | Nov 7 | **v1 done Oct 30** | `build-packs.py --check` passes in CI |
| E3 | Offline engine: IndexedDB store, pack download with hash check, local test and grading, attempt queue | manchi | Nov 8 | **Library done Oct 30** (`src/lib/offline/`, 13 tests in CI). Pages not wired yet | `npm test` green |
| E4 | Offline Quick Test screens, feedback, sync on reconnect | manchi, sloww | Nov 14 | Needs open item 1, migration 0021 and `/api/submit-offline-attempt` (below) | Airplane-mode run: open a course, sit a test, see answers; queued attempt reaches the server once |
| E5 | Update channel: manifest check on launch and on `online`, ask first, 50 MB ceiling | manchi | Nov 18 | Waits for E3 | A new release reaches a phone by downloading only the changed pack |
| E6 | Content grows continuously | founder sources, manchi reviews and tags | Pace markers: 150 by Nov 6, 300 by Nov 13, 450 by Nov 20, 520 by Nov 27 | Intake built (`inbox/`) | Validator green, then reviewed. Missing a marker holds no other event |
| E7 | Navigation redesign, year switching, faculty lock and tour, analytics shimmer, touch targets, skeleton | sloww | Nov 14 and Nov 21 | Not started | Pages work on a small screen; checks green |
| E8 | `BRAND.md`, drift report, export script, `COMPLIANCE.md` data inventory | iman agent | Nov 13 | Not started | Files exist; dry-run passes |
| E9 | Donation tier: a subscription donation unlocks a special tier | manchi | Nov 21 | **Blocked** on what the tier contains, account or device, and the routing rule | An unlocked account stays unlocked offline |
| E10 | Hardening and freeze: rollback rehearsal, Android 7 test, restore drill, load check | all, manchi gates | Nov 27–30 | Not started | Release tag |

## 4. Offline design
- **Packs.** One JSON pack per course, named by content hash (`static/packs/{faculty}/{course}.{hash8}.json`). Each question carries id, prompt, options, correct option, explanation, tags, difficulty. `manifest.json` lists every pack with `sha256`, size, count, `released_on` and a `starter` flag.
- **First install.** The `starter` packs are fetched and stored together so the app opens with at least 500 questions. `build-packs.py` picks them round-robin across faculties.
- **Storage.** IndexedDB, not `localStorage`. Three stores: packs, attempts, meta.
- **Tests.** Questions are drawn from stored packs, graded on the phone, and shown with answer and explanation. Timing of feedback (after each question or after the test) is open item 1.
- **Grading of record.** Each attempt is stored with a UUID. On reconnect it is sent to the existing submit endpoint, which grades again on the server. A retry cannot create a second row.
- **Updates.** The manifest is fetched network-first and is never cached long. Only packs whose hash is missing are downloaded, and only after the student agrees.
- **Server side of the sync.** Depot ids (`q001`) are not database ids, and the existing `submit-quick-test` takes database ids. A new endpoint, `/api/submit-offline-attempt`, takes `{attempt_id, course_key, answers}`, looks questions up by natural key and ignores a repeated `attempt_id`. It needs migration 0021: `depot_key` and `depot_qid` columns on `keystone_questions` (filled for the 56 existing rows by matching prompt text) and an `offline_attempts` table with its policy in the same file. manchi drafts it; the founder applies it, because the only Supabase project this session can see belongs to another business.
- **Service worker.** `/packs/*` is excluded from the shell precache so a release never re-downloads every pack.
- **What this gives up.** Answer keys now sit on every phone. A determined person can copy the bank. Any lock held on the phone can be bypassed. Only features that need the server can be enforced.

| If this fails | The student still can |
| --- | --- |
| Supabase down or paused | Open a stored pack, sit a test, queue the result |
| Vercel unreachable | Use the app and packs already stored by the service worker |
| No signal at exam time | Everything above, then sync later |

## 5. Content rules (cards C-O3 onward)
- University level for the named course, not secondary-school recall. At least half the questions at difficulty 3 or above.
- At least three tag combinations in every 40 questions, drawn only from `content/taxonomy.json`.
- No answer letter correct in more than 35% of a file.
- Each explanation says why the right option is right and why the nearest wrong option is wrong. No invented citations.
- Agents write `status: "pending"`. manchi sets `approved` after the checklist in `handoff/VETTING.md`.
- No prompt repeated anywhere in the depot.

## 6. Open items (named, not guessed; full text in `DECISIONS.md`)
1. Feedback after each question or after the whole test.
2. What the special tier contains, and whether it belongs to the account or the device.
3. The faculty-based routing rule across Supabase accounts, and how sign-up finds its database before a faculty is chosen.
4. The sticky widget, keyboard or overlay needs a native Android app.

Settled on 2026-10-30: money is donation, all ages welcome, the founder files the registration, data is deleted on request, manchi reviews and tags.

## 7. Risks
- **Content volume.** The founder sources questions by hand, so volume follows his time. The app must work end to end with whatever is approved; 56 questions is enough to prove that.
- **Correctness.** manchi is the only reviewer. The validator checks format, not truth, so manchi derives each answer (`handoff/VETTING.md`) and holds anything uncertain.
- **No staging database.** Migration files are written and reviewed; free agents never apply them.
- **Free-tier pause.** A paused project means no sign-in and no grading. Packs keep tests running; sign-in must also work from the stored session.
- **Android 7.** The newest Chrome that Play supplies for Android 7 is unverified. The build target and the engine avoid recent browser features until a test phone confirms.
- **Shared project.** A UTME spike and a CGPA exam week land on one instance.

## 8. Outside the December window
- Sticky widget, keyboard and overlay (item 8), and the sidebar over PDF and Word files.
- Sidebar tier C (generating questions from a page with a model).
- Lagoslife: a module reads the same packs through one call. No build in this window.
- Adding the app to iPhones outside the App Store: to be explored after the app is built.
- An API for outside developers.
