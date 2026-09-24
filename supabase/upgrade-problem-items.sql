create table if not exists public.problem_items (
  id uuid primary key default gen_random_uuid(),
  photo_url text not null,
  description text not null,
  received_at date not null,
  packaging_notes text not null,
  readable_name text,
  readable_address text,
  status text not null default 'DICARI' check (status in ('DICARI', 'DITEMUKAN', 'SELESAI')),
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now()
);
create index if not exists problem_items_status_idx on public.problem_items(status);
create index if not exists problem_items_received_at_idx on public.problem_items(received_at desc);
alter table public.problem_items enable row level security;
drop policy if exists "admin mengelola barang problem" on public.problem_items;
create policy "admin mengelola barang problem" on public.problem_items for all to authenticated using (public.is_admin()) with check (public.is_admin());
