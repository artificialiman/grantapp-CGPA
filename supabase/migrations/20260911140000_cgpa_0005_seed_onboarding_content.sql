-- Minimal real seed content so the onboarding flow (Faculty ->
-- Department -> course-path-by-year) is testable end to end during
-- build/iteration, per the "seed set exists, students fill gaps"
-- model confirmed for the first buildable slice. Not exhaustive — one
-- fully fleshed-out path (Science -> Computer Science, years 1-2) plus
-- placeholder departments for the other 3 faculties so the
-- Faculty/Department browse screens have real breadth to test against,
-- even though only one department has actual course content yet.
insert into cgpa.faculties (name, slug) values
  ('Science', 'science'),
  ('Engineering', 'engineering'),
  ('Law', 'law'),
  ('Medicine', 'medicine')
on conflict (slug) do nothing;

insert into cgpa.departments (faculty_id, name, slug)
select f.id, d.name, d.slug
from (values
  ('science', 'Computer Science', 'computer-science'),
  ('science', 'Biochemistry', 'biochemistry'),
  ('engineering', 'Civil Engineering', 'civil-engineering'),
  ('law', 'Common Law', 'common-law'),
  ('medicine', 'Human Medicine', 'human-medicine')
) as d(faculty_slug, name, slug)
join cgpa.faculties f on f.slug = d.faculty_slug
on conflict (faculty_id, slug) do nothing;

insert into cgpa.courses (department_id, year, name, code, kind, approval_status)
select dep.id, c.year, c.name, c.code, c.kind, 'approved'
from (values
  ('computer-science', 1, 'Introduction to Computer Science', 'CSC101', 'core'),
  ('computer-science', 1, 'Calculus I', 'MTH101', 'core'),
  ('computer-science', 1, 'Use of English', 'GST101', 'core'),
  ('computer-science', 1, 'Introduction to Sociology', 'SOC101', 'elective'),
  ('computer-science', 2, 'Data Structures and Algorithms', 'CSC201', 'core'),
  ('computer-science', 2, 'Discrete Mathematics', 'MTH201', 'core'),
  ('computer-science', 2, 'Digital Logic Design', 'CSC202', 'elective')
) as c(department_slug, year, name, code, kind)
join cgpa.departments dep on dep.slug = c.department_slug
on conflict do nothing;
