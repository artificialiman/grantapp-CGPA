#!/usr/bin/env python3
"""Validate the CGPA question depot: content/{faculty_slug}/{course_slug}.json

Why this exists: question content used to live only inside SQL migrations,
keyed by database ids (course_id=39). That is not portable, not reviewable
as a diff, and cannot be packaged for offline use. The depot is plain JSON
in git (cold data, BUILD-DOCTRINE 2.2); Postgres and the offline packs are
both generated FROM it, never the other way round.

This script is the acceptance test for every content card. Exit code 0 means
the file is safe to hand to the reviewer; 1 means it is not.

Usage:
  python3 scripts/check-content.py                 # every file under content/
  python3 scripts/check-content.py content/medicine/anatomy-i.json
  python3 scripts/check-content.py --strict        # warnings also fail

File shape:
  {
    "faculty_slug": "medicine",
    "course_slug": "anatomy-i",
    "department_slugs": ["human-medicine"],
    "questions": [
      {
        "id": "q001",
        "prompt": "...",
        "options": [{"id": "a", "text": "..."}, {"id": "b", "text": "..."}],
        "correct_option_id": "a",
        "explanation": "...",
        "cognitive_patterns": ["Logical"],
        "information_types": ["Essential / definitive"],
        "difficulty": 3,
        "status": "pending"
      }
    ]
  }
"""
import collections
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"
STATUSES = {"pending", "approved", "rejected"}
# Optional question kinds. Absent means a plain multiple-choice question. true_false has exactly the
# options True and False; assertion_reason has the five standard options a to e; cloze carries a "cloze" object
# (text with ____ blanks plus the answers) and keeps a multiple-choice fallback for blank 1 (handoff/QUESTION_KINDS.md).
KINDS = {"mcq", "true_false", "assertion_reason", "cloze"}
BLANK = "____"
OPTION_ID = re.compile(r"^[a-e]$")
SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
QID = re.compile(r"^q\d{3,}$")
MAX_PROMPT = 700
MAX_OPTION = 300
MIN_EXPLANATION = 20
BIAS_LIMIT = 0.5  # warn if one option letter is the answer for more than this share
BIAS_MIN_N = 8


def load_universities():
    path = CONTENT / "universities.json"
    if not path.exists():
        return set()
    raw = json.loads(path.read_text(encoding="utf-8"))
    return {u["slug"] for u in raw.get("universities", [])}


UNIVERSITIES = load_universities()


def norm(text):
    return re.sub(r"\W+", " ", text.lower()).strip()


def load_taxonomy():
    raw = json.loads((CONTENT / "taxonomy.json").read_text(encoding="utf-8"))

    def allowed(axis, faculty):
        node = raw[axis]
        return set(node["global"]) | set(node.get("faculty", {}).get(faculty, []))

    return allowed


