-- Trip aset antar hub/kota. Jalankan sekali di Supabase SQL Editor.
create table if not exists public.asset_trips (
  id uuid primary key default gen_random_uuid(),
  driver_name text not null,
  driver_nik text not null,
  vehicle_plate text not null,
  vehicle_name text not null,
  shipments jsonb not null default '[]'::jsonb,
  destinations jsonb not null default '[]'::jsonb,
  inspection jsonb not null default '{}'::jsonb,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now()
);

create index if not exists asset_trips_created_at_idx on public.asset_trips(created_at desc);
alter table public.asset_trips enable row level security;
drop policy if exists "admin mengelola trip aset" on public.asset_trips;
create policy "admin mengelola trip aset" on public.asset_trips
  for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "driver membaca trip aset" on public.asset_trips;
create policy "driver membaca trip aset" on public.asset_trips
  for select using (created_by = auth.uid() or public.is_admin());
