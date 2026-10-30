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
TYPES = {"mcq", "fill", "essay"}
# The six-option multiple choice (content/FORMATS.md): one right answer and one wrong answer of each kind.
KINDS = {"figurative", "grammatical", "situational", "units", "opposite"}
LENGTH_RATIO_LIMIT = 1.5  # the correct option may be the longest, but not by more than this factor
MAX_BLANKS = 40
OPTION_ID = re.compile(r"^[a-f]$")
SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
QID = re.compile(r"^q\d{3,}$")
MAX_PROMPT = 700
MAX_OPTION = 300
MIN_EXPLANATION = 20
BIAS_LIMIT = 0.5  # warn if one option letter is the answer for more than this share
BIAS_MIN_N = 8


def norm(text):
    return re.sub(r"\W+", " ", text.lower()).strip()


def load_taxonomy():
    raw = json.loads((CONTENT / "taxonomy.json").read_text(encoding="utf-8"))

    def allowed(axis, faculty):
        node = raw[axis]
        return set(node["global"]) | set(node.get("faculty", {}).get(faculty, []))

    return allowed


def six_option_problems(q, option_ids):
    """The six-option contract. Only applies to a question that has exactly six options."""
    out = []
    if option_ids != list("abcdef"):
        out.append("six options must have ids a to f")
        return out
    correct = q.get("correct_option_id")
    kinds = q.get("distractor_kinds")
    if not isinstance(kinds, dict):
        return ["six options need distractor_kinds: a kind for each of the five wrong options"]
    wrong = [i for i in option_ids if i != correct]
    if correct in kinds:
        out.append("the correct option must not be given a kind")
    seen = []
    for i in wrong:
        k = kinds.get(i)
        if k is None:
            out.append(f"wrong option {i} has no kind")
        elif k not in KINDS:
            out.append(f"option {i}: unknown kind '{k}'")
        else:
            seen.append(k)
    for k in sorted(KINDS - set(seen)):
        out.append(f"no wrong option is of kind '{k}'")
    if len(set(seen)) != len(seen):
        out.append("each kind must be used once")
    texts = {o["id"]: o["text"] for o in q["options"] if isinstance(o, dict) and isinstance(o.get("text"), str)}
    if correct in texts and all(i in texts for i in wrong):
        longest = max(len(texts[i]) for i in wrong)
        if len(texts[correct]) > longest and len(texts[correct]) > LENGTH_RATIO_LIMIT * longest:
            out.append("the correct option is obviously longer than the others")
    return out


def fill_problems(q):
    out = []
    rows = q.get("rows")
    columns = q.get("columns")
    if not isinstance(rows, list) or not rows or not all(isinstance(r, list) and r for r in rows):
        return ["fill needs rows: a non-empty list of non-empty rows of cells"]
    if columns is not None:
        if not isinstance(columns, list) or not columns or not all(isinstance(c, str) and c.strip() for c in columns):
            out.append("columns must be a non-empty list of labels")
        elif any(len(r) != len(columns) for r in rows):
            out.append("every row needs one cell per column")
    blanks = 0
    for ri, row in enumerate(rows):
        for ci, cell in enumerate(row):
            where = f"row {ri + 1} cell {ci + 1}"
            if not isinstance(cell, dict):
                out.append(f"{where}: a cell is an object with text or blank")
            elif "blank" in cell:
                blanks += 1
                if not isinstance(cell["blank"], str) or not cell["blank"].strip():
                    out.append(f"{where}: blank needs the expected answer")
                accept = cell.get("accept")
                if accept is not None and (not isinstance(accept, list) or not all(isinstance(a, str) and a.strip() for a in accept)):
                    out.append(f"{where}: accept must be a list of other accepted answers")
                tol = cell.get("tolerance")
                if tol is not None and (isinstance(tol, bool) or not isinstance(tol, (int, float)) or tol < 0):
                    out.append(f"{where}: tolerance must be a number of 0 or more")
                if "text" in cell:
                    out.append(f"{where}: a cell is text or a blank, not both")
            elif not isinstance(cell.get("text"), str) or not cell["text"].strip():
                out.append(f"{where}: a cell needs text or a blank")
    if blanks == 0:
        out.append("fill needs at least one blank")
    elif blanks > MAX_BLANKS:
        out.append(f"fill has {blanks} blanks; keep it to {MAX_BLANKS} or fewer")
    return out


