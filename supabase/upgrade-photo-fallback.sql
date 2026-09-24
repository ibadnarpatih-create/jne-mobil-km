-- Thumbnail cadangan Supabase. Foto asli ImageKit tidak pernah dihapus oleh fitur ini.
alter table public.fuel_transactions
  add column if not exists km_before_fallback_url text,
  add column if not exists km_after_fallback_url text,
  add column if not exists dispenser_fallback_url text,
  add column if not exists receipt_fallback_url text;

alter table public.vehicle_logs
  add column if not exists foto_km_awal_fallback text,
  add column if not exists foto_km_akhir_fallback text;

alter table public.problem_items
  add column if not exists fallback_photo_url text;
