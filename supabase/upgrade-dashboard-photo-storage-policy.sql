-- Jalankan sekali jika upload foto dashboard pernah gagal dengan pesan:
-- "new row violates row-level security policy".
--
-- Penyebab umum: driver mengambil ulang foto pada nama file yang sama,
-- Supabase Storage menganggapnya sebagai update object.
-- Policy ini mengizinkan driver mengganti/menghapus foto miliknya sendiri.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dashboard-photos', 'dashboard-photos', false, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
set file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'driver update foto sendiri'
  ) then
    create policy "driver update foto sendiri"
    on storage.objects
    for update
    to authenticated
    using (bucket_id = 'dashboard-photos' and (storage.foldername(name))[1] = auth.uid()::text)
    with check (bucket_id = 'dashboard-photos' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'driver hapus foto sendiri'
  ) then
    create policy "driver hapus foto sendiri"
    on storage.objects
    for delete
    to authenticated
    using (bucket_id = 'dashboard-photos' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;
end $$;
