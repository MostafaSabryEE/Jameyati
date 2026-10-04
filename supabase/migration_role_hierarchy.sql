-- Safe upgrade from the v1.1 schema; does not drop application data.
alter table public.profiles
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('super_admin', 'admin', 'jameya_admin', 'member'));

create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and status = 'active'
  );
$$;

create or replace function public.can_manage(j uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select public.is_super_admin()
      or exists (
        select 1
        from public.jameyat y
        left join public.jameya_admins a on a.jameya_id = y.id and a.user_id = auth.uid()
        where y.id = j
          and public.is_active()
          and (
            (public.is_admin() and (y.created_by = auth.uid() or a.user_id is not null
              or exists (select 1 from public.memberships m where m.jameya_id = y.id and m.user_id = auth.uid())))
            or (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'jameya_admin')
              and a.user_id is not null)
          )
      );
$$;

create or replace function public.manages_user(uid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select public.is_super_admin()
      or exists (
        select 1 from public.profiles target
        where target.id = uid and public.is_admin() and target.created_by = auth.uid()
      )
      or exists (
        select 1 from public.memberships m
        where m.user_id = uid and public.can_manage(m.jameya_id)
      );
$$;

create or replace function public.can_delegate(j uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select public.is_super_admin()
      or (public.is_admin() and public.can_manage(j));
$$;

drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_super_write" on public.profiles;
drop policy if exists "profiles_admin_member_update" on public.profiles;
drop policy if exists "jameyat_select" on public.jameyat;
drop policy if exists "jameyat_insert" on public.jameyat;
drop policy if exists "jameyat_update" on public.jameyat;
drop policy if exists "jameyat_delete" on public.jameyat;
drop policy if exists "jameya_admins_select" on public.jameya_admins;
drop policy if exists "jameya_admins_super_write" on public.jameya_admins;

create policy "profiles_select" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_super_admin() or public.manages_user(id));

create policy "profiles_admin_member_insert" on public.profiles for insert to authenticated
  with check (public.is_admin() and role = 'member' and status = 'active' and created_by = auth.uid());

create policy "profiles_super_insert" on public.profiles for insert to authenticated
  with check (public.is_super_admin());

create policy "profiles_super_update_delete" on public.profiles for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

create policy "jameyat_select" on public.jameyat for select to authenticated
  using (public.can_manage(id) or public.is_member_of(id));

create policy "jameyat_insert" on public.jameyat for insert to authenticated
  with check ((public.is_super_admin() or public.is_admin()) and created_by = auth.uid());

create policy "jameyat_update" on public.jameyat for update to authenticated
  using (public.can_manage(id)) with check (public.can_manage(id));

create policy "jameyat_delete" on public.jameyat for delete to authenticated
  using (public.is_super_admin() or (public.is_admin() and created_by = auth.uid()));

create policy "jameya_admins_select" on public.jameya_admins for select to authenticated
  using (user_id = auth.uid() or public.can_manage(jameya_id));

create policy "jameya_admins_manage" on public.jameya_admins for all to authenticated
  using (public.can_delegate(jameya_id)) with check (public.can_delegate(jameya_id));