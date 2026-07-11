-- Movetra BBM - Fase 1
-- Aman dijalankan pada database yang sudah memakai schema.sql.

create extension if not exists "pgcrypto";

do $$ begin
  create type public.fuel_transaction_status as enum
    ('DRAFT', 'SUBMITTED', 'VERIFIED', 'NEED_REVIEW', 'REJECTED');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.fuel_filling_type as enum ('FULL', 'PARTIAL');
exception when duplicate_object then null;
end $$;

alter table public.vehicles
  add column if not exists fuel_tank_capacity numeric(10,2)
  check (fuel_tank_capacity is null or fuel_tank_capacity > 0);

create table if not exists public.fuel_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fuel_types_name_not_blank check (trim(name) <> ''),
  constraint fuel_types_code_not_blank check (trim(code) <> '')
);
create unique index if not exists fuel_types_name_key on public.fuel_types (lower(name));
create unique index if not exists fuel_types_code_key on public.fuel_types (upper(code));

create table if not exists public.fuel_prices (
  id uuid primary key default gen_random_uuid(),
  fuel_type_id uuid not null references public.fuel_types(id),
  price_per_liter numeric(14,2) not null check (price_per_liter > 0),
  effective_start_date date not null,
  effective_end_date date,
  is_active boolean not null default true,
  created_by uuid references public.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fuel_prices_date_valid check (
    effective_end_date is null or effective_end_date >= effective_start_date
  )
);
create index if not exists fuel_prices_lookup_idx
  on public.fuel_prices (fuel_type_id, effective_start_date desc, effective_end_date)
  where is_active;

create or replace function public.prevent_overlapping_fuel_prices()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.is_active and exists (
    select 1 from public.fuel_prices existing
    where existing.fuel_type_id = new.fuel_type_id
      and existing.is_active
      and existing.id <> new.id
      and daterange(
        existing.effective_start_date,
        coalesce(existing.effective_end_date + 1, 'infinity'::date),
        '[)'
      ) && daterange(
        new.effective_start_date,
        coalesce(new.effective_end_date + 1, 'infinity'::date),
        '[)'
      )
  ) then
    raise exception 'Periode harga BBM aktif tidak boleh tumpang tindih';
  end if;
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists fuel_prices_no_overlap on public.fuel_prices;
create trigger fuel_prices_no_overlap
before insert or update on public.fuel_prices
for each row execute function public.prevent_overlapping_fuel_prices();

create table if not exists public.fuel_stations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null,
  address text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fuel_stations_name_not_blank check (trim(name) <> ''),
  constraint fuel_stations_code_not_blank check (trim(code) <> ''),
  constraint fuel_stations_latitude_valid check (latitude is null or latitude between -90 and 90),
  constraint fuel_stations_longitude_valid check (longitude is null or longitude between -180 and 180)
);
create unique index if not exists fuel_stations_code_key on public.fuel_stations (upper(code));
create index if not exists fuel_stations_name_idx on public.fuel_stations (lower(name));

create table if not exists public.fuel_transactions (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id),
  driver_id uuid not null references public.users(id),
  transaction_date date not null,
  transaction_time time not null,
  odometer_at_refuel bigint not null check (odometer_at_refuel >= 0),
  fuel_type_id uuid not null references public.fuel_types(id),
  price_per_liter numeric(14,2) not null check (price_per_liter > 0),
  total_liters numeric(10,2) not null check (total_liters > 0),
  estimated_amount numeric(16,2) not null check (estimated_amount >= 0),
  real_payment numeric(16,2) not null check (real_payment >= 0),
  payment_difference numeric(16,2) not null,
  total_distance bigint not null default 0 check (total_distance >= 0),
  fuel_efficiency numeric(12,2),
  cost_per_km numeric(16,2),
  fuel_station_id uuid references public.fuel_stations(id) on delete set null,
  fuel_station_name text,
  location text,
  payment_method text,
  receipt_number text,
  receipt_photo_url text,
  odometer_photo_url text,
  filling_type public.fuel_filling_type not null,
  notes text,
  status public.fuel_transaction_status not null default 'DRAFT',
  verified_by uuid references public.users(id) on delete set null,
  verified_at timestamptz,
  rejection_reason text,
  created_by uuid not null references public.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fuel_efficiency_valid check (fuel_efficiency is null or fuel_efficiency >= 0),
  constraint fuel_cost_per_km_valid check (cost_per_km is null or cost_per_km >= 0)
);
create index if not exists fuel_transactions_date_idx on public.fuel_transactions (transaction_date desc);
create index if not exists fuel_transactions_vehicle_idx on public.fuel_transactions (vehicle_id);
create index if not exists fuel_transactions_driver_idx on public.fuel_transactions (driver_id);
create index if not exists fuel_transactions_status_idx on public.fuel_transactions (status);
create index if not exists fuel_transactions_type_idx on public.fuel_transactions (fuel_type_id);
create index if not exists fuel_transactions_station_idx on public.fuel_transactions (fuel_station_id);

create table if not exists public.fuel_transaction_trips (
  id uuid primary key default gen_random_uuid(),
  fuel_transaction_id uuid not null references public.fuel_transactions(id) on delete cascade,
  trip_id uuid not null references public.vehicle_logs(id),
  created_at timestamptz not null default now(),
  unique (fuel_transaction_id, trip_id)
);
create index if not exists fuel_transaction_trips_trip_idx on public.fuel_transaction_trips (trip_id);

