-- Works when the original table migration has not yet been applied.
begin;
create table if not exists public.problem_items (
  id uuid primary key default gen_random_uuid(),
  photo_url text not null,
  description text not null,
  received_at date not null,
  packaging_notes text not null,
  readable_name text,
  readable_address text,
  status text not null default 'DICARI' check (status in ('DICARI', 'DITEMUKAN', 'SELESAI')),
  created_by uuid not null default auth.uid() references public.users(id),
  created_at timestamptz not null default now()
);
alter table public.problem_items
  alter column created_by set default auth.uid(),
  add column if not exists category text not null default 'Lainnya',
  add column if not exists problem_notes text;
create index if not exists problem_items_status_idx on public.problem_items(status);
create index if not exists problem_items_received_at_idx on public.problem_items(received_at desc);
alter table public.problem_items enable row level security;
create or replace function public.can_manage_problem_items() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.users where id = auth.uid()
    and status = true and role::text in ('ADMIN', 'ADMIN_PROBLEM'))
$$;
revoke all on function public.can_manage_problem_items() from public;
grant execute on function public.can_manage_problem_items() to authenticated;
drop policy if exists "admin mengelola barang problem" on public.problem_items;
create policy "admin mengelola barang problem" on public.problem_items
  for all to authenticated using (public.can_manage_problem_items())
  with check (public.can_manage_problem_items());
grant select, insert, update, delete on public.problem_items to authenticated;
notify pgrst, 'reload schema';
commit;
