-- 0023: the 39 department course rows behind the end-to-end test banks (28 courses).
-- Names, codes, years and kinds come from curriculum/build, so the rows match what the curriculum
-- already says. Slug rule is the one from 0016. Safe to apply twice: existing rows are left alone.
-- Must run before the depot questions migration that follows it, which attaches each question
-- to the first department's course row and fails if that row is missing.

insert into cgpa.courses (department_id, year, name, code, kind, slug, approval_status)
select d.id, v.year, v.name, v.code, v.kind,
       lower(regexp_replace(coalesce(v.code, v.name), '[^a-zA-Z0-9]+', '-', 'g')), 'approved'
from (values
  ('general-studies', 'general-studies', 1, 'Communication in English', 'GST111', 'core'),
  ('general-studies', 'general-studies', 1, 'Nigerian Peoples and Culture', 'GST112', 'core'),
  ('general-studies', 'general-studies', 2, 'Entrepreneurship and Innovation', 'ENT211', 'core'),
  ('general-studies', 'general-studies', 2, 'Philosophy, Logic and Human Existence', 'GST212', 'core'),
  ('general-studies', 'general-studies', 3, 'Venture Creation', 'ENT312', 'core'),
  ('general-studies', 'general-studies', 3, 'Peace and Conflict Resolution', 'GST312', 'core'),
  ('medicine', 'human-medicine', 1, 'General Chemistry I', 'CHEM111', 'core'),
  ('medicine', 'human-medicine', 1, 'General Chemistry II', 'CHEM122', 'core'),
  ('medicine', 'human-medicine', 1, 'Practical Physics', 'PHY109', 'core'),
  ('medicine', 'human-medicine', 2, 'General Embryology', 'ANT214', 'core'),
  ('medicine', 'human-medicine', 3, 'Neuroanatomy', 'ANT315', 'core'),
  ('medicine', 'human-medicine', 3, 'General Pathology', 'MAN326', 'core'),
  ('medicine', 'human-medicine', 3, 'General Pharmacology', 'PCO320', 'core'),
  ('medicine', 'human-medicine', 4, 'Systemic Pharmacology', 'PCO421', 'core'),
  ('medicine', 'human-medicine', 4, 'Chemotherapy', 'PCO441', 'core'),
  ('medicine', 'medical-laboratory-science', 1, 'General Biology I', 'BIO101', 'core'),
  ('pharmacy', 'pharmacy', 1, 'General Biology I', 'BIO101', 'core'),
  ('medicine', 'medical-laboratory-science', 1, 'General Biology II', 'BIO102', 'core'),
  ('pharmacy', 'pharmacy', 1, 'General Biology II', 'BIO102', 'core'),
  ('medicine', 'medical-laboratory-science', 1, 'General Practical Biology I', 'BIO107', 'core'),
  ('pharmacy', 'pharmacy', 1, 'General Biology Practical I', 'BIO107', 'core'),
  ('medicine', 'medical-laboratory-science', 1, 'General Practical Biology II', 'BIO108', 'core'),
  ('pharmacy', 'pharmacy', 1, 'General Biology Practical II', 'BIO108', 'core'),
  ('medicine', 'medical-laboratory-science', 1, 'General Practical Chemistry I', 'CHM107', 'core'),
  ('pharmacy', 'pharmacy', 1, 'General Chemistry Practical I', 'CHM107', 'core'),
  ('medicine', 'medical-laboratory-science', 1, 'General Practical Chemistry II', 'CHM108', 'core'),
  ('pharmacy', 'pharmacy', 1, 'General Chemistry Practical II', 'CHM108', 'core'),
  ('medicine', 'medical-laboratory-science', 1, 'General Physics I', 'PHY101', 'core'),
  ('pharmacy', 'pharmacy', 1, 'General Physics I', 'PHY101', 'core'),
  ('medicine', 'medical-laboratory-science', 1, 'General Physics II', 'PHY102', 'core'),
  ('pharmacy', 'pharmacy', 1, 'General Physics II', 'PHY102', 'core'),
  ('medicine', 'medical-laboratory-science', 1, 'General Practical Physics I', 'PHY107', 'core'),
  ('pharmacy', 'pharmacy', 1, 'General Physics Practical I', 'PHY107', 'core'),
  ('medicine', 'medical-laboratory-science', 1, 'General Practical Physics II', 'PHY108', 'core'),
  ('pharmacy', 'pharmacy', 1, 'General Physics Practical II', 'PHY108', 'core'),
  ('medicine', 'medical-laboratory-science', 2, 'Introductory Physiology and Blood', 'PIO201', 'core'),
  ('pharmacy', 'pharmacy', 2, 'Introductory and Blood Physiology', 'PIO201', 'core'),
  ('medicine', 'medical-laboratory-science', 2, 'Biostatistics', 'STA201', 'core'),
  ('medicine', 'medical-laboratory-science', 4, 'Research Methodology', 'MLS406', 'core')
) as v(faculty_slug, dept_slug, year, name, code, kind)
join cgpa.faculties f on f.slug = v.faculty_slug
join cgpa.departments d on d.faculty_id = f.id and d.slug = v.dept_slug
on conflict (department_id, slug) do nothing;
