# ASSIGNMENTS.md — task sheets and the capstone

Issued by manchi (head, agent 001), 2026-10-30. Freeze: 2026-11-30. Exams begin in December.
Read first, in this order: `handoff/DOCTRINE_DIGEST.md`, `handoff/pausa.md`, this file, then your card in `handoff/LANES.md`.

## 1. The capstone

One proof closes the build: **an airplane-mode run on a real phone.**

| Step | What must happen | Built by |
|---|---|---|
| 1 | Open the app online once. The starter packs download by themselves. | manchi (`src/lib/offline/boot.ts`) — done |
| 2 | Switch the network off. Open `/offline`, pick a saved course. | manchi — done |
| 3 | Sit a 20-question test. Answers and explanations appear after the last question. | manchi — done; sloww restyles (C-S8) |
| 4 | Switch the network on, sign in. The result reaches the server once, and a second send changes nothing. | manchi — done; waits for migration 0021 |
| 5 | A manual account is offered an update, asks first, and downloads only the changed pack. A normal account is not offered one. | manchi — done; waits for migration 0022 |
| 6 | The same run passes on the oldest phone on the list (Android 7). | founder, with iman's checklist (C-I7) |

Each agent's cards below feed one of those steps or protect them. A card is finished when its pull request is green in CI and manchi has merged it.

## 2. Rules that apply to every card

1. One branch and one pull request per card. Never commit to `main`.
2. CI is the only judge of "green". Agents on GitHub web cannot run the build, so do not claim a build passed.
3. A commit changes at most 200 lines.
4. Stay inside your lane (`handoff/LANES.md` section 1). A file outside it is `[OPEN]` in `pausa.md`, not an edit.
5. Never decide consent, age, retention, deletion, money or wording. Mark it `[FOUNDER]` and move on. Copy is written by the founder; leave `COPY NEEDED` markers.
6. Migrations are written, never applied.
7. Overwrite only your own section of `pausa.md` at the end of each window.
8. Phones as small as 360 px wide; touch targets 44 px; nothing that needs a recent browser (the target includes Android 7).

## 3. obase — content depot

| Order | Card | Goal | Done when |
|---|---|---|---|
| 1 | C-O2 | `scripts/extract-course-map.py` writes `content/course-map.json` from the seed migrations | Script runs with no arguments; no duplicate `(department_slug, slug)`; the seven depot courses appear |
| 2 | C-O4 (new) | Add a `--queue` flag that writes `content/SOURCING_QUEUE.md`: every seeded course, ordered so courses carried by the most departments come first, then faculties in rotation. Mark courses that already have a depot file | The file lists all courses; the seven depot courses are marked done; counts per faculty are printed |
| 3 | C-O5 (new) | Add a `--coverage` flag that writes `content/COVERAGE.md`: per faculty, courses seeded, courses with questions, questions approved, questions pending | Totals match `python3 scripts/build-packs.py` (56 questions today) |

Do not write questions unless the founder asks (C-O3 is on hold). Questions arrive through `inbox/`; manchi reviews and tags them.

## 4. sloww — interface

| Order | Card | Goal | Notes |
|---|---|---|---|
| 1 | C-S1 | 44 px touch targets and safe-area insets | `src/app.css` only |
| 2 | C-S2 | Skeleton component, first use on the dashboard | |
| 3 | C-S3 | Navigation: every top-level route within two taps; a back control that always works | The layout already mounts `UpdatePrompt` (`src/lib/components/offline/`); keep that line. Add a link to `/offline` ("Saved courses") to the menu |
| 4 | C-S7 (new) | "Saved on this phone" badge on the course page and the course list. Read `packsStore.getAll()` from `$lib/offline/db` in `onMount`; compare `key` with `faculty/course`. Read only | Shows nothing when storage is unavailable; no write calls |
| 5 | C-S8 (new) | Restyle `src/lib/components/LocalTest.svelte`: the question screen and the review screen after the test. Change the markup and the `<style>` block only; do not touch the `<script>` block | A review item shows the question, the student's answer, the correct answer and the explanation; readable at 360 px |
| 6 | C-S4, C-S5, C-S6 | Year switching, faculty lock with a skippable tour, analytics shimmer | As written in `LANES.md` section 5 |

Feedback appears once, after the whole test. Do not add per-question feedback.

## 5. iman — capital files, audit, compliance

| Order | Card | Goal | Done when |
|---|---|---|---|
| 1 | C-I1 | `BRAND.md` from the tokens in `src/app.css` | Every token listed once with where it is used |
| 2 | C-I2 | `handoff/drift-report.md`: dictionary against migrations 0001–0022 | Every table is in one of: matched, missing from the dictionary, stale in it. `offline_attempts` and `access_grants` are included |
| 3 | C-I4 | `COMPLIANCE.md` data inventory and breach runbook skeleton | Every table holding student data appears; every decision is `[FOUNDER]` |
| 4 | C-I6 (new) | `handoff/DELETION.md`: what is removed, table by table, when a client asks for deletion (the founder's decision of 2026-10-30), and how the founder checks it is done | Lists every table keyed to a student, including `offline_attempts` and `access_grants`, and what happens to the copy stored on the phone |
| 5 | C-I7 (new) | `handoff/AIRPLANE_TEST.md`: the capstone run as a numbered checklist the founder can follow on a phone, with a pass/fail line for each step in section 1 | Plain wording; no step assumes a laptop |
| 6 | C-I3, C-I5 | Export script; `PERMISSIONS.md` and `NOT_NOW.md` | As written in `LANES.md` |

## 6. manchi — head

| Item | State |
|---|---|
| E1 depot and validator | Done |
| E2 pack builder and manifest | Done |
| E3 offline engine | Done (library, 16 tests in CI) |
| E4 offline Quick Test, sync endpoint | Code done. Migration 0021 awaits the founder |
| E5 update channel | Code done: `UpdatePrompt`, `entitlement.ts`, `/api/entitlement`. Shown only to accounts with a row in `access_grants` |
| E9 two sign-ups | Data done: migration 0022 (`access_grants`). The founder adds a manual account with the SQL in the file's header |
| Depot to database | `scripts/depot-to-sql.py` and the ledger `supabase/depot-synced.json`; CI fails if an approved question has no migration |
| Review and merge | Each pull request, once per window |
| Questions | Review, tag and approve what the founder hands over (`handoff/VETTING.md`) |
| E10 hardening | Nov 27–30: rollback rehearsal, Android 7 run, restore drill, release tag |

## 7. What the founder does

1. Apply migration 0021, then 0022 (Supabase SQL editor, in that order).
2. Add manual accounts with the SQL in the header of 0022.
3. Put questions in `inbox/` (format in `inbox/README.md`).
4. Run the airplane-mode checklist once `AIRPLANE_TEST.md` exists.
5. Answer the two open items in `DECISIONS.md`.