def essay_problems(q):
    out = []
    marks = q.get("marks")
    if isinstance(marks, bool) or not isinstance(marks, int) or not 1 <= marks <= 50:
        out.append("essay marks must be a whole number 1 to 50")
    limit = q.get("word_limit")
    if limit is not None and (isinstance(limit, bool) or not isinstance(limit, int) or limit < 20):
        out.append("word_limit must be a whole number of 20 or more")
    model = q.get("model_answer")
    if not isinstance(model, str) or len(model.strip()) < 50:
        out.append("model_answer must be at least 50 characters")
    rubric = q.get("rubric")
    if not isinstance(rubric, list) or not rubric:
        out.append("rubric must list the points a good answer covers")
    else:
        total = 0
        for i, r in enumerate(rubric, 1):
            if not isinstance(r, dict) or not isinstance(r.get("point"), str) or not r["point"].strip():
                out.append(f"rubric point {i} needs text")
            elif isinstance(r.get("marks"), bool) or not isinstance(r.get("marks"), int) or r["marks"] < 1:
                out.append(f"rubric point {i} needs whole marks of 1 or more")
            else:
                total += r["marks"]
        if isinstance(marks, int) and not isinstance(marks, bool) and total != marks:
            out.append(f"rubric marks add to {total}, but marks is {marks}")
    return out


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
    type_counts = collections.Counter()
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

        qtype = q.get("type", "mcq")
        option_ids = []
        correct = q.get("correct_option_id")
        if qtype not in TYPES:
            errors.append(f"{tag}: type must be one of {sorted(TYPES)}")
        elif qtype == "mcq":
            options = q.get("options")
            if not isinstance(options, list) or not 2 <= len(options) <= 6:
                errors.append(f"{tag}: options must be a list of 2 to 6")
            else:
                texts = set()
                for opt in options:
                    oid = opt.get("id") if isinstance(opt, dict) else None
                    text = opt.get("text") if isinstance(opt, dict) else None
                    if not isinstance(oid, str) or not OPTION_ID.match(oid):
                        errors.append(f"{tag}: option id must be a to f")
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
                if len(options) == 6:
                    errors.extend(f"{tag}: {m}" for m in six_option_problems(q, option_ids))
            if correct not in option_ids:
                errors.append(f"{tag}: correct_option_id does not match any option")
            else:
                answer_letters[correct] += 1
        elif qtype == "fill":
            errors.extend(f"{tag}: {m}" for m in fill_problems(q))
        else:
            errors.extend(f"{tag}: {m}" for m in essay_problems(q))
        type_counts[qtype if qtype in TYPES else "other"] += 1

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
    n_mcq = type_counts["mcq"]
    if n_mcq >= BIAS_MIN_N and answer_letters:
        letter, count = answer_letters.most_common(1)[0]
        if count / n_mcq > BIAS_LIMIT:
            warnings.append(f"answer position bias: option {letter} is correct in {count} of {n_mcq} questions")
    if n >= BIAS_MIN_N and len(combos) < 2:
        warnings.append("every question has the same tag combination; the mastery engine needs variety")
    stats["combos"] = len(combos)
    return errors, warnings, stats


def main(argv):
    strict = "--strict" in argv
    paths = [pathlib.Path(a) for a in argv if not a.startswith("--")]
    if not paths:
        paths = sorted(p for p in CONTENT.rglob("*.json") if p.name != "taxonomy.json")
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
