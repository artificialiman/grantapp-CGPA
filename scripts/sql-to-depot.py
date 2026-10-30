#!/usr/bin/env python3
"""One-off: move the 56 batch1 keystone questions from SQL into the JSON depot.

Reads supabase/migrations/*_cgpa_0012_keystone_questions_pending_review_batch1.sql
(and the status from *_0015_approve_batch1_*.sql, which approved every row)
and writes content/{faculty}/{course}.json. Standard library only.

Run once: python3 scripts/sql-to-depot.py
It refuses to overwrite an existing depot file, so a second run is harmless.
"""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
MIG = ROOT / "supabase" / "migrations"
OUT = ROOT / "content"

# course_id -> (faculty_slug, course_slug, department_slugs). From handoff/LANES.md card C-O1.
COURSES = {
    39: ("medicine", "anatomy-i", ["human-medicine"]),
    160: ("pharmacy", "pharmacology-i", ["pharmacy"]),
    168: ("nursing", "anatomy-for-nursing", ["nursing-science"]),
    24: ("law", "nigerian-legal-system", ["common-law"]),
    9: ("engineering", "engineering-mathematics-i", ["*"]),
    183: ("general-studies", "gst101", ["general-studies"]),
    194: ("science", "principles-of-toxicology", ["environmental-management-and-toxicology"]),
}


def split_fields(body):
    """Split one SQL row body on top-level commas, honouring '...' strings and [...] brackets."""
    fields, buf, depth, i, n = [], [], 0, 0, len(body)
    while i < n:
        c = body[i]
        if c == "'":
            j = i + 1
            while j < n:
                if body[j] == "'" and j + 1 < n and body[j + 1] == "'":
                    j += 2
                    continue
                if body[j] == "'":
                    break
                j += 1
            buf.append(body[i : j + 1])
            i = j + 1
            continue
        if c == "[":
            depth += 1
        elif c == "]":
            depth -= 1
        if c == "," and depth == 0:
            fields.append("".join(buf).strip())
            buf = []
        else:
            buf.append(c)
        i += 1
    fields.append("".join(buf).strip())
    return fields


def unquote(lit):
    assert lit.startswith("'") and lit.endswith("'"), lit[:40]
    return lit[1:-1].replace("''", "'")


def parse_array(lit):
    m = re.fullmatch(r"ARRAY\[(.*)\]", lit, re.S)
    assert m, lit[:40]
    return [unquote(x) for x in split_fields(m.group(1)) if x]


def main():
    src = next(MIG.glob("*_cgpa_0012_keystone_questions_pending_review_batch1.sql"))
    text = src.read_text(encoding="utf-8")
    rows = []
    for line in text.splitlines():
        line = line.strip()
        if not line.startswith("(") or "::jsonb" not in line:
            continue
        body = line[1:].rstrip(",;")
        assert body.endswith(")"), line[:60]
        body = body[:-1]
        f = split_fields(body)
        assert len(f) == 10, (len(f), line[:80])
        course_id = int(f[0])
        rows.append(
            {
                "course_id": course_id,
                "cognitive_patterns": parse_array(f[1]),
                "information_types": parse_array(f[2]),
                "prompt": unquote(f[3]),
                "options": json.loads(unquote(re.sub(r"::jsonb$", "", f[4]))),
                "correct_option_id": unquote(f[5]),
                "explanation": unquote(f[6]),
                "difficulty": int(f[7]),
            }
        )
    if len(rows) != 56:
        sys.exit(f"expected 56 rows, parsed {len(rows)}")

    by_course = {}
    for r in rows:
        by_course.setdefault(r["course_id"], []).append(r)
    if set(by_course) != set(COURSES):
        sys.exit(f"unexpected course ids: {sorted(by_course)}")

    for cid, (faculty, course, depts) in COURSES.items():
        path = OUT / faculty / f"{course}.json"
        if path.exists():
            sys.exit(f"refusing to overwrite {path}")
        questions = []
        for n, r in enumerate(by_course[cid], start=1):
            expl = re.sub(r"^\[PENDING REVIEW\]\s*", "", r["explanation"])
            questions.append(
                {
                    "id": f"q{n:03d}",
                    "prompt": r["prompt"],
                    "options": r["options"],
                    "correct_option_id": r["correct_option_id"],
                    "explanation": expl,
                    "cognitive_patterns": r["cognitive_patterns"],
                    "information_types": r["information_types"],
                    "difficulty": r["difficulty"],
                    "status": "approved",
                }
            )
        doc = {
            "faculty_slug": faculty,
            "course_slug": course,
            "department_slugs": depts,
            "questions": questions,
        }
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(doc, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"wrote {path.relative_to(ROOT)}  ({len(questions)} questions)")


if __name__ == "__main__":
    main()
