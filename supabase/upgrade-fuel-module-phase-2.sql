-- Movetra BBM - Fase 2 (revisi client): pencatatan berbasis odometer dan 4 foto.
-- Jalankan setelah upgrade-fuel-module-phase-1.sql.

alter table public.fuel_transactions
  alter column total_liters drop not null,
  drop constraint if exists fuel_transactions_total_liters_check,
  add column if not exists previous_fuel_transaction_id uuid references public.fuel_transactions(id) on delete set null,
  add column if not exists previous_odometer bigint,
  add column if not exists estimated_liters numeric(12,2),
  add column if not exists standard_km_per_liter numeric(8,2) not null default 8,
  add column if not exists km_before_photo_url text,
  add column if not exists km_after_photo_url text,
  add column if not exists dispenser_photo_url text,
  add column if not exists latitude numeric(10,7),
  add column if not exists longitude numeric(10,7),
  add column if not exists geotag_captured_at timestamptz,
  add constraint fuel_transactions_estimated_liters_valid check (estimated_liters is null or estimated_liters >= 0),
  add constraint fuel_transactions_latitude_valid check (latitude is null or latitude between -90 and 90),
  add constraint fuel_transactions_longitude_valid check (longitude is null or longitude between -180 and 180);

insert into public.app_settings (key, value)
values ('fuel_standard_km_per_liter', '8'::jsonb)
on conflict (key) do nothing;

