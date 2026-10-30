#!/usr/bin/env python3
"""Turn plain-text question files in inbox/ into staged JSON for review.

Input : inbox/*.txt        (format: inbox/README.md)
Output: inbox/staged/{faculty}__{course}.json   questions with status "pending" and no tags yet

The staged files are NOT the depot. manchi reviews each answer, adds tags and a
difficulty, then moves the question into content/ (scripts/check-content.py is the gate).
Standard library only.

Usage:
  python3 scripts/import-inbox.py          # parse every inbox/*.txt, write staged files
  python3 scripts/import-inbox.py --check  # parse only; exit 1 if any question is unreadable
"""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
INBOX = ROOT / "inbox"
STAGED = INBOX / "staged"
SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
OPT = re.compile(r"^\s*([A-Fa-f])\s*[\).:]\s*(.*\S)\s*$")
KEY = re.compile(r"^\s*(COURSE|DEPARTMENTS|Q|ANSWER|WHY|LEVEL)\s*:\s*(.*)$", re.I)


def parse(path):
    """Return (groups, errors). groups: {(faculty, course): {"departments": [...], "questions": [...]}}"""
    groups, errors = {}, []
    cur = None          # current group key
    depts = ["*"]
    q = None            # question being built
    field = None        # multi-line field currently being extended

    def flush(lineno):
        nonlocal q
        if q is None:
            return
        problems = []
        if not q["prompt"].strip():
            problems.append("no question text")
        if len(q["options"]) < 2:
            problems.append("fewer than 2 options")
        if q["answer"] is None:
            problems.append("no ANSWER")
        elif q["answer"] not in [o[0] for o in q["options"]]:
            problems.append(f"ANSWER {q['answer']} is not one of the options")
        if cur is None:
            problems.append("no COURSE before this question")
        if problems:
            errors.append(f"{path.name}:{q['line']}: {'; '.join(problems)}")
        else:
            out = {
                "prompt": " ".join(q["prompt"].split()),
                "options": [{"id": k.lower(), "text": " ".join(v.split())} for k, v in q["options"]],
                "correct_option_id": q["answer"].lower(),
                "explanation": " ".join(q["why"].split()),
                "cognitive_patterns": [],
                "information_types": [],
                "difficulty": q["level"],
                "status": "pending",
            }
            groups[cur]["questions"].append(out)
        q = None

    for lineno, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        line = raw.rstrip()
        if not line.strip():
            flush(lineno)
            field = None
            continue
        m = KEY.match(line)
        if m:
            key, val = m.group(1).upper(), m.group(2).strip()
            if key == "COURSE":
                flush(lineno)
                parts = [p.strip().lower() for p in val.split("/")]
                if len(parts) != 2 or not all(SLUG.match(p) for p in parts):
                    errors.append(f"{path.name}:{lineno}: COURSE must look like faculty/course, lowercase with hyphens")
                    cur = None
                else:
                    cur = (parts[0], parts[1])
                    depts = ["*"]
                    groups.setdefault(cur, {"departments": depts, "questions": []})
                field = None
            elif key == "DEPARTMENTS":
                ds = [d.strip().lower() for d in val.split(",") if d.strip()]
                if cur is not None and ds:
                    groups[cur]["departments"] = ds
                field = None
            elif key == "Q":
                flush(lineno)
                q = {"line": lineno, "prompt": val, "options": [], "answer": None, "why": "", "level": 3}
                field = "prompt"
            elif q is not None and key == "ANSWER":
                a = val[:1].upper()
                q["answer"] = a if a in "ABCDEF" and a else None
                field = None
            elif q is not None and key == "WHY":
                q["why"] = val
                field = "why"
            elif q is not None and key == "LEVEL":
                try:
                    lv = int(val)
                    q["level"] = lv if 1 <= lv <= 5 else 3
                except ValueError:
                    q["level"] = 3
                field = None
            continue
        if q is None:
            continue
        o = OPT.match(line)
        if o:
            q["options"].append((o.group(1).upper(), o.group(2)))
            field = "option"
        elif field == "prompt":
            q["prompt"] += " " + line.strip()
        elif field == "why":
            q["why"] += " " + line.strip()
        elif field == "option" and q["options"]:
            k, v = q["options"][-1]
            q["options"][-1] = (k, v + " " + line.strip())
    flush(0)
    return groups, errors


def main():
    check = "--check" in sys.argv
    files = sorted(p for p in INBOX.glob("*.txt"))
    if not files:
        print("inbox/ has no .txt files")
        return
    merged, all_errors = {}, []
    for f in files:
        groups, errors = parse(f)
        all_errors += errors
        for k, g in groups.items():
            m = merged.setdefault(k, {"departments": g["departments"], "questions": []})
            m["questions"] += g["questions"]
    total = sum(len(g["questions"]) for g in merged.values())
    for e in all_errors:
        print("error:", e)
    print(f"{total} readable questions in {len(merged)} course(s); {len(all_errors)} unreadable")
    if not check:
        STAGED.mkdir(exist_ok=True)
        for (fac, course), g in merged.items():
            if not g["questions"]:
                continue
            for n, q in enumerate(g["questions"], start=1):
                q["id"] = f"s{n:03d}"
            doc = {"faculty_slug": fac, "course_slug": course, "department_slugs": g["departments"], "questions": g["questions"]}
            out = STAGED / f"{fac}__{course}.json"
            out.write_text(json.dumps(doc, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
            print(f"wrote {out.relative_to(ROOT)}")
    sys.exit(1 if all_errors else 0)


if __name__ == "__main__":
    main()
