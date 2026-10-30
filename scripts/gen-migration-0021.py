#!/usr/bin/env python3
"""One-off: write migration 0021 (offline attempts + depot keys on keystone_questions).

The backfill ties each of the 56 questions already in the database to its depot id
(`law/nigerian-legal-system` + `q003`) by course id and exact prompt text, and the
migration aborts if it does not tie exactly 56. New questions reach the database
through a later depot-to-SQL step; until then an offline answer for a question the
database does not know is counted as unmatched, not lost.

Run once: python3 scripts/gen-migration-0021.py   (refuses to overwrite)
"""
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "supabase" / "migrations" / "20261030120000_cgpa_0021_offline_attempts.sql"

# course_id in the database for each depot course (same map as scripts/sql-to-depot.py).
COURSE_IDS = {
    "medicine/anatomy-i": 39,
    "pharmacy/pharmacology-i": 160,
    "nursing/anatomy-for-nursing": 168,
    "law/nigerian-legal-system": 24,
    "engineering/engineering-mathematics-i": 9,
    "general-studies/gst101": 183,
    "science/principles-of-toxicology": 194,
}


def lit(s):
    return "'" + s.replace("'", "''") + "'"


def main():
    if OUT.exists():
        sys.exit(f"refusing to overwrite {OUT}")
    rows = []
    for path in sorted((ROOT / "content").glob("*/*.json")):
        doc = json.loads(path.read_text(encoding="utf-8"))
        key = f'{doc["faculty_slug"]}/{doc["course_slug"]}'
        if key not in COURSE_IDS:
            continue
        for q in doc["questions"]:
            rows.append((key, q["id"], COURSE_IDS[key], q["prompt"]))
    if len(rows) != 56:
        sys.exit(f"expected 56 depot rows, found {len(rows)}")

    sql = []
    sql.append("""-- 0021: what the offline app needs from the database.
--
-- 1. keystone_questions gets the depot's own name for each question (depot_key = 'law/nigerian-legal-system',
--    depot_qid = 'q003'). The phone knows questions by those names, not by database ids.
-- 2. offline_attempts records every test sat on a phone, once. attempt_id is made on the phone, so a
--    retry after a dropped connection cannot create a second row.
--
-- Applied by the founder. No agent applies migrations (handoff/LANES.md).

alter table cgpa.keystone_questions
  add column if not exists depot_key text,
  add column if not exists depot_qid text;

create unique index if not exists keystone_questions_depot_uidx
  on cgpa.keystone_questions (depot_key, depot_qid)
  where depot_key is not null;

comment on column cgpa.keystone_questions.depot_key is 'Course key in the JSON depot (faculty/course). Null for rows that predate the depot.';
comment on column cgpa.keystone_questions.depot_qid is 'Question id inside that depot course file (q001...).';

create table if not exists cgpa.offline_attempts (
  attempt_id uuid primary key,
  student_id uuid not null references cgpa.students(id) on delete cascade,
  course_key text not null,
  started_at timestamptz,
  finished_at timestamptz,
  answered_count integer not null default 0,
  correct_count integer not null default 0,
  skipped_count integer not null default 0,
  unmatched_count integer not null default 0,
  total_score integer not null default 0,
  received_at timestamptz not null default now()
);

create index if not exists offline_attempts_student_idx on cgpa.offline_attempts (student_id, finished_at desc);

alter table cgpa.offline_attempts enable row level security;

-- A student reads only their own attempts. Writes come from the server (service role) only.
create policy "own offline attempts readable" on cgpa.offline_attempts
  for select to authenticated using (student_id = auth.uid());

comment on table cgpa.offline_attempts is 'One row per test sat on a phone. Deleted with the student (INVARIANTS #4 note: deletion on request).';

-- Backfill: tie the 56 questions already in the database to their depot ids.
""")
    for key, qid, cid, prompt in rows:
        sql.append(
            f"update cgpa.keystone_questions set depot_key = {lit(key)}, depot_qid = {lit(qid)} "
            f"where course_id = {cid} and prompt = {lit(prompt)} and depot_key is null;\n"
        )
    sql.append("""
-- Stop here, changing nothing, unless all 56 tied.
do $$
declare n integer;
begin
  select count(*) into n from cgpa.keystone_questions where depot_key is not null;
  if n <> 56 then
    raise exception 'expected 56 questions tied to the depot, found %', n;
  end if;
end $$;
""")
    OUT.write_text("".join(sql), encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)} ({len(rows)} backfill statements)")


if __name__ == "__main__":
    main()
