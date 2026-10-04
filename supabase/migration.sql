-- =====================================================================
-- Jam'eya v1.1 – multi-Jam'eya schema with delegation and per-share payouts.
-- Paste into the Supabase SQL Editor and run once.
-- WARNING: drops the v1 tables (all Jam'eya data). Auth users are kept and
-- re-imported as profiles; the oldest auth user becomes super_admin.
-- =====================================================================

-- ---------- Clean up v1 -----------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;
drop table if exists public.payments, public.shares_payout_schedule, public.memberships,
  public.jameya_admins, public.jameyat, public.jameya_details, public.profiles cascade;
drop function if exists public.is_admin();
drop function if exists public.is_public_member(uuid);
drop function if exists public.handle_new_user();

-- ---------- Tables ----------------------------------------------------

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  email       text,
  role        text not null default 'member' check (role in ('super_admin', 'admin', 'jameya_admin', 'member')),
  status      text not null default 'active' check (status in ('active', 'suspended')),
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table public.jameyat (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  total_amount         numeric(12,2) not null default 0,   -- payout per full share
  monthly_installment  numeric(12,2) not null default 0,   -- due per full share each month
  duration_months      int not null default 10 check (duration_months > 0),
  start_date           date not null default current_date,
  created_by           uuid references public.profiles(id) on delete set null,
  created_at           timestamptz not null default now()
);

-- Delegated managers: a user listed here manages ONLY that Jam'eya.
create table public.jameya_admins (
  jameya_id  uuid not null references public.jameyat(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  primary key (jameya_id, user_id)
);

create table public.memberships (
  id            uuid primary key default gen_random_uuid(),
  jameya_id     uuid not null references public.jameyat(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  shares_count  numeric(4,2) not null default 1 check (shares_count > 0), -- 1, 1.5, 2, 3 ...
  unique (jameya_id, user_id)
);

-- One row per share the member owns: share_number 1..ceil(shares_count).
create table public.shares_payout_schedule (
  id             uuid primary key default gen_random_uuid(),
  membership_id  uuid not null references public.memberships(id) on delete cascade,
  share_number   int not null check (share_number > 0),
  payout_month   int not null check (payout_month > 0),
  is_paid_out    boolean not null default false,  -- admin confirmed the payout was handed over
  paid_out_at    timestamptz,
  paid_out_by    uuid references public.profiles(id) on delete set null,
  unique (membership_id, share_number)
);

create table public.payments (
  id            uuid primary key default gen_random_uuid(),
  jameya_id     uuid not null references public.jameyat(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  month_number  int not null check (month_number > 0),
  status        text not null default 'pending' check (status in ('paid', 'pending')),
  updated_by    uuid references public.profiles(id) on delete set null,
  updated_at    timestamptz not null default now(),
  unique (jameya_id, user_id, month_number)
);

-- ---------- Helper functions (SECURITY DEFINER avoids RLS recursion) --

create or replace function public.is_active()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and status = 'active');
$$;

create or replace function public.is_super_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles
                 where id = auth.uid() and role = 'super_admin' and status = 'active');
$$;

create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and status = 'active');
$$;

-- Super admin, or a delegated admin of this specific Jam'eya.
create or replace function public.can_manage(j uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select public.is_super_admin()
      or (public.is_active() and exists (
        select 1 from public.jameyat y
        left join public.jameya_admins a on a.jameya_id = y.id and a.user_id = auth.uid()
        where y.id = j and (
          (public.is_admin() and (y.created_by = auth.uid() or a.user_id is not null
            or exists (select 1 from public.memberships m where m.jameya_id = y.id and m.user_id = auth.uid())))
          or (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'jameya_admin')
            and a.user_id is not null)
        )
      ));
$$;

create or replace function public.is_member_of(j uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select public.is_active() and exists (
    select 1 from public.memberships where jameya_id = j and user_id = auth.uid());
$$;

-- True if the caller manages a Jam'eya that this user belongs to.
create or replace function public.manages_user(uid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select public.is_super_admin()
      or exists (select 1 from public.profiles target
                 where target.id = uid and public.is_admin() and target.created_by = auth.uid())
      or exists (select 1 from public.memberships m
                 where m.user_id = uid and public.can_manage(m.jameya_id));
$$;

create or replace function public.can_delegate(j uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select public.is_super_admin()
      or (public.is_admin() and public.can_manage(j));
$$;

-- ---------- Triggers --------------------------------------------------

-- New auth user -> profile. The very first user becomes super_admin.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    case when exists (select 1 from public.profiles) then 'member' else 'super_admin' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Delegating promotes member -> jameya_admin; removing the last delegation demotes back.
create or replace function public.sync_admin_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles set role = 'jameya_admin' where id = new.user_id and role = 'member';
  else
    update public.profiles set role = 'member'
    where id = old.user_id and role = 'jameya_admin'
      and not exists (select 1 from public.jameya_admins where user_id = old.user_id);
  end if;
  return null;
end;
$$;

create trigger on_jameya_admin_change
  after insert or delete on public.jameya_admins
  for each row execute function public.sync_admin_role();

-- Import existing auth users (oldest becomes super_admin).
insert into public.profiles (id, full_name, email, role)
select u.id,
       coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
       u.email,
       case when row_number() over (order by u.created_at) = 1 then 'super_admin' else 'member' end
from auth.users u;

-- ---------- Row Level Security ----------------------------------------

alter table public.profiles                enable row level security;
alter table public.jameyat                 enable row level security;
alter table public.jameya_admins           enable row level security;
alter table public.memberships             enable row level security;
alter table public.shares_payout_schedule  enable row level security;
alter table public.payments                enable row level security;

-- profiles: own row; super admin sees all; delegated admins see members of their Jam'eyat.
-- Writes are super-admin only (members can never change their own role/status).
create policy "profiles_select" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_super_admin() or public.manages_user(id));
create policy "profiles_admin_member_insert" on public.profiles for insert to authenticated
  with check (public.is_admin() and role = 'member' and status = 'active' and created_by = auth.uid());
create policy "profiles_super_insert" on public.profiles for insert to authenticated
  with check (public.is_super_admin());
create policy "profiles_super_write" on public.profiles for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- jameyat: members read theirs; managers read/update theirs; only super admin creates/deletes.
create policy "jameyat_select" on public.jameyat for select to authenticated
  using (public.can_manage(id) or public.is_member_of(id));
create policy "jameyat_insert" on public.jameyat for insert to authenticated
  with check ((public.is_super_admin() or public.is_admin()) and created_by = auth.uid());
create policy "jameyat_update" on public.jameyat for update to authenticated
  using (public.can_manage(id)) with check (public.can_manage(id));
create policy "jameyat_delete" on public.jameyat for delete to authenticated
  using (public.is_super_admin() or (public.is_admin() and created_by = auth.uid()));

-- jameya_admins: only the super admin delegates; delegates can see their own assignment.
create policy "jameya_admins_select" on public.jameya_admins for select to authenticated
  using (user_id = auth.uid() or public.can_manage(jameya_id));
create policy "jameya_admins_manage" on public.jameya_admins for all to authenticated
  using (public.can_delegate(jameya_id)) with check (public.can_delegate(jameya_id));

-- memberships: members read their own; managers manage their Jam'eya.
create policy "memberships_select" on public.memberships for select to authenticated
  using ((user_id = auth.uid() and public.is_active()) or public.can_manage(jameya_id));
create policy "memberships_manage" on public.memberships for all to authenticated
  using (public.can_manage(jameya_id)) with check (public.can_manage(jameya_id));

-- shares_payout_schedule: members read schedules of their own memberships only.
create policy "schedule_select" on public.shares_payout_schedule for select to authenticated
  using (exists (
    select 1 from public.memberships m
    where m.id = membership_id
      and ((m.user_id = auth.uid() and public.is_active()) or public.can_manage(m.jameya_id))));
create policy "schedule_manage" on public.shares_payout_schedule for all to authenticated
  using (exists (select 1 from public.memberships m
                 where m.id = membership_id and public.can_manage(m.jameya_id)))
  with check (exists (select 1 from public.memberships m
                      where m.id = membership_id and public.can_manage(m.jameya_id)));

-- payments: members read their own; managers manage their Jam'eya.
create policy "payments_select" on public.payments for select to authenticated
  using ((user_id = auth.uid() and public.is_active()) or public.can_manage(jameya_id));
create policy "payments_manage" on public.payments for all to authenticated
  using (public.can_manage(jameya_id)) with check (public.can_manage(jameya_id));

revoke all on public.profiles, public.jameyat, public.jameya_admins, public.memberships,
  public.shares_payout_schedule, public.payments from anon;
