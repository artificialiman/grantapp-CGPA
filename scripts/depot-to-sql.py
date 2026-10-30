#!/usr/bin/env python3
"""Turn newly approved depot questions into a migration for the database.

The phone learns questions from packs; the database needs the same questions so an offline
result can be graded and tracked (migration 0021 gave keystone_questions its depot_key and
depot_qid). This writes one migration with an INSERT per approved question that is not yet in
the ledger, then records them in the ledger so the next run only emits what is new.

  python3 scripts/depot-to-sql.py            # write the next migration, update the ledger
  python3 scripts/depot-to-sql.py --dry-run  # say what would be written, change nothing
  python3 scripts/depot-to-sql.py --check    # exit 1 if approved questions are not in the ledger (CI warning use)

The ledger is supabase/depot-synced.json: a sorted list of "faculty/course#qid". It starts with
the 56 questions that migration 0021 tied to the depot.

Course rows are per department. A depot course names its departments; the question is stored on the
first named department's course row. For a shared course (departments ["*"]) it is stored on the
lowest-id course row with that slug in the faculty, which is where the existing Engineering Mathematics I
questions already live. Each insert is guarded, so applying the same migration twice adds nothing, and an
insert whose course row cannot be found adds nothing (the migration then raises, so a typo cannot pass quietly).

The founder applies the migration. Standard library only.
"""
import argparse
import datetime
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
LEDGER = ROOT / "supabase" / "depot-synced.json"
MIGRATIONS = ROOT / "supabase" / "migrations"


def lit(s):
    return "'" + s.replace("'", "''") + "'"


def arr(items):
    return "array[" + ", ".join(lit(x) for x in items) + "]::text[]" if items else "'{}'::text[]"


def is_live(q):
    # Same rule as build-packs.py: formats whose interfaces are not live yet stay out of the database too.
    return q.get("type", "mcq") == "mcq" and len(q.get("options", [])) <= 5


def approved(content_dir):
    out = []
    for path in sorted(content_dir.glob("*/*.json")):
        doc = json.loads(path.read_text(encoding="utf-8"))
        key = f'{doc["faculty_slug"]}/{doc["course_slug"]}'
        for q in doc["questions"]:
            if q.get("status") == "approved" and is_live(q):
                out.append((f'{key}#{q["id"]}', doc, q))
    return out


def next_number():
    nums = [int(m.group(1)) for p in MIGRATIONS.glob("*.sql") for m in [re.search(r"_cgpa_(\d{4})_", p.name)] if m]
    return max(nums) + 1


def insert_for(doc, q):
    dept = next((d for d in doc["department_slugs"] if d != "*"), None)
    dept_filter = f"and d.slug = {lit(dept)} " if dept else ""
    return (
        "insert into cgpa.keystone_questions\n"
        "  (course_id, cognitive_patterns, information_types, prompt, options, correct_option_id, explanation, difficulty, depot_key, depot_qid)\n"
        f"select c.id, {arr(q['cognitive_patterns'])}, {arr(q['information_types'])}, {lit(q['prompt'])},\n"
        f"  {lit(json.dumps(q['options'], ensure_ascii=False))}::jsonb, {lit(q['correct_option_id'])}, {lit(q['explanation'])}, {q['difficulty']},\n"
        f"  {lit(doc['faculty_slug'] + '/' + doc['course_slug'])}, {lit(q['id'])}\n"
        "from cgpa.courses c\n"
        "join cgpa.departments d on d.id = c.department_id\n"
        "join cgpa.faculties f on f.id = d.faculty_id\n"
        f"where f.slug = {lit(doc['faculty_slug'])} {dept_filter}and c.slug = {lit(doc['course_slug'])} and c.approval_status = 'approved'\n"
        f"  and not exists (select 1 from cgpa.keystone_questions k where k.depot_key = {lit(doc['faculty_slug'] + '/' + doc['course_slug'])} and k.depot_qid = {lit(q['id'])})\n"
        "order by c.id limit 1;\n"
    )


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--content", default=str(ROOT / "content"))
    ap.add_argument("--ledger", default=str(LEDGER))
    ap.add_argument("--out-dir", default=str(MIGRATIONS))
    args = ap.parse_args()

    ledger_path = pathlib.Path(args.ledger)
    done = set(json.loads(ledger_path.read_text(encoding="utf-8"))) if ledger_path.exists() else set()
    new = [(k, d, q) for k, d, q in approved(pathlib.Path(args.content)) if k not in done]

    if args.check:
        if new:
            print(f"{len(new)} approved question(s) are not in the database ledger: {[k for k, _, _ in new][:5]}")
            sys.exit(1)
        print("every approved question is in the ledger")
        return
    if not new:
        print("nothing new: every approved question is already in the ledger")
        return
    if args.dry_run:
        print(f"would write {len(new)} insert(s): {[k for k, _, _ in new][:5]}")
        return

    n = next_number()
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d%H%M%S")
    out = pathlib.Path(args.out_dir) / f"{stamp}_cgpa_{n:04d}_depot_questions.sql"
    body = [
        f"-- {n:04d}: questions approved in the depot since the last migration ({len(new)}).\n",
        "-- Generated by scripts/depot-to-sql.py. Applied by the founder. Safe to apply twice.\n\n",
    ]
    body += [insert_for(d, q) + "\n" for _, d, q in new]
    body.append(
        "do $$\ndeclare n integer;\nbegin\n"
        f"  select count(*) into n from cgpa.keystone_questions where (depot_key || '#' || depot_qid) = any (array[{', '.join(lit(k) for k, _, _ in new)}]);\n"
        f"  if n <> {len(new)} then\n    raise exception 'expected {len(new)} depot questions in the database, found %', n;\n  end if;\nend $$;\n"
    )
    out.write_text("".join(body), encoding="utf-8")
    ledger_path.write_text(json.dumps(sorted(done | {k for k, _, _ in new}), indent=1) + "\n", encoding="utf-8")
    print(f"wrote {out.name}: {len(new)} insert(s)")


if __name__ == "__main__":
    main()
