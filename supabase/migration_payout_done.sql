-- Adds "payout done" tracking to an existing v1.1 database (no data loss).
alter table public.shares_payout_schedule
  add column if not exists is_paid_out boolean not null default false,
  add column if not exists paid_out_at timestamptz,
  add column if not exists paid_out_by uuid references public.profiles(id) on delete set null;
