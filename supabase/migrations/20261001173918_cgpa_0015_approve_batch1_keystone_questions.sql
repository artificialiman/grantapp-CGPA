-- Approves the 56 real pending keystone_questions from migration 0012
-- ("batch1" -- Anatomy I, Pharmacology I, Anatomy for Nursing,
-- Nigerian Legal System, Engineering Mathematics I, GST101, Principles
-- of Toxicology). Explicitly authorized directly by Iman in this
-- session ("I approve ALL the current batch of questions") -- unlike
-- the earlier reconciliation work in this repo, this migration is not
-- an agent judgment call standing in for review; the review happened,
-- this just records its outcome.
--
-- Scoped to approval_status = 'pending' alone, not also filtered by
-- source: 'standard' turned out to be shared with the BCH101
-- test-fixture rows (checked directly), so it isn't a safe
-- differentiator on its own. Confirmed separately, before writing
-- this, that batch1 is the only source of pending rows anywhere in the
-- table right now -- the BCH101 rows are already 'approved', so a bare
-- pending filter cannot touch them regardless. If student-submitted
-- content (source = 'user_submitted', INVARIANTS #15) is ever pending
-- when a migration like this runs again, that path still needs its own
-- review step before a blanket approval like this one is repeated.

update cgpa.keystone_questions
set
  approval_status = 'approved',
  -- Every batch1 explanation was authored with a literal
  -- "[PENDING REVIEW] " prefix as a visual marker for the reviewer.
  -- Approving without stripping it would show that exact string to a
  -- real student as part of their answer explanation.
  explanation = regexp_replace(explanation, '^\[PENDING REVIEW\]\s*', '')
where approval_status = 'pending';
