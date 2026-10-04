create index if not exists idx_payments_jameya_user
  on public.payments (jameya_id, user_id);

create index if not exists idx_memberships_jameya
  on public.memberships (jameya_id);

create index if not exists idx_shares_payout
  on public.shares_payout_schedule (membership_id);

create index if not exists idx_profiles_created_by
  on public.profiles (created_by);

create index if not exists idx_jameya_admins_user
  on public.jameya_admins (user_id);
