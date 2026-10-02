-- Slug-based counterpart to cgpa.approved_question_count(bigint), added
-- in migration 0014. Course-detail now gets its name/year/kind from
-- the static, bundled catalog ($lib/catalog.ts) -- zero Supabase calls
-- for that. The one thing it still needs live is the approved question
-- count, and it only has a (faculty_slug, dept_slug, course_slug)
-- triple to work with (the URL), not a numeric id. This does the
-- slug -> id resolution and the count in one round trip instead of two.

create or replace function cgpa.approved_question_count_by_slug(
  p_faculty_slug text,
  p_dept_slug text,
  p_course_slug text
)
returns bigint
language sql
security definer
set search_path = cgpa, pg_temp
as $$
  select count(kq.*)
  from cgpa.keystone_questions kq
  join cgpa.courses c on c.id = kq.course_id
  join cgpa.departments d on d.id = c.department_id
  join cgpa.faculties f on f.id = d.faculty_id
  where c.slug = p_course_slug
    and d.slug = p_dept_slug
    and f.slug = p_faculty_slug
    and kq.approval_status = 'approved';
$$;

grant execute on function cgpa.approved_question_count_by_slug(text, text, text) to authenticated, anon;
