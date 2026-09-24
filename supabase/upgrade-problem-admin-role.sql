alter type public.user_role add value if not exists 'ADMIN_PROBLEM';
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.users where id = auth.uid() and role in ('ADMIN', 'ADMIN_PROBLEM') and status = true)
$$;
