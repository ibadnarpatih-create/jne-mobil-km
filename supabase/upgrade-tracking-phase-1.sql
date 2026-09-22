-- Tracking pilot. Run once through Supabase SQL Editor before enabling the pilot.
begin;
create table public.tracking_points (
  id uuid primary key,
  log_id uuid not null references public.vehicle_logs(id) on delete cascade,
  driver_id uuid not null references public.users(id),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  accuracy double precision not null check (accuracy >= 0 and accuracy < 100000),
  recorded_at timestamptz not null,
  received_at timestamptz not null default now()
);
create index tracking_points_trip_time on public.tracking_points(log_id, recorded_at desc);
create table public.tracking_latest (
  log_id uuid primary key references public.vehicle_logs(id) on delete cascade,
  driver_id uuid not null references public.users(id),
  latitude double precision not null,
  longitude double precision not null,
  accuracy double precision not null,
  recorded_at timestamptz not null,
  received_at timestamptz not null
);
alter table public.tracking_points enable row level security;
alter table public.tracking_latest enable row level security;
create policy "tracking history read" on public.tracking_points for select to authenticated
  using (driver_id = auth.uid() or public.is_admin());
create policy "tracking latest read" on public.tracking_latest for select to authenticated
  using (driver_id = auth.uid() or public.is_admin());
revoke all on public.tracking_points, public.tracking_latest from anon, authenticated;
grant select on public.tracking_points, public.tracking_latest to authenticated;

create function public.record_tracking_point(
  p_id uuid, p_log_id uuid, p_latitude double precision,
  p_longitude double precision, p_accuracy double precision, p_recorded_at timestamptz
) returns void language plpgsql security definer set search_path = public as $$
declare trip public.vehicle_logs;
begin
  -- Lock the trip so completion and point submission cannot race.
  select * into trip from public.vehicle_logs where id = p_log_id for update;
  if trip.id is null or trip.driver_id <> auth.uid() or auth.uid() is null
     or trip.jam_akhir is not null or trip.status <> 'Belum Selesai'
     or not exists(select 1 from public.users where id = auth.uid() and status and role = 'DRIVER') then
    raise exception 'Perjalanan tidak aktif atau tidak diizinkan' using errcode = '42501';
  end if;
  if p_recorded_at is null or p_recorded_at > now() + interval '1 minute'
     or p_recorded_at < greatest(trip.created_at - interval '1 minute', now() - interval '24 hours') then
    raise exception 'Waktu lokasi tidak valid' using errcode = '22023';
  end if;
  insert into public.tracking_points(id, log_id, driver_id, latitude, longitude, accuracy, recorded_at)
  values(p_id, p_log_id, auth.uid(), p_latitude, p_longitude, p_accuracy, p_recorded_at)
  on conflict(id) do nothing;
  if not found then return; end if;
  insert into public.tracking_latest(log_id, driver_id, latitude, longitude, accuracy, recorded_at, received_at)
  values(p_log_id, auth.uid(), p_latitude, p_longitude, p_accuracy, p_recorded_at, now())
  on conflict(log_id) do update set latitude = excluded.latitude, longitude = excluded.longitude,
    accuracy = excluded.accuracy, recorded_at = excluded.recorded_at, received_at = excluded.received_at
  where excluded.recorded_at > tracking_latest.recorded_at;
end $$;
revoke all on function public.record_tracking_point(uuid, uuid, double precision, double precision, double precision, timestamptz) from public, anon;
grant execute on function public.record_tracking_point(uuid, uuid, double precision, double precision, double precision, timestamptz) to authenticated;
commit;
