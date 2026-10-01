-- ============================================================================
-- Companion to $lib/catalog.ts, the bundled faculty/department/course
-- catalog every browse route reads instead of querying live. This
-- table is still what courses.department_id keys against, so the two
-- need to stay in sync. (Originally written against the shorter-lived
-- $lib/data/faculties.ts, superseded when this and the fuller
-- hardcoded-catalog work were merged -- catalog.ts already carries
-- Economics, Insurance and Microbiology as real entries.)
--
-- Economics and Insurance are from PROJECT_BRIEF.md's original 7
-- faculties and had never been seeded in any prior migration under
-- any name -- added per explicit founder instruction ("add both")
-- rather than dropped.
--
-- Microbiology, also from PROJECT_BRIEF.md's original 7, had likewise
-- never been seeded as either a faculty or a department. Added as a
-- department under Science (alongside Biochemistry, its closest
-- existing sibling in every seed batch) rather than as an eighth
-- top-level faculty with zero precedent in any prior migration.
--
-- None of the three get course content in this migration -- that's
-- real, separate content work. Without a department row, though,
-- courses.department_id has nothing to reference if/when that content
-- shows up, so this migration exists to make that possible, not to
-- populate it.
-- ============================================================================

insert into cgpa.faculties (name, slug) values
  ('Economics', 'economics'),
  ('Insurance', 'insurance')
on conflict (slug) do nothing;

insert into cgpa.departments (faculty_id, name, slug)
select id, 'Economics', 'economics' from cgpa.faculties where slug = 'economics'
on conflict (faculty_id, slug) do nothing;

insert into cgpa.departments (faculty_id, name, slug)
select id, 'Insurance', 'insurance' from cgpa.faculties where slug = 'insurance'
on conflict (faculty_id, slug) do nothing;

insert into cgpa.departments (faculty_id, name, slug)
select id, 'Microbiology', 'microbiology' from cgpa.faculties where slug = 'science'
on conflict (faculty_id, slug) do nothing;
