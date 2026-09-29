-- Completes General Studies to the full standard/stipulated GST/GSS
-- core, per Iman's explicit request to list and add the standard
-- courses "making concessions for the ones unique to a few schools by
-- making it general." Cross-checked across NOUN, UNILAG, UNIZIK, and
-- the NUC's CCMAS 2023 core curriculum reform before writing anything
-- (not assumed) -- one real finding worth recording here: exact course
-- CODES are not standardized nationally (UNILAG's GST102 is
-- "Philosophy, Logic and Philosophy of Science"; NOUN's GST102 is
-- "Use of English II"). What CCMAS actually standardizes is topic
-- coverage, not numbering. The 6 courses already seeded (migration
-- 0007/0008's General Studies department) covered the clear universal
-- core; this adds the remaining 3 standard topics:
--
-- - History and Philosophy of Science: many schools split this by
--   stream (arts/social-science vs science students get different
--   versions) -- generalized here as one course rather than two
--   stream-specific ones, since which split exists is a school-level
--   implementation detail, not a separately mandated course.
-- - Basic ICT and Computer Appreciation: common (NOUN's GST103 is
--   exactly this) but not universal -- some schools teach it under a
--   departmental code instead of GST. Included since it's standard
--   enough to belong in a generalized core, flagged here rather than
--   silently treated as certain.
-- - Entrepreneurship Studies II (Venture Creation): the practical,
--   often business-plan-assessed follow-on to the Entrepreneurship I
--   course already seeded.
--
-- Deliberately NOT added, and not generalized into a single row: a
-- Nigerian/indigenous-language requirement (e.g. UNIZIK's required
-- Igbo course). This is real at several schools but tied to a specific
-- regional language, so representing it as one universal course would
-- misstate it -- noted as "varies by institution/region" rather than
-- forced into the schema.

insert into cgpa.courses (department_id, year, name, code, kind, approval_status)
select d.id, v.year, v.name, v.code, 'core', 'approved'
from cgpa.departments d, (values
  (1, 'History and Philosophy of Science', 'GST105'),
  (1, 'Basic ICT and Computer Appreciation', 'GST106'),
  (3, 'Entrepreneurship Studies II (Venture Creation)', 'GST302')
) as v(year, name, code)
where d.slug = 'general-studies';
