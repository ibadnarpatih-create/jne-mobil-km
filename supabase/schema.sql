-- JNE Mobile KM — jalankan seluruh file ini di Supabase SQL Editor.
create extension if not exists "pgcrypto";

create type public.user_role as enum ('DRIVER', 'ADMIN');
create type public.log_status as enum ('Belum Selesai', 'Selesai', 'Perlu Diperiksa', 'Dikunci');

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  nama text not null,
  nomor_hp text not null unique,
  role public.user_role not null default 'DRIVER',
  status boolean not null default true,
  kendaraan_utama_id uuid,
  keterangan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  kode_mobil text not null,
  plat_nomor text not null unique,
  jenis_kendaraan text not null,
  km_terakhir bigint not null default 0 check (km_terakhir >= 0),
  status boolean not null default true,
  keterangan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users add constraint users_kendaraan_utama_fk foreign key (kendaraan_utama_id) references public.vehicles(id) on delete set null;

create table public.vehicle_logs (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null default (now() at time zone 'Asia/Jakarta')::date,
  vehicle_id uuid not null references public.vehicles(id),
  driver_id uuid not null references public.users(id),
  jam_awal time not null default (now() at time zone 'Asia/Jakarta')::time,
  jam_akhir time,
  km_awal bigint not null check (km_awal >= 0),
  km_akhir bigint,
  jarak_tempuh bigint generated always as (case when km_akhir is null then null else km_akhir - km_awal end) stored,
  foto_km_awal text not null,
  foto_km_akhir text,
  latitude_awal numeric(10,7),
  longitude_awal numeric(10,7),
  latitude_akhir numeric(10,7),
  longitude_akhir numeric(10,7),
  status public.log_status not null default 'Belum Selesai',
  catatan_admin text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint km_akhir_valid check (km_akhir is null or km_akhir >= km_awal)
);

create unique index one_open_trip_per_driver on public.vehicle_logs(driver_id) where jam_akhir is null;
create index vehicle_logs_tanggal_idx on public.vehicle_logs(tanggal desc);
create index vehicle_logs_vehicle_idx on public.vehicle_logs(vehicle_id);

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.users where id = auth.uid() and role = 'ADMIN' and status = true)
$$;

alter table public.users enable row level security;
alter table public.vehicles enable row level security;
alter table public.vehicle_logs enable row level security;

create policy "user membaca profil sendiri" on public.users for select using (id = auth.uid() or public.is_admin());
create policy "admin mengelola user" on public.users for all using (public.is_admin()) with check (public.is_admin());
create policy "pengguna membaca kendaraan aktif" on public.vehicles for select to authenticated using (status = true or public.is_admin());
create policy "admin mengelola kendaraan" on public.vehicles for all using (public.is_admin()) with check (public.is_admin());
create policy "driver membaca log sendiri" on public.vehicle_logs for select using (driver_id = auth.uid() or public.is_admin());
create policy "driver membuat log sendiri" on public.vehicle_logs for insert with check (driver_id = auth.uid());
create policy "driver mengubah log belum dikunci" on public.vehicle_logs for update using (driver_id = auth.uid() and status <> 'Dikunci') with check (driver_id = auth.uid() and status <> 'Dikunci');
create policy "admin mengelola semua log" on public.vehicle_logs for all using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dashboard-photos', 'dashboard-photos', false, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "driver unggah foto sendiri" on storage.objects for insert to authenticated
with check (bucket_id = 'dashboard-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "driver membaca foto sendiri" on storage.objects for select to authenticated
using (bucket_id = 'dashboard-photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy "admin mengelola foto" on storage.objects for all to authenticated
using (bucket_id = 'dashboard-photos' and public.is_admin()) with check (bucket_id = 'dashboard-photos' and public.is_admin());

create or replace function public.finish_vehicle_log(p_log_id uuid, p_km_akhir bigint, p_foto text, p_lat numeric default null, p_lng numeric default null)
returns public.vehicle_logs language plpgsql security invoker as $$
declare result public.vehicle_logs;
begin
  update public.vehicle_logs set
    jam_akhir = (now() at time zone 'Asia/Jakarta')::time,
    km_akhir = p_km_akhir,
    foto_km_akhir = p_foto,
    latitude_akhir = p_lat,
    longitude_akhir = p_lng,
    status = case when p_km_akhir - km_awal > 300 then 'Perlu Diperiksa'::public.log_status else 'Selesai'::public.log_status end,
    updated_at = now()
  where id = p_log_id and driver_id = auth.uid() and status <> 'Dikunci'
  returning * into result;
  if result.id is null then raise exception 'Perjalanan tidak ditemukan atau sudah dikunci'; end if;
  update public.vehicles set km_terakhir = p_km_akhir, updated_at = now() where id = result.vehicle_id;
  return result;
end $$;
