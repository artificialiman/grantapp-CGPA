-- Adds Environmental Management and Toxicology as a department under
-- the existing Science faculty. Real, single, well-established
-- Nigerian department name (checked before writing this, not
-- assumed) -- FUNAAB (est. 1989, first of its kind in Nigeria),
-- University of Delta, FUOYE, Elizade, UNIBEN, and others all offer
-- it as exactly this combined programme, typically 5 years, standardly
-- placed under a Faculty of Science (explicit at University of Delta).
--
-- 15 courses across 5 years: foundational ecology/environmental
-- science/chemistry (year 1) building through environmental
-- chemistry/microbiology/toxicology fundamentals (year 2),
-- pollution/ecotoxicology/impact assessment (year 3), industrial
-- toxicology/policy/waste management (year 4), to risk assessment/
-- occupational health/final year project (year 5) -- drawn from the
-- real curriculum topics these programmes teach (toxicology core:
-- biotransformation, carcinogenesis, systemic toxic responses;
-- environmental management core: pollution control, EIA, policy) per
-- the search that confirmed the department itself. Same "bootstrap
-- skeleton, not a claimed-complete transcript" framing as the earlier
-- 180-course batch (migration 0008).

insert into cgpa.departments (faculty_id, name, slug)
select id, 'Environmental Management and Toxicology', 'environmental-management-and-toxicology' from cgpa.faculties where slug = 'science'
on conflict (faculty_id, slug) do nothing;

insert into cgpa.courses (department_id, year, name, code, kind, approval_status)
select d.id, v.year, v.name, null, 'core', 'approved'
from cgpa.departments d, (values
  (1, 'Principles of Ecology'),
  (1, 'Introduction to Environmental Science'),
  (1, 'General Chemistry for Environmental Science'),
  (2, 'Environmental Chemistry'),
  (2, 'Environmental Microbiology'),
  (2, 'Principles of Toxicology'),
  (3, 'Environmental Pollution and Control'),
  (3, 'Ecotoxicology'),
  (3, 'Environmental Impact Assessment'),
  (4, 'Industrial Toxicology'),
  (4, 'Environmental Law and Policy'),
  (4, 'Waste Management'),
  (5, 'Environmental Risk Assessment'),
  (5, 'Occupational Health and Toxicology'),
  (5, 'Final Year Project')
) as v(year, name)
where d.slug = 'environmental-management-and-toxicology';
