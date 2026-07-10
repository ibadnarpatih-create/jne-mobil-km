-- Upgrade Movetra:
-- 1) Driver login memakai ID Login seperti TGR250.
-- 2) Kendaraan/aset punya kategori unit, default INBOUND / OUTBOUND.
-- 3) Nama unit bisa diganti dari panel admin.
--
-- Jalankan sekali di Supabase SQL Editor sebelum/atau setelah deploy kode.

alter table public.users
add column if not exists login_id text;

update public.users
set login_id = upper(regexp_replace(coalesce(login_id, nomor_hp), '[^A-Za-z0-9._-]', '', 'g'))
where login_id is null or trim(login_id) = '';

alter table public.users
alter column login_id set not null;

create unique index if not exists users_login_id_key
on public.users (upper(login_id));

alter table public.vehicles
add column if not exists unit_group text not null default 'INBOUND';

update public.vehicles
set unit_group = coalesce(nullif(trim(unit_group), ''), 'INBOUND');

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'app_settings' and policyname = 'authenticated membaca setting'
  ) then
    create policy "authenticated membaca setting"
    on public.app_settings
    for select
    to authenticated
    using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'app_settings' and policyname = 'admin mengelola setting'
  ) then
    create policy "admin mengelola setting"
    on public.app_settings
    for all
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());
  end if;
end $$;

insert into public.app_settings (key, value)
values ('asset_unit_labels', '["INBOUND","OUTBOUND"]'::jsonb)
on conflict (key) do nothing;