def check_file(path, allowed, seen_prompts):
    errors, warnings = [], []
    stats = collections.Counter()
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:  # unreadable or invalid JSON
        return [f"not valid JSON: {exc}"], warnings, stats

    faculty = data.get("faculty_slug")
    course = data.get("course_slug")
    questions = data.get("questions")

    for label, value in (("faculty_slug", faculty), ("course_slug", course)):
        if not isinstance(value, str) or not SLUG.match(value):
            errors.append(f"{label} missing or not a lowercase slug")

    # A course's slug is only unique inside one department (migration 0016),
    # and shared-core courses such as Engineering Mathematics I exist once per
    # department. One bank must serve every department that carries the course,
    # so the file names them explicitly; ["*"] means every department in the
    # faculty that has a course with this slug.
    departments = data.get("department_slugs")
    if not isinstance(departments, list) or not departments:
        errors.append("department_slugs must be a non-empty list of slugs, or [\"*\"]")
    elif departments != ["*"] and not all(isinstance(d, str) and SLUG.match(d) for d in departments):
        errors.append("department_slugs entries must be lowercase slugs, or the single entry \"*\"")
    elif "*" in departments and len(departments) > 1:
        errors.append("department_slugs: \"*\" cannot be mixed with named departments")
    if not isinstance(questions, list) or not questions:
        errors.append("questions must be a non-empty list")
        return errors, warnings, stats

    if isinstance(faculty, str) and isinstance(course, str):
        expected = pathlib.Path("content") / faculty / f"{course}.json"
        try:
            actual = path.resolve().relative_to(ROOT)
        except ValueError:
            actual = path
        if actual != expected:
            errors.append(f"path must be {expected}, found {actual}")

    ids, prompts = set(), set()
    answer_letters = collections.Counter()
    combos = set()

    for index, q in enumerate(questions):
        qid = q.get("id") if isinstance(q, dict) else None
        tag = qid or f"index {index}"
        if not isinstance(q, dict):
            errors.append(f"{tag}: not an object")
            continue
        stats["questions"] += 1

        if not isinstance(qid, str) or not QID.match(qid):
            errors.append(f"{tag}: id must look like q001")
        elif qid in ids:
            errors.append(f"{tag}: duplicate id in this file")
        else:
            ids.add(qid)

        prompt = q.get("prompt")
        if not isinstance(prompt, str) or not prompt.strip():
            errors.append(f"{tag}: missing prompt")
        else:
            if len(prompt) > MAX_PROMPT:
                warnings.append(f"{tag}: prompt over {MAX_PROMPT} characters")
            key = norm(prompt)
            if key in prompts:
                errors.append(f"{tag}: duplicate prompt inside this file")
            prompts.add(key)
            if key in seen_prompts and seen_prompts[key] != str(path):
                warnings.append(f"{tag}: same prompt also in {seen_prompts[key]}")
            seen_prompts.setdefault(key, str(path))

        options = q.get("options")
        option_ids = []
        if not isinstance(options, list) or not 2 <= len(options) <= 5:
            errors.append(f"{tag}: options must be a list of 2 to 5")
        else:
            texts = set()
            for opt in options:
                oid = opt.get("id") if isinstance(opt, dict) else None
                text = opt.get("text") if isinstance(opt, dict) else None
                if not isinstance(oid, str) or not OPTION_ID.match(oid):
                    errors.append(f"{tag}: option id must be a to e")
                    continue
                if oid in option_ids:
                    errors.append(f"{tag}: duplicate option id {oid}")
                option_ids.append(oid)
                if not isinstance(text, str) or not text.strip():
                    errors.append(f"{tag}: option {oid} has no text")
                else:
                    if len(text) > MAX_OPTION:
                        warnings.append(f"{tag}: option {oid} over {MAX_OPTION} characters")
                    if norm(text) in texts:
                        errors.append(f"{tag}: two options have identical text")
                    texts.add(norm(text))
            if option_ids != sorted(option_ids):
                errors.append(f"{tag}: option ids must run in order a, b, c...")

        correct = q.get("correct_option_id")
        if correct not in option_ids:
            errors.append(f"{tag}: correct_option_id does not match any option")
        else:
            answer_letters[correct] += 1

        kind = q.get("kind")
        if kind is not None:
            if kind not in KINDS:
                errors.append(f"{tag}: kind must be one of {sorted(KINDS)}")
            elif kind == "true_false" and [o.get("text") for o in options or [] if isinstance(o, dict)] != ["True", "False"]:
                errors.append(f"{tag}: a true_false question has exactly the options True and False")
            elif kind == "assertion_reason" and (not isinstance(options, list) or len(options) != 5):
                errors.append(f"{tag}: an assertion_reason question has exactly five options")
            elif kind == "cloze":
                cz = q.get("cloze")
                answers = cz.get("answers") if isinstance(cz, dict) else None
                text = cz.get("text") if isinstance(cz, dict) else None
                if not isinstance(text, str) or not isinstance(answers, list) or not answers \
                        or not all(isinstance(a, str) and a.strip() for a in answers):
                    errors.append(f"{tag}: a cloze question needs cloze.text and a non-empty cloze.answers list")
                else:
                    if text.count(BLANK) != len(answers):
                        errors.append(f"{tag}: cloze.text has {text.count(BLANK)} blanks but {len(answers)} answers")
                    if BLANK not in (q.get("prompt") or ""):
                        errors.append(f"{tag}: a cloze prompt keeps blank 1 as {BLANK}")
                    right = next((o.get("text") for o in options or [] if isinstance(o, dict) and o.get("id") == correct), None)
                    if right is None or norm(right) != norm(answers[0]):
                        errors.append(f"{tag}: the correct option must equal cloze.answers[0]")

        origins = q.get("origin_universities")
        if origins is not None:
            if not isinstance(origins, list) or not origins or not all(isinstance(u, str) and SLUG.match(u) for u in origins):
                errors.append(f"{tag}: origin_universities must be a non-empty list of university slugs")
            else:
                for u in origins:
                    if u not in UNIVERSITIES:
                        errors.append(f"{tag}: '{u}' is not in content/universities.json (the founder adds universities)")

        status = q.get("status")
        if status not in STATUSES:
            errors.append(f"{tag}: status must be one of {sorted(STATUSES)}")
        explanation = q.get("explanation")
        if not isinstance(explanation, str) or len(explanation.strip()) < MIN_EXPLANATION:
            errors.append(f"{tag}: explanation missing or under {MIN_EXPLANATION} characters")
        elif explanation.lstrip().startswith("[PENDING REVIEW]"):
            if status == "approved":
                errors.append(f"{tag}: approved but explanation still starts with [PENDING REVIEW]")
            else:
                warnings.append(f"{tag}: strip the [PENDING REVIEW] prefix; status already says pending")

        difficulty = q.get("difficulty")
        if not isinstance(difficulty, int) or isinstance(difficulty, bool) or not 1 <= difficulty <= 5:
            errors.append(f"{tag}: difficulty must be an integer 1 to 5")

        axis_values = {}
        for axis, field in (("cognitive_pattern", "cognitive_patterns"), ("information_type", "information_types")):
            values = q.get(field)
            if not isinstance(values, list) or not values:
                errors.append(f"{tag}: {field} needs at least one tag")
                axis_values[axis] = []
                continue
            axis_values[axis] = values
            ok = allowed(axis, faculty) if isinstance(faculty, str) else set()
            for value in values:
                if value not in ok:
                    errors.append(f"{tag}: '{value}' is not in the {axis} vocabulary (agents never invent tags)")
        for cp in axis_values.get("cognitive_pattern", []):
            for it in axis_values.get("information_type", []):
                combos.add((cp, it))

    n = stats["questions"]
    if n >= BIAS_MIN_N and answer_letters:
        letter, count = answer_letters.most_common(1)[0]
        if count / n > BIAS_LIMIT:
            warnings.append(f"answer position bias: option {letter} is correct in {count} of {n} questions")
    if n >= BIAS_MIN_N and len(combos) < 2:
        warnings.append("every question has the same tag combination; the mastery engine needs variety")
    stats["combos"] = len(combos)
    return errors, warnings, stats


def main(argv):
    strict = "--strict" in argv
    paths = [pathlib.Path(a) for a in argv if not a.startswith("--")]
    if not paths:
        paths = sorted(p for p in CONTENT.rglob("*.json") if p.name not in ("taxonomy.json", "universities.json"))
    if not paths:
        print("no content files found under content/")
        return 0

    allowed = load_taxonomy()
    seen_prompts = {}
    total_errors = total_warnings = total_questions = 0
    for path in paths:
        errors, warnings, stats = check_file(path, allowed, seen_prompts)
        total_errors += len(errors)
        total_warnings += len(warnings)
        total_questions += stats["questions"]
        mark = "FAIL" if errors else ("warn" if warnings else "ok")
        print(f"[{mark}] {path}  ({stats['questions']} questions, {stats['combos']} tag combos)")
        for message in errors:
            print(f"    error: {message}")
        for message in warnings:
            print(f"    warning: {message}")

    print(f"\n{len(paths)} files, {total_questions} questions, {total_errors} errors, {total_warnings} warnings")
    if total_errors or (strict and total_warnings):
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
