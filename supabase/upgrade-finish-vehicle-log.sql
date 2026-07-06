-- Jalankan sekali pada proyek yang sudah memiliki schema JNE Mobile KM.
create or replace function public.finish_vehicle_log(
  p_log_id uuid,
  p_km_akhir bigint,
  p_foto text,
  p_lat numeric default null,
  p_lng numeric default null
)
returns public.vehicle_logs
language plpgsql
security definer
set search_path = public
as $$
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
  where id = p_log_id
    and driver_id = auth.uid()
    and status <> 'Dikunci'
  returning * into result;

  if result.id is null then
    raise exception 'Perjalanan tidak ditemukan atau sudah dikunci';
  end if;

  update public.vehicles
  set km_terakhir = p_km_akhir, updated_at = now()
  where id = result.vehicle_id;

  return result;
end $$;

revoke all on function public.finish_vehicle_log(uuid, bigint, text, numeric, numeric) from public;
grant execute on function public.finish_vehicle_log(uuid, bigint, text, numeric, numeric) to authenticated;
