-- Adds a deterministic, human-readable slug to cgpa.courses. Needed
-- because course id is `generated always as identity` -- assigned by
-- Postgres in insertion order, not knowable from reading the seed
-- migrations, and not something a hardcoded, bundled catalog can
-- safely reference. `code` was the obvious alternative but most
-- courses (Medicine, Pharmacy, Nursing, Law, most of Engineering) were
-- seeded with code = NULL, so it isn't a universal key either.
--
-- slug is unique per (department_id, slug), not globally -- several
-- courses share a name across departments by design (all 7 Engineering
-- disciplines share "Engineering Mathematics I" in year 1), and that's
-- fine as long as lookups are always scoped by department, which every
-- caller already has (the URL is always /faculties/{f}/{d}/{course}).

alter table cgpa.courses add column slug text;

update cgpa.courses
set slug = lower(regexp_replace(coalesce(code, name), '[^a-zA-Z0-9]+', '-', 'g'))
where slug is null;

alter table cgpa.courses alter column slug set not null;
alter table cgpa.courses add constraint courses_department_slug_unique unique (department_id, slug);