create table if not exists public.fuel_transaction_status_history (
  id uuid primary key default gen_random_uuid(),
  fuel_transaction_id uuid not null references public.fuel_transactions(id) on delete cascade,
  old_status public.fuel_transaction_status,
  new_status public.fuel_transaction_status not null,
  notes text,
  changed_by uuid references public.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists fuel_status_history_transaction_idx
  on public.fuel_transaction_status_history (fuel_transaction_id, created_at desc);

create or replace function public.active_fuel_price(p_fuel_type_id uuid, p_date date)
returns numeric language sql stable security invoker set search_path = public as $$
  select price_per_liter
  from public.fuel_prices
  where fuel_type_id = p_fuel_type_id
    and is_active
    and effective_start_date <= p_date
    and (effective_end_date is null or effective_end_date >= p_date)
  order by effective_start_date desc
  limit 1
$$;

alter table public.fuel_types enable row level security;
alter table public.fuel_prices enable row level security;
alter table public.fuel_stations enable row level security;
alter table public.fuel_transactions enable row level security;
alter table public.fuel_transaction_trips enable row level security;
alter table public.fuel_transaction_status_history enable row level security;

do $$ begin
  create policy "authenticated membaca jenis BBM" on public.fuel_types
    for select to authenticated using (is_active or public.is_admin());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "admin mengelola jenis BBM" on public.fuel_types
    for all to authenticated using (public.is_admin()) with check (public.is_admin());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "authenticated membaca harga BBM" on public.fuel_prices
    for select to authenticated using (is_active or public.is_admin());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "admin mengelola harga BBM" on public.fuel_prices
    for all to authenticated using (public.is_admin()) with check (public.is_admin());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "authenticated membaca SPBU" on public.fuel_stations
    for select to authenticated using (is_active or public.is_admin());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "admin mengelola SPBU" on public.fuel_stations
    for all to authenticated using (public.is_admin()) with check (public.is_admin());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "pengguna membaca transaksi BBM sendiri" on public.fuel_transactions
    for select to authenticated using (driver_id = auth.uid() or created_by = auth.uid() or public.is_admin());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "pengguna membuat draft BBM sendiri" on public.fuel_transactions
    for insert to authenticated with check (created_by = auth.uid() and driver_id = auth.uid() and status = 'DRAFT');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "pengguna mengubah draft BBM sendiri" on public.fuel_transactions
    for update to authenticated using (created_by = auth.uid() and status = 'DRAFT')
    with check (created_by = auth.uid() and status = 'DRAFT');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "admin mengelola transaksi BBM" on public.fuel_transactions
    for all to authenticated using (public.is_admin()) with check (public.is_admin());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "pengguna membaca relasi perjalanan BBM" on public.fuel_transaction_trips
    for select to authenticated using (exists (
      select 1 from public.fuel_transactions ft where ft.id = fuel_transaction_id
        and (ft.driver_id = auth.uid() or ft.created_by = auth.uid() or public.is_admin())
    ));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "admin mengelola relasi perjalanan BBM" on public.fuel_transaction_trips
    for all to authenticated using (public.is_admin()) with check (public.is_admin());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "pengguna membaca riwayat status BBM" on public.fuel_transaction_status_history
    for select to authenticated using (exists (
      select 1 from public.fuel_transactions ft where ft.id = fuel_transaction_id
        and (ft.driver_id = auth.uid() or ft.created_by = auth.uid() or public.is_admin())
    ));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "admin mengelola riwayat status BBM" on public.fuel_transaction_status_history
    for all to authenticated using (public.is_admin()) with check (public.is_admin());
exception when duplicate_object then null; end $$;

insert into public.fuel_types (name, code, description)
values
  ('Pertalite', 'PERTALITE', 'Bensin RON 90'),
  ('Pertamax', 'PERTAMAX', 'Bensin RON 92'),
  ('Pertamax Turbo', 'PERTAMAX_TURBO', 'Bensin RON 98'),
  ('Biosolar', 'BIOSOLAR', 'Bahan bakar diesel bersubsidi'),
  ('Dexlite', 'DEXLITE', 'Bahan bakar diesel CN 51'),
  ('Pertamina Dex', 'PERTAMINA_DEX', 'Bahan bakar diesel CN 53')
on conflict do nothing;

insert into public.app_settings (key, value)
values ('fuel_anomaly_thresholds', '{"minimum_km_per_liter":3,"maximum_km_per_liter":25,"maximum_payment_difference_percent":10}'::jsonb)
on conflict (key) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fuel-photos', 'fuel-photos', false, 3145728, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$ begin
  create policy "pengguna unggah foto BBM sendiri" on storage.objects
    for insert to authenticated with check (
      bucket_id = 'fuel-photos' and (storage.foldername(name))[1] = auth.uid()::text
    );
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "pengguna membaca foto BBM sendiri" on storage.objects
    for select to authenticated using (
      bucket_id = 'fuel-photos'
      and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
    );
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "admin mengelola foto BBM" on storage.objects
    for all to authenticated using (bucket_id = 'fuel-photos' and public.is_admin())
    with check (bucket_id = 'fuel-photos' and public.is_admin());
exception when duplicate_object then null; end $$;

grant execute on function public.active_fuel_price(uuid, date) to authenticated;
