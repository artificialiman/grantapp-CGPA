# inbox — hand over questions here

Type or paste questions into a plain text file in this folder (`inbox/law-week1.txt`, any name ending in `.txt`). You can write it in Notes on a phone and upload it. manchi reviews, tags and approves; you do not tag.

## Format

```
COURSE: law/nigerian-legal-system

Q: The Supreme Court of Nigeria sits in which city?
A) Lagos
B) Abuja
C) Kaduna
D) Port Harcourt
ANSWER: B
WHY: The Supreme Court sits in Abuja, the federal capital.
LEVEL: 2

Q: Next question...
```

- `COURSE:` is `faculty/course`, the same names as the folders in `content/`. A new `COURSE:` line starts a new course. For a course that does not exist yet, write the name you would give it.
- `DEPARTMENTS:` is optional, a list such as `common-law, civil-law`. Leave it out for a course every department shares.
- Options run `A)` to `F)` (the six-option format is not live yet, so use two to five for now) (`A.` and `A:` also work). The prompt may span several lines.
- `ANSWER:` is the letter of the right option. `WHY:` and `LEVEL:` (1 to 5) are optional; manchi fills them in if missing.
- Separate questions with a blank line.
- A question the script cannot read is reported with its line number and skipped; nothing else is affected.

## What happens next
manchi runs `python3 scripts/import-inbox.py`, which writes `inbox/staged/*.json`, then reviews each answer by derivation (`handoff/VETTING.md`), adds tags and a difficulty, and moves the question into `content/`. Nothing reaches students until it is `approved`.
