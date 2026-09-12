-- Device limit per doctrine (cgpa-state-of-play.md, ROLE_SYSTEM): up
-- to 2 devices max per account, self-serve removal, no admin
-- intervention required. Genuinely different mechanism from UTME's
-- bind-device (1 device, hard lock, admin-only unlock) -- not reused
-- as-is, built fresh to this doctrine's own shape.
create table cgpa.devices (
  id bigint generated always as identity primary key,
  student_id uuid not null references cgpa.students(id) on delete cascade,
  -- Hashed fingerprint (user-agent + a locally-generated persistent
  -- random id set on first launch, per doctrine) -- the raw
  -- fingerprint is never stored, only its hash, same privacy-by-
  -- default posture as storing a password hash rather than the
  -- password itself.
  device_hash text not null,
  device_label text, -- best-effort human-readable label (e.g. parsed from user-agent) for the self-serve device list
  first_seen_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  unique (student_id, device_hash)
);

comment on table cgpa.devices is
  'Up to 2 rows per student_id, enforced in application code (a CHECK/trigger on count is avoidable complexity for a limit this size -- checked at login/auth time per doctrine, not via a DB constraint). A 3rd distinct device_hash at login time is blocked with a self-serve screen listing existing devices (+ last_active_at) and a remove action, never requiring admin intervention -- see cgpa-state-of-play.md ROLE_SYSTEM section.';
comment on column cgpa.devices.device_hash is
  'Hash of (user-agent + a locally-generated persistent random ID set on first launch). Raw fingerprint never stored.';

alter table cgpa.devices enable row level security;

create policy "students read own devices" on cgpa.devices
  for select to authenticated using (auth.uid() = student_id);

-- No write policies -- device binding/removal goes through service-
-- role server endpoints (the actual enforcement logic: count check,
-- self-serve removal), same convention as every other write path in
-- this schema.
