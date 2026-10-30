-- 0021: what the offline app needs from the database.
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
update cgpa.keystone_questions set depot_key = 'engineering/engineering-mathematics-i', depot_qid = 'q001' where course_id = 9 and prompt = 'What is the derivative of x² with respect to x?' and depot_key is null;
update cgpa.keystone_questions set depot_key = 'engineering/engineering-mathematics-i', depot_qid = 'q002' where course_id = 9 and prompt = 'What is the value of sin(90°)?' and depot_key is null;
update cgpa.keystone_questions set depot_key = 'engineering/engineering-mathematics-i', depot_qid = 'q003' where course_id = 9 and prompt = 'Solve for x: 2x + 4 = 10' and depot_key is null;
update cgpa.keystone_questions set depot_key = 'engineering/engineering-mathematics-i', depot_qid = 'q004' where course_id = 9 and prompt = 'The determinant of the 2x2 matrix [[a,b],[c,d]] is:' and depot_key is null;
update cgpa.keystone_questions set depot_key = 'engineering/engineering-mathematics-i', depot_qid = 'q005' where course_id = 9 and prompt = 'Evaluate the integral of 2x dx.' and depot_key is null;
update cgpa.keystone_questions set depot_key = 'engineering/engineering-mathematics-i', depot_qid = 'q006' where course_id = 9 and prompt = 'What is the value of log10(100)?' and depot_key is null;
update cgpa.keystone_questions set depot_key = 'engineering/engineering-mathematics-i', depot_qid = 'q007' where course_id = 9 and prompt = 'The sum of the interior angles of a triangle is:' and depot_key is null;
update cgpa.keystone_questions set depot_key = 'engineering/engineering-mathematics-i', depot_qid = 'q008' where course_id = 9 and prompt = 'The quadratic formula is used to solve equations of the general form:' and depot_key is null;
update cgpa.keystone_questions set depot_key = 'general-studies/gst101', depot_qid = 'q001' where course_id = 183 and prompt = 'A word that names a group of things or people, such as "flock" or "committee," is called a:' and depot_key is null;
update cgpa.keystone_questions set depot_key = 'general-studies/gst101', depot_qid = 'q002' where course_id = 183 and prompt = 'Which of the following is the correctly spelled word?' and depot_key is null;
update cgpa.keystone_questions set depot_key = 'general-studies/gst101', depot_qid = 'q003' where course_id = 183 and prompt = 'Which part of speech describes or modifies a verb?' and depot_key is null;
update cgpa.keystone_questions set depot_key = 'general-studies/gst101', depot_qid = 'q004' where course_id = 183 and prompt = 'At minimum, a grammatically complete sentence must contain:' and depot_key is null;
update cgpa.keystone_questions set depot_key = 'general-studies/gst101', depot_qid = 'q005' where course_id = 183 and prompt = 'Which word is a synonym of "happy"?' and depot_key is null;
update cgpa.keystone_questions set depot_key = 'general-studies/gst101', depot_qid = 'q006' where course_id = 183 and prompt = 'What is the plural form of "child"?' and depot_key is null;
update cgpa.keystone_questions set depot_key = 'general-studies/gst101', depot_qid = 'q007' where course_id = 183 and prompt = 'A word that connects clauses or sentences, such as "and," "but," or "because," is called a:' and depot_key is null;
update cgpa.keystone_questions set depot_key = 'general-studies/gst101', depot_qid = 'q008' where course_id = 183 and prompt = 'Which word is an antonym of "expand"?' and depot_key is null;
update cgpa.keystone_questions set depot_key = 'law/nigerian-legal-system', depot_qid = 'q001' where course_id = 24 and prompt = 'The Nigerian legal system is primarily based on which legal tradition?' and depot_key is null;
update cgpa.keystone_questions set depot_key = 'law/nigerian-legal-system', depot_qid = 'q002' where course_id = 24 and prompt = 'What is the highest court in Nigeria?' and depot_key is null;
update cgpa.keystone_questions set depot_key = 'law/nigerian-legal-system', depot_qid = 'q003' where course_id = 24 and prompt = 'The supreme law of the Federal Republic of Nigeria is the:' and depot_key is null;
update cgpa.keystone_questions set depot_key = 'law/nigerian-legal-system', depot_qid = 'q004' where course_id = 24 and prompt = 'Which legal system operates alongside common law in parts of Northern Nigeria?' and depot_key is null;
update cgpa.keystone_questions set depot_key = 'law/nigerian-legal-system', depot_qid = 'q005' where course_id = 24 and prompt = 'Original jurisdiction over most civil matters at the state level lies with the:' and depot_key is null;
update cgpa.keystone_questions set depot_key = 'law/nigerian-legal-system', depot_qid = 'q006' where course_id = 24 and prompt = 'Customary law in Nigeria is best described as:' and depot_key is null;
update cgpa.keystone_questions set depot_key = 'law/nigerian-legal-system', depot_qid = 'q007' where course_id = 24 and prompt = 'The doctrine that lower courts are bound by the decisions of higher courts is known as:' and depot_key is null;
update cgpa.keystone_questions set depot_key = 'law/nigerian-legal-system', depot_qid = 'q008' where course_id = 24 and prompt = 'At the federal level, laws are made by the:' and depot_key is null;
update cgpa.keystone_questions set depot_key = 'medicine/anatomy-i', depot_qid = 'q001' where course_id = 39 and prompt = 'The femur is the principal bone of which region of the body?' and depot_key is null;
update cgpa.keystone_questions set depot_key = 'medicine/anatomy-i', depot_qid = 'q002' where course_id = 39 and prompt = 'How many bones are in the adult human skeleton?' and depot_key is null;
update cgpa.keystone_questions set depot_key = 'medicine/anatomy-i', depot_qid = 'q003' where course_id = 39 and prompt = 'How many chambers does the human heart have?' and depot_key is null;
update cgpa.keystone_questions set depot_key = 'medicine/anatomy-i', depot_qid = 'q004' where course_id = 39 and prompt = 'What is the largest organ in the human body?' and depot_key is null;
update cgpa.keystone_questions set depot_key = 'medicine/anatomy-i', depot_qid = 'q005' where course_id = 39 and prompt = 'The spinal cord is directly protected by which structure?' and depot_key is null;
update cgpa.keystone_questions set depot_key = 'medicine/anatomy-i', depot_qid = 'q006' where course_id = 39 and prompt = 'Which cranial nerve is primarily responsible for vision?' and depot_key is null;
update cgpa.keystone_questions set depot_key = 'medicine/anatomy-i', depot_qid = 'q007' where course_id = 39 and prompt = 'The trachea bifurcates into which two structures?' and depot_key is null;
update cgpa.keystone_questions set depot_key = 'medicine/anatomy-i', depot_qid = 'q008' where course_id = 39 and prompt = 'What is the functional unit of the kidney called?' and depot_key is null;
update cgpa.keystone_questions set depot_key = 'nursing/anatomy-for-nursing', depot_qid = 'q001' where course_id = 168 and prompt = 'How many chambers does the human heart have?' and depot_key is null;
update cgpa.keystone_questions set depot_key = 'nursing/anatomy-for-nursing', depot_qid = 'q002' where course_id = 168 and prompt = 'What is the largest artery in the human body?' and depot_key is null;
update cgpa.keystone_questions set depot_key = 'nursing/anatomy-for-nursing', depot_qid = 'q003' where course_id = 168 and prompt = 'The functional unit of the kidney is the:' and depot_key is null;
update cgpa.keystone_questions set depot_key = 'nursing/anatomy-for-nursing', depot_qid = 'q004' where course_id = 168 and prompt = 'Which bone forms the kneecap?' and depot_key is null;
update cgpa.keystone_questions set depot_key = 'nursing/anatomy-for-nursing', depot_qid = 'q005' where course_id = 168 and prompt = 'Which gland primarily regulates the body''s metabolic rate?' and depot_key is null;
update cgpa.keystone_questions set depot_key = 'nursing/anatomy-for-nursing', depot_qid = 'q006' where course_id = 168 and prompt = 'The outer layer of the brain is known as the:' and depot_key is null;
update cgpa.keystone_questions set depot_key = 'nursing/anatomy-for-nursing', depot_qid = 'q007' where course_id = 168 and prompt = 'How many pairs of ribs does the human body typically have?' and depot_key is null;
update cgpa.keystone_questions set depot_key = 'nursing/anatomy-for-nursing', depot_qid = 'q008' where course_id = 168 and prompt = 'Which organ produces insulin?' and depot_key is null;
update cgpa.keystone_questions set depot_key = 'pharmacy/pharmacology-i', depot_qid = 'q001' where course_id = 160 and prompt = 'ED50 refers to the dose that produces:' and depot_key is null;
update cgpa.keystone_questions set depot_key = 'pharmacy/pharmacology-i', depot_qid = 'q002' where course_id = 160 and prompt = 'First-pass metabolism of orally administered drugs primarily occurs in the:' and depot_key is null;
update cgpa.keystone_questions set depot_key = 'pharmacy/pharmacology-i', depot_qid = 'q003' where course_id = 160 and prompt = 'A drug that blocks beta-adrenergic receptors is classified as a:' and depot_key is null;
update cgpa.keystone_questions set depot_key = 'pharmacy/pharmacology-i', depot_qid = 'q004' where course_id = 160 and prompt = 'Which route of administration bypasses first-pass hepatic metabolism entirely?' and depot_key is null;
update cgpa.keystone_questions set depot_key = 'pharmacy/pharmacology-i', depot_qid = 'q005' where course_id = 160 and prompt = 'Aspirin exerts its anti-inflammatory effect primarily by inhibiting which enzyme?' and depot_key is null;
update cgpa.keystone_questions set depot_key = 'pharmacy/pharmacology-i', depot_qid = 'q006' where course_id = 160 and prompt = 'A drug that competes with an agonist for the same receptor binding site, without activating it, is called a:' and depot_key is null;
update cgpa.keystone_questions set depot_key = 'pharmacy/pharmacology-i', depot_qid = 'q007' where course_id = 160 and prompt = 'ACE inhibitors are primarily used in the treatment of:' and depot_key is null;
update cgpa.keystone_questions set depot_key = 'pharmacy/pharmacology-i', depot_qid = 'q008' where course_id = 160 and prompt = 'The time required for the plasma concentration of a drug to reduce by half is called its:' and depot_key is null;
update cgpa.keystone_questions set depot_key = 'science/principles-of-toxicology', depot_qid = 'q001' where course_id = 194 and prompt = 'The founding principle of toxicology, often summarized as "the dose makes the poison," was articulated by:' and depot_key is null;
update cgpa.keystone_questions set depot_key = 'science/principles-of-toxicology', depot_qid = 'q002' where course_id = 194 and prompt = 'LD50 refers to the dose of a substance that is:' and depot_key is null;
update cgpa.keystone_questions set depot_key = 'science/principles-of-toxicology', depot_qid = 'q003' where course_id = 194 and prompt = 'The branch of toxicology concerned with the effects of toxic substances on ecosystems is called:' and depot_key is null;
update cgpa.keystone_questions set depot_key = 'science/principles-of-toxicology', depot_qid = 'q004' where course_id = 194 and prompt = 'The capacity of a substance to cause cancer is referred to as its:' and depot_key is null;
update cgpa.keystone_questions set depot_key = 'science/principles-of-toxicology', depot_qid = 'q005' where course_id = 194 and prompt = 'The liver''s primary toxicological role is:' and depot_key is null;
update cgpa.keystone_questions set depot_key = 'science/principles-of-toxicology', depot_qid = 'q006' where course_id = 194 and prompt = 'Bioaccumulation refers to:' and depot_key is null;
update cgpa.keystone_questions set depot_key = 'science/principles-of-toxicology', depot_qid = 'q007' where course_id = 194 and prompt = 'Acute toxicity refers to adverse effects that occur:' and depot_key is null;
update cgpa.keystone_questions set depot_key = 'science/principles-of-toxicology', depot_qid = 'q008' where course_id = 194 and prompt = 'The highest dose at which no observable adverse effect occurs is termed the:' and depot_key is null;

-- Stop here, changing nothing, unless all 56 tied.
do $$
declare n integer;
begin
  select count(*) into n from cgpa.keystone_questions where depot_key is not null;
  if n <> 56 then
    raise exception 'expected 56 questions tied to the depot, found %', n;
  end if;
end $$;
