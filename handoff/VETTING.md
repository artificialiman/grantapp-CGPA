# VETTING.md — how manchi approves a question

Owner: manchi. Applies to every question before `status` becomes `approved`. The validator checks format only; this file checks truth.

## Per question
1. **One best answer.** Read the prompt without the key. If two options can be defended, rewrite or reject.
2. **The key is derived, not trusted.** Calculation: recompute it from the prompt. Fact: it must be a textbook-level fact stated with certainty. If certainty is missing, the question stays `pending` and goes on the "needs founder" list.
3. **Distractors are plausible and wrong.** No "all of the above", no joke options, no option that is true but unrelated.
4. **The explanation teaches.** It says why the right option is right and why the nearest wrong option is wrong. No invented citations, page numbers or textbook names.
5. **Level matches the tag.** Difficulty 1 to 5 reflects university level for the named course. Tags come only from `content/taxonomy.json`.
6. **No repeats.** The validator catches identical prompts; manchi also catches the same question reworded.

## Per batch (at most 40 questions)
- Run `python3 scripts/check-content.py`. No errors; read every warning in the batch.
- Answer letters: no letter correct in more than 35% of the file.
- Record the batch in `handoff/vetting-log.md`: date, file, ids approved, ids rejected, ids held, and five ids chosen at random for anyone who wants to spot-check.
- Approve by changing `status` to `approved` in a manchi commit, then run `python3 scripts/build-packs.py` so the packs include the batch. CI fails if the packs are stale.

## What this does not cover
manchi and obase are the same kind of system, so a shared blind spot is possible. The control is the derivation in step 2 and the held list, not agreement between the two. Held questions are never shipped.

## After approval
1. `python3 scripts/build-packs.py` rebuilds the packs and manifest.
2. `python3 scripts/depot-to-sql.py` writes the next migration for the newly approved questions and records them in `supabase/depot-synced.json`. CI fails if an approved question has no migration.
3. Commit the content, the packs, the migration and the ledger together. The founder applies the migration; until then an offline answer for a new question is counted as unmatched, not lost.
