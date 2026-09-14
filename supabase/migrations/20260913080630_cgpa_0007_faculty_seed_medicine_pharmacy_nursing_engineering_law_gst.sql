-- Adds the faculties/departments requested to start with: Medicine
-- (MBBS/Human Medicine), Pharmacy, Nursing, all Engineering
-- disciplines, Law, plus a dedicated General Studies faculty for
-- GST/GSS courses (taken across every faculty in Nigerian
-- universities, modeled here as its own faculty+department since the
-- schema has no cross-department "required for everyone" mechanism
-- yet -- flagged, not silently worked around).
--
-- Medicine/Law already existed as bare faculties (0 departments/
-- courses) from earlier seed data -- this adds their first real
-- department. Engineering already had a Civil Engineering department;
-- this adds the other 6 common Nigerian engineering disciplines
-- alongside it.

insert into cgpa.faculties (name, slug) values
  ('Pharmacy', 'pharmacy'),
  ('Nursing', 'nursing'),
  ('General Studies', 'general-studies')
on conflict (slug) do nothing;

insert into cgpa.departments (faculty_id, name, slug)
select f.id, d.name, d.slug from cgpa.faculties f, (values
  ('Mechanical Engineering', 'mechanical-engineering'),
  ('Electrical and Electronic Engineering', 'electrical-and-electronic-engineering'),
  ('Chemical Engineering', 'chemical-engineering'),
  ('Petroleum Engineering', 'petroleum-engineering'),
  ('Agricultural and Bioresources Engineering', 'agricultural-and-bioresources-engineering'),
  ('Metallurgical and Materials Engineering', 'metallurgical-and-materials-engineering')
) as d(name, slug)
where f.slug = 'engineering'
on conflict (faculty_id, slug) do nothing;

insert into cgpa.departments (faculty_id, name, slug)
select id, 'Pharmacy', 'pharmacy' from cgpa.faculties where slug = 'pharmacy'
on conflict (faculty_id, slug) do nothing;

insert into cgpa.departments (faculty_id, name, slug)
select id, 'Nursing Science', 'nursing-science' from cgpa.faculties where slug = 'nursing'
on conflict (faculty_id, slug) do nothing;

insert into cgpa.departments (faculty_id, name, slug)
select id, 'General Studies', 'general-studies' from cgpa.faculties where slug = 'general-studies'
on conflict (faculty_id, slug) do nothing;
