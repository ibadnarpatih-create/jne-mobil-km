-- Tracking safety: discard out-of-order points and remove the last point when a trip ends.
begin;

alter table public.tracking_latest
  add constraint tracking_latest_latitude_valid check (latitude between -90 and 90),
  add constraint tracking_latest_longitude_valid check (longitude between -180 and 180),
  add constraint tracking_latest_accuracy_valid check (accuracy >= 0 and accuracy < 100000);

create or replace function public.record_tracking_point(
  p_id uuid, p_log_id uuid, p_latitude double precision,
  p_longitude double precision, p_accuracy double precision, p_recorded_at timestamptz
) returns void language plpgsql security definer set search_path = public as $$
declare
  trip public.vehicle_logs;
  latest_recorded_at timestamptz;
begin
  select * into trip from public.vehicle_logs where id = p_log_id for update;
  if trip.id is null or trip.driver_id <> auth.uid() or auth.uid() is null
     or trip.jam_akhir is not null or trip.status <> 'Belum Selesai'
     or not exists(select 1 from public.users where id = auth.uid() and status and role = 'DRIVER') then
    raise exception 'Perjalanan tidak aktif atau tidak diizinkan' using errcode = '42501';
  end if;
  if p_latitude is null or p_latitude <> p_latitude or p_latitude not between -90 and 90
     or p_longitude is null or p_longitude <> p_longitude or p_longitude not between -180 and 180
     or p_accuracy is null or p_accuracy <> p_accuracy or p_accuracy < 0 or p_accuracy >= 100000 then
    raise exception 'Koordinat atau akurasi lokasi tidak valid' using errcode = '22023';
  end if;
  if p_recorded_at is null or p_recorded_at > now() + interval '1 minute'
     or p_recorded_at < greatest(trip.created_at - interval '1 minute', now() - interval '24 hours') then
    raise exception 'Waktu lokasi tidak valid' using errcode = '22023';
  end if;

  select recorded_at into latest_recorded_at
  from public.tracking_latest where log_id = p_log_id for update;
  -- Retry dari jaringan atau dua tab tidak boleh menambah titik lama/duplikat.
  if latest_recorded_at is not null and p_recorded_at <= latest_recorded_at then return; end if;

  insert into public.tracking_points(id, log_id, driver_id, latitude, longitude, accuracy, recorded_at)
  values(p_id, p_log_id, auth.uid(), p_latitude, p_longitude, p_accuracy, p_recorded_at)
  on conflict(id) do nothing;
  if not found then return; end if;
  insert into public.tracking_latest(log_id, driver_id, latitude, longitude, accuracy, recorded_at, received_at)
  values(p_log_id, auth.uid(), p_latitude, p_longitude, p_accuracy, p_recorded_at, now());
end $$;

create or replace function public.finish_vehicle_log(
  p_log_id uuid, p_km_akhir bigint, p_foto text,
  p_lat numeric default null, p_lng numeric default null
) returns public.vehicle_logs language plpgsql security definer set search_path = public as $$
declare result public.vehicle_logs;
begin
  update public.vehicle_logs set
    jam_akhir = (now() at time zone 'Asia/Jakarta')::time,
    km_akhir = p_km_akhir, foto_km_akhir = p_foto,
    latitude_akhir = p_lat, longitude_akhir = p_lng,
    status = case when p_km_akhir - km_awal > 300 then 'Perlu Diperiksa'::public.log_status else 'Selesai'::public.log_status end,
    updated_at = now()
  where id = p_log_id and driver_id = auth.uid() and status <> 'Dikunci'
  returning * into result;
  if result.id is null then raise exception 'Perjalanan tidak ditemukan atau sudah dikunci'; end if;
  update public.vehicles set km_terakhir = p_km_akhir, updated_at = now() where id = result.vehicle_id;
  -- Titik terakhir dipertahankan agar armada selesai tetap terlihat di peta admin.
  return result;
end $$;

revoke all on function public.record_tracking_point(uuid, uuid, double precision, double precision, double precision, timestamptz) from public, anon;
grant execute on function public.record_tracking_point(uuid, uuid, double precision, double precision, double precision, timestamptz) to authenticated;
revoke all on function public.finish_vehicle_log(uuid, bigint, text, numeric, numeric) from public;
grant execute on function public.finish_vehicle_log(uuid, bigint, text, numeric, numeric) to authenticated;
commit;
