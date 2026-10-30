# Question kinds and origin tags

Every question is still a multiple-choice question underneath (`prompt`, `options`, `correct_option_id`), so any screen that
only knows multiple choice keeps working. A question may add a `kind` and, for fill-in-the-blank, a `cloze` object.
`python3 scripts/check-content.py` enforces everything below.

## `kind`

| `kind` | What it is | Rule |
|---|---|---|
| absent or `mcq` | Ordinary multiple choice, 2 to 5 options | none |
| `true_false` | A statement to judge | options are exactly `True` and `False` |
| `assertion_reason` | Assertion and reason, five standard answers | exactly 5 options, a to e, in the fixed wording |
| `cloze` | A definition with dashed blanks for its keywords | see below |

Screens today: `mcq`, `true_false` and `assertion_reason` all render through the existing multiple-choice screen.
Ordering, matching and typed fill-in need new screens. Those belong to the interface lane (sloww), not to content.

## `cloze` (fill in the dashed lines)

For long, tongue-twisting definitions: the learner meets the full sentence with the keywords removed, which forces recall of the
exact wording (specific heat capacity, Avogadro's constant, legal and accounting definitions, professional registers and quotations).

```json
{
  "kind": "cloze",
  "cloze": { "text": "The ____ value is the time needed to reduce a microbial population by ____ percent.",
             "answers": ["D", "90"] },
  "prompt": "The ____ value is the time needed to reduce a microbial population by 90 percent.",
  "options": [ ... four options for blank 1 ... ],
  "correct_option_id": "b"
}
```

- `cloze.text` holds one `____` (four underscores) per blank. `cloze.answers` lists the keywords in order. The counts must match.
- `prompt` is the fallback for a screen that only does multiple choice. It keeps blank 1 as `____` and fills in the other blanks.
- The correct option must equal `cloze.answers[0]`.
- A cloze screen should draw one dash per letter or one fixed-width line, accept the answers case-insensitively, and show `explanation` afterwards.
  Typed answers should be compared after trimming and lower-casing; a word bank made from `answers` plus the option texts is the easy mode.

## `origin_universities` (optional)

Sponsors supply university-specific material. A question or feedback note that comes from one university's own notes carries
`"origin_universities": ["unn"]` (a list, so material shared by several universities can name each).

- The slugs must exist in `content/universities.json`. Only the founder adds entries.
- General material must not be labelled with a university. The 28 microbiology and medical physics banks written on 2026-10-30
  carry no tag for that reason.
- Packs carry the field through. The database has no column for it yet, and neither does the feedback-note store: both need a
  migration (manchi lane) and the feedback screen needs a field (interface lane) before a university can be filled in on a note.
