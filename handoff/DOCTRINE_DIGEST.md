# DOCTRINE_DIGEST.md — read this, not the full doctrine

Authoritative source: `artificialiman/iman-doctrine`, file `antifail/BUILD-DOCTRINE.md` (about 40 KB). This digest exists so a free-plan agent spends its window building, not reading. Where the two differ, the full doctrine wins. Section numbers below point into it.

## Read order (15 minutes, no more)
1. This file.
2. `handoff/pausa.md`.
3. Your card in `handoff/LANES.md`.

Open any other file only when the card names it.

## Rules that apply to every commit
1. **One concern per commit.** The message states the why, the alternative rejected, and the invariant honored (6.1, 6.6).
2. **Push each piece when green.** Plain `git push`, never force. If rejected: fetch, merge, rerun the checks, push again (6.2, 6.3).
3. **Green means:** `npm run check && npm run build` for code, `python3 scripts/check-content.py` for content (6.4).
4. **Migrations are new files only.** Never edit or renumber a shipped one. Every new table ships with RLS and a policy in the same file. Use your own number range from `LANES.md` (6.5, 7.2).
5. **Soft-delete, never hard-delete.** A correction is appended, not written over the old value (2.6).
6. **Cold data lives in git, warm data lives in the database** (2.2). Questions, packs and transcripts are cold. Progress and enrolments are warm.
7. **The worst network in the room is the baseline** (2.1). Small payloads. No feature on an exam path may need a live call.
8. **Undecided is written down, not guessed.** Put `[OPEN]` in `handoff/pausa.md` and stop that card. Identifiers, permissions and irreversible operations are never guessed (16).
9. **Secrets never reach the repo or a log line.** `.env` stays ignored. A type-check that fails only on a missing environment variable inside a sandbox is expected (11).
10. **End-user wording is Iman's.** You build mechanism and structure. Leave wording as a placeholder string marked `COPY: IMAN` (15).
11. **Antitheft belongs to Iman.** Do not read, change or work around: `src/lib/auth/**`, `src/hooks.server.ts`, any `api/*device*` route, `api/check-mastery-answer`, `api/quick-test-session`. Answer keys never leave the server unless a card says so.
12. **Dependencies are pinned and npm is the only package manager.** No new dependency unless a card names it (11).

## Vocabulary
- **Cold / warm:** generated ahead of time and stored as files, versus live and synced.
- **Depot:** the JSON question files under `content/`. Postgres and the offline packs are generated from it.
- **Lane:** the paths one agent may write. **Card:** one task sized to fit inside a window.

## Finish ritual (5.3)
Before you stop, overwrite your own section of `handoff/pausa.md` with what you were mid-doing, what is green, and any `[OPEN]` items. Push anything green first.
