# Question formats

Three formats are built and tested but **not live**. Students still see only the ordinary multiple choice (two to five options). A question in a new format can be written, checked and approved today; it stays out of the offline packs and the database until its interface is switched on in the live test.

The database script skips them too. The pack builder says so on every run: `N approved question(s) are in a format that is not live yet and were left out of the packs`.

To look at the interfaces: run the app in development and open `/dev/formats`. In a production build that address is a 404.

## 1. Six-option multiple choice

Exactly six options, ids `a` to `f`, one correct. Every wrong option is wrong in its own way, so a wrong choice tells the student what kind of mistake they made. Each of the five kinds appears once:

| Kind | The wrong option is |
|---|---|
| `figurative` | nearly right as an idea or figure of speech, not literally right |
| `grammatical` | nearly right in wording or grammar, wrong in what it states |
| `situational` | true in another situation, or true the other way round |
| `units` | the correct quantity in other units |
| `opposite` | obviously wrong, on the opposite side of the topic |

```json
{
  "id": "q001",
  "prompt": "...",
  "options": [{"id": "a", "text": "..."}, "... up to f ..."],
  "correct_option_id": "c",
  "distractor_kinds": {"a": "units", "b": "figurative", "d": "grammatical", "e": "situational", "f": "opposite"},
  "explanation": "...", "cognitive_patterns": ["..."], "information_types": ["..."], "difficulty": 3, "status": "pending"
}
```

Rules the checker enforces for a six-option question: `distractor_kinds` names the five wrong options and not the correct one; each kind is used once; the correct option is not obviously longer than the others (it fails when it is the longest and more than 1.5 times the longest wrong option). Place the correct option anywhere in a to f; spread the answer letters across a bank.

Questions with two to five options remain valid and unchanged.

## 2. Fill in (table, properties, blanks)

`"type": "fill"`. A grid of cells. A cell is fixed text or a blank. With `columns` it is shown as a table; without it each row is a line of text with blanks inside.

```json
{
  "id": "q002", "type": "fill",
  "prompt": "Complete the table of properties.",
  "columns": ["Property", "Value"],
  "rows": [
    [{"text": "Symbol"}, {"blank": "Na", "accept": ["na"]}],
    [{"text": "Atomic number"}, {"blank": "11", "numeric": true}],
    [{"text": "Melting point (degrees C)"}, {"blank": "97.8", "numeric": true, "tolerance": 0.5}]
  ],
  "explanation": "...", "cognitive_patterns": ["..."], "information_types": ["..."], "difficulty": 2, "status": "pending"
}
```

- `blank` is the expected answer. `accept` lists other accepted answers.
- Matching ignores capital letters, extra spaces, a full stop at the end, and symbol styles (`Na⁺` equals `Na+`, `H₂O` equals `H2O`).
- `"numeric": true` compares values, so `1,200` equals `1200`. `tolerance` is the allowed difference.
- At least one blank, at most 40. With `columns`, every row has one cell per column.

## 3. Essay or article

`"type": "essay"`. The student writes; nothing is marked by machine. After the test they see their answer, the points a good answer covers, and the model answer.

```json
{
  "id": "q003", "type": "essay",
  "prompt": "Discuss ...",
  "marks": 10, "word_limit": 150,
  "rubric": [{"point": "States the main cause", "marks": 3}, {"point": "Gives two effects with examples", "marks": 5}, {"point": "Ends with a conclusion", "marks": 2}],
  "model_answer": "At least 50 characters ...",
  "explanation": "...", "cognitive_patterns": ["..."], "information_types": ["..."], "difficulty": 4, "status": "pending"
}
```

The rubric marks must add up to `marks`. `word_limit` is a guide: the writing box turns its count red past it and never blocks the student.

## What is not done yet

- Fill-in and essay answers are shown after the test and marked **not scored**. They are not part of the score, the analytics or the file sent to WhatsApp, and they are never sent to the server.
- The six-option question has no scoring changes: it is graded like any multiple choice once it is switched on.
- Tags and difficulty are required on every question as before.
- The database table holds multiple choice only, so the new formats are packs-only when they go live (hardcoded in the repo, as intended).

## Where the code is

`src/lib/components/` holds `SixOptionQuestion`, `FillQuestion`, `EssayQuestion` and `WrittenReview`. Their logic is in `src/lib/offline/formats.ts` and `written.ts`, with tests in `tests/formats.test.mjs`. The checker is `scripts/check-content.py`.
