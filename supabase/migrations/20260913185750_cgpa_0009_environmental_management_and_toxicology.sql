-- Recovered local file: applied live (via apply_migration, which
-- auto-registers migration history) with no matching local file at
-- all -- found missing during a pre-merge drift check, not stubbed
-- since it's small enough (one statement, ~1KB) to fetch and reproduce
-- exactly rather than write a no-op pointing elsewhere.
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
