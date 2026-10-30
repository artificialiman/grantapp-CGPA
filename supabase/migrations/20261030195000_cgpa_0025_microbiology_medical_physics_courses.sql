-- 0025: the Medical Physics department, and the course rows behind the Microbiology (18) and Medical Physics (10) question banks.
-- Microbiology names, codes, years and kinds come from curriculum/build/microbiology.json. Medical Physics has NO verified
-- undergraduate course table: its ten rows are subject areas taken from the UNN Medical Physics list and placed at year 4 without
-- codes (see curriculum/medical-physics.txt). Slug rule is the one from 0016. Safe to apply twice.
-- Must run before the depot questions migration that follows it.

insert into cgpa.departments (faculty_id, name, slug)
select id, 'Medical Physics', 'medical-physics' from cgpa.faculties where slug = 'science'
on conflict (faculty_id, slug) do nothing;

insert into cgpa.courses (department_id, year, name, code, kind, slug, approval_status)
select d.id, v.year, v.name, v.code, v.kind,
       lower(regexp_replace(coalesce(v.code, v.name), '[^a-zA-Z0-9]+', '-', 'g')), 'approved'
from (values
  ('science', 'microbiology', 1, 'Introduction to Microbiology', 'MCB101', 'core'),
  ('science', 'microbiology', 2, 'General Microbiology I', 'MCB201', 'core'),
  ('science', 'microbiology', 2, 'General Microbiology II', 'MCB202', 'core'),
  ('science', 'microbiology', 2, 'Introductory Virology', 'MCB203', 'core'),
  ('science', 'microbiology', 3, 'Bacteriology', 'MCB301', 'core'),
  ('science', 'microbiology', 3, 'Soil Microbiology', 'MCB303', 'core'),
  ('science', 'microbiology', 3, 'Microbial Genetics and Molecular Biology', 'MCB305', 'core'),
  ('science', 'microbiology', 3, 'Mycology', 'MCB307', 'core'),
  ('science', 'microbiology', 3, 'Food Microbiology', 'MCB309', 'core'),
  ('science', 'microbiology', 3, 'Microbial Ecology', 'MCB311', 'core'),
  ('science', 'microbiology', 4, 'Immunology and Immunochemistry', 'MCB401', 'core'),
  ('science', 'microbiology', 4, 'Principles of Epidemiology and Public Health', 'MCB403', 'core'),
  ('science', 'microbiology', 4, 'Industrial Microbiology', 'MCB404', 'core'),
  ('science', 'microbiology', 4, 'Pharmaceutical Microbiology', 'MCB405', 'core'),
  ('science', 'microbiology', 4, 'Pathogenic Microbiology', 'MCB407', 'core'),
  ('science', 'microbiology', 4, 'Microbial Physiology and Metabolism', 'MCB408', 'core'),
  ('science', 'microbiology', 4, 'Environmental Microbiology', 'MCB409', 'core'),
  ('science', 'microbiology', 3, 'Parasitology I', 'ZOO301', 'core'),
  ('science', 'medical-physics', 4, 'Fundamentals of Nuclear Physics', null, 'core'),
  ('science', 'medical-physics', 4, 'Medical Instrumentation', null, 'core'),
  ('science', 'medical-physics', 4, 'Non-Ionizing Radiation', null, 'core'),
  ('science', 'medical-physics', 4, 'Nuclear Application in Medicine, Industry and Research', null, 'core'),
  ('science', 'medical-physics', 4, 'Physics of Diagnostic Radiology', null, 'core'),
  ('science', 'medical-physics', 4, 'Physics of Therapeutic Radiology', null, 'core'),
  ('science', 'medical-physics', 4, 'Physiology and Anatomy for Medical Physics', null, 'core'),
  ('science', 'medical-physics', 4, 'Radiation Detection and Dosimetry', null, 'core'),
  ('science', 'medical-physics', 4, 'Radiation Protection', null, 'core'),
  ('science', 'medical-physics', 4, 'Radiobiology', null, 'core')
) as v(faculty_slug, dept_slug, year, name, code, kind)
join cgpa.faculties f on f.slug = v.faculty_slug
join cgpa.departments d on d.faculty_id = f.id and d.slug = v.dept_slug
on conflict (department_id, slug) do nothing;
