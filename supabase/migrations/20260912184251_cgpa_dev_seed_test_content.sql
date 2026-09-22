-- Dev/test seed only -- one faculty/department/course so the mastery
-- engine (cgpa_0004_mastery_engine) has something real to select
-- against while building and testing the exam UI. Not real curriculum
-- content -- see cgpa_dev_seed_test_questions.sql for the questions
-- themselves, clearly marked [TEST FIXTURE] in their prompts.
insert into cgpa.faculties (name, slug) values ('Science', 'science') on conflict do nothing;
insert into cgpa.departments (faculty_id, name, slug) select id, 'Biochemistry', 'biochemistry' from cgpa.faculties where slug = 'science' on conflict do nothing;
insert into cgpa.courses (department_id, year, name, code, kind, approval_status)
  select d.id, 1, 'General Biochemistry I', 'BCH101', 'core', 'approved'
  from cgpa.departments d where d.slug = 'biochemistry'
  on conflict do nothing;