create or replace function public.submit_fuel_transaction(
  p_vehicle_id uuid, p_trip_ids uuid[], p_transaction_date date, p_transaction_time time,
  p_odometer_at_refuel bigint, p_fuel_type_id uuid, p_real_payment numeric,
  p_fuel_station_id uuid default null, p_fuel_station_name text default null,
  p_latitude numeric default null, p_longitude numeric default null,
  p_km_before_photo_url text default null, p_km_after_photo_url text default null,
  p_dispenser_photo_url text default null, p_receipt_photo_url text default null,
  p_notes text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_driver_id uuid := auth.uid();
  v_price numeric(14,2); v_estimated numeric(16,2); v_transaction_id uuid;
  v_trip_count integer; v_invalid_count integer; v_last_km bigint;
  v_previous_id uuid; v_previous_odometer bigint; v_distance bigint := 0;
  v_estimated_liters numeric(12,2) := 0; v_standard numeric(8,2) := 8;
  v_trip_ids uuid[] := coalesce(p_trip_ids, '{}'::uuid[]);
begin
  if v_driver_id is null then raise exception 'Sesi pengguna tidak ditemukan'; end if;
  if not exists (select 1 from public.users where id = v_driver_id and status) then raise exception 'Pengguna tidak aktif'; end if;
  if p_real_payment < 0 then raise exception 'Pembayaran tidak boleh negatif'; end if;
  if p_km_before_photo_url is null or p_km_after_photo_url is null
    or p_dispenser_photo_url is null or p_receipt_photo_url is null then
    raise exception 'Empat foto bukti pengisian wajib diunggah';
  end if;
  if p_latitude is not null and not p_latitude between -90 and 90 then raise exception 'Latitude tidak valid'; end if;
  if p_longitude is not null and not p_longitude between -180 and 180 then raise exception 'Longitude tidak valid'; end if;

  if coalesce(array_length(v_trip_ids, 1), 0) = 0 then
    select coalesce(array_agg(id), '{}'::uuid[]) into v_trip_ids
    from public.vehicle_logs where vehicle_id = p_vehicle_id and driver_id = v_driver_id
      and tanggal = p_transaction_date and km_awal <= p_odometer_at_refuel
      and (km_akhir is null or km_akhir >= p_odometer_at_refuel);
  end if;
  if coalesce(array_length(v_trip_ids, 1), 0) > 0 then
    select count(*), count(*) filter (where vehicle_id <> p_vehicle_id or driver_id <> v_driver_id)
      into v_trip_count, v_invalid_count from public.vehicle_logs where id = any(v_trip_ids);
    if v_trip_count <> array_length(v_trip_ids, 1) or v_invalid_count > 0 then
      raise exception 'Perjalanan terkait harus milik driver dan kendaraan yang sama';
    end if;
  end if;

  select km_terakhir into v_last_km from public.vehicles where id = p_vehicle_id and status;
  if v_last_km is null then raise exception 'Kendaraan tidak ditemukan atau tidak aktif'; end if;
  select id, odometer_at_refuel into v_previous_id, v_previous_odometer
  from public.fuel_transactions where vehicle_id = p_vehicle_id and status <> 'REJECTED'
    and (transaction_date, transaction_time) < (p_transaction_date, p_transaction_time)
  order by transaction_date desc, transaction_time desc limit 1;
  if v_previous_odometer is not null and p_odometer_at_refuel < v_previous_odometer then
    raise exception 'KM pengisian tidak boleh lebih kecil dari pengisian sebelumnya';
  end if;

  select coalesce((select (value #>> '{}')::numeric from public.app_settings where key = 'fuel_standard_km_per_liter'), 8)
    into v_standard;
  if v_standard <= 0 then v_standard := 8; end if;
  v_distance := case when v_previous_odometer is null then 0 else p_odometer_at_refuel - v_previous_odometer end;
  v_estimated_liters := round(v_distance / v_standard, 2);
  v_price := public.active_fuel_price(p_fuel_type_id, p_transaction_date);
  if v_price is null then raise exception 'Harga BBM aktif pada tanggal transaksi tidak ditemukan'; end if;
  v_estimated := round(v_price * v_estimated_liters, 2);

  insert into public.fuel_transactions (
    vehicle_id, driver_id, transaction_date, transaction_time, odometer_at_refuel,
    fuel_type_id, price_per_liter, total_liters, estimated_liters, standard_km_per_liter,
    estimated_amount, real_payment, payment_difference, total_distance, fuel_efficiency,
    cost_per_km, fuel_station_id, fuel_station_name, receipt_photo_url,
    odometer_photo_url, km_before_photo_url, km_after_photo_url, dispenser_photo_url,
    latitude, longitude, geotag_captured_at, filling_type, notes, status, created_by,
    previous_fuel_transaction_id, previous_odometer
  ) values (
    p_vehicle_id, v_driver_id, p_transaction_date, p_transaction_time, p_odometer_at_refuel,
    p_fuel_type_id, v_price, null, v_estimated_liters, v_standard,
    v_estimated, p_real_payment, round(v_estimated - p_real_payment, 2), v_distance,
    case when v_distance > 0 then v_standard end,
    case when v_distance > 0 then round(v_estimated / v_distance, 2) end,
    p_fuel_station_id, nullif(trim(p_fuel_station_name), ''), p_receipt_photo_url,
    p_km_after_photo_url, p_km_before_photo_url, p_km_after_photo_url, p_dispenser_photo_url,
    p_latitude, p_longitude, case when p_latitude is not null then now() end,
    'FULL', nullif(trim(p_notes), ''), 'SUBMITTED', v_driver_id,
    v_previous_id, v_previous_odometer
  ) returning id into v_transaction_id;

  if coalesce(array_length(v_trip_ids, 1), 0) > 0 then
    insert into public.fuel_transaction_trips (fuel_transaction_id, trip_id)
    select v_transaction_id, trip_id from unnest(v_trip_ids) trip_id;
  end if;
  insert into public.fuel_transaction_status_history (fuel_transaction_id, old_status, new_status, notes, changed_by)
  values (v_transaction_id, null, 'SUBMITTED', 'Dikirim oleh pengguna', v_driver_id);
  return v_transaction_id;
end $$;

revoke all on function public.submit_fuel_transaction(uuid, uuid[], date, time, bigint, uuid, numeric, uuid, text, numeric, numeric, text, text, text, text, text) from public;
grant execute on function public.submit_fuel_transaction(uuid, uuid[], date, time, bigint, uuid, numeric, uuid, text, numeric, numeric, text, text, text, text, text) to authenticated;
