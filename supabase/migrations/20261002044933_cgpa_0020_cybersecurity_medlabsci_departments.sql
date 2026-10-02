-- Fills a gap found while merging parallel branches: Cybersecurity and
-- Medical Laboratory Science were added to $lib/catalog.ts (as two of
-- the "four priority programmes" a student can pick at signup) but no
-- migration ever created their departments rows. Signup itself doesn't
-- fail without them -- students.faculty_slug/department_slug are plain
-- text, not a foreign key -- but any future content work (adding real
-- courses under either) goes through /api/submit-course, which
-- resolves (faculty_slug, dept_slug) to a department_id via a live
-- query and would hit "Unknown faculty or department" forever without
-- these rows. Same reasoning and pattern as migration 0019.
--
-- No course content here either, same as 0019 -- that's separate work.

insert into cgpa.departments (faculty_id, name, slug)
select id, 'Cybersecurity', 'cybersecurity' from cgpa.faculties where slug = 'science'
on conflict (faculty_id, slug) do nothing;

insert into cgpa.departments (faculty_id, name, slug)
select id, 'Medical Laboratory Science', 'medical-laboratory-science' from cgpa.faculties where slug = 'medicine'
on conflict (faculty_id, slug) do nothing;
