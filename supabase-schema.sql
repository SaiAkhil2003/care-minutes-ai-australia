-- ============================================================
-- CareMinutes.ai — Supabase Schema
-- Run this entire file in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension (already enabled on Supabase by default)
-- create extension if not exists "uuid-ossp";

-- ── facilities ────────────────────────────────────────────────────────────────
create table if not exists facilities (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  resident_count   integer default 40,
  manager_name     text,
  manager_email    text,
  manager_phone    text,
  address          text,
  state            text default 'NSW',
  abn              text,
  postcode         text,
  annacc_rate      decimal default 220,
  alert_time       text default '07:00',
  email_alerts     boolean default true,
  sms_alerts       boolean default false,
  created_at       timestamp with time zone default now()
);

-- ── staff ─────────────────────────────────────────────────────────────────────
create table if not exists staff (
  id               uuid primary key default gen_random_uuid(),
  facility_id      uuid references facilities(id) on delete cascade,
  name             text not null,
  role             text not null,         -- RN, EN, PCW
  employment_type  text,                  -- Permanent, Casual, Agency
  phone            text,
  email            text,
  is_active        boolean default true,
  created_at       timestamp with time zone default now()
);

-- ── shifts ────────────────────────────────────────────────────────────────────
create table if not exists shifts (
  id               uuid primary key default gen_random_uuid(),
  facility_id      uuid references facilities(id) on delete cascade,
  staff_id         uuid references staff(id) on delete set null,
  staff_name       text,
  staff_type       text,                  -- RN, EN, PCW
  date             date not null,
  start_time       text,
  end_time         text,
  duration_minutes integer,
  employment_type  text,
  created_at       timestamp with time zone default now()
);

-- ── alerts ────────────────────────────────────────────────────────────────────
create table if not exists alerts (
  id               uuid primary key default gen_random_uuid(),
  facility_id      uuid references facilities(id) on delete cascade,
  date             date,
  status           text,                  -- On Track, Action Needed
  title            text,
  message          text,
  gaps             jsonb default '[]',
  suggested_staff  jsonb default '[]',
  sent_via_email   boolean default false,
  created_at       timestamp with time zone default now()
);

-- ── shift_history ─────────────────────────────────────────────────────────────
create table if not exists shift_history (
  id               uuid primary key default gen_random_uuid(),
  shift_id         uuid references shifts(id) on delete cascade,
  facility_id      uuid references facilities(id) on delete cascade,
  changed_by       text,
  changed_at       timestamp with time zone default now(),
  old_values       jsonb,
  new_values       jsonb,
  reason           text
);

-- ── Row Level Security (RLS) ──────────────────────────────────────────────────
-- Enable RLS but allow all for anon key (demo app — no auth yet)
alter table facilities    enable row level security;
alter table staff         enable row level security;
alter table shifts        enable row level security;
alter table alerts        enable row level security;
alter table shift_history enable row level security;

-- Allow full access for anon key (demo mode — replace with proper auth later)
create policy "allow_all_facilities"    on facilities    for all using (true) with check (true);
create policy "allow_all_staff"         on staff         for all using (true) with check (true);
create policy "allow_all_shifts"        on shifts        for all using (true) with check (true);
create policy "allow_all_alerts"        on alerts        for all using (true) with check (true);
create policy "allow_all_shift_history" on shift_history for all using (true) with check (true);

-- ── Indexes for performance ───────────────────────────────────────────────────
create index if not exists idx_staff_facility       on staff(facility_id);
create index if not exists idx_shifts_facility      on shifts(facility_id);
create index if not exists idx_shifts_date          on shifts(date);
create index if not exists idx_shifts_facility_date on shifts(facility_id, date);
create index if not exists idx_alerts_facility      on alerts(facility_id);
create index if not exists idx_shift_history_shift  on shift_history(shift_id);
