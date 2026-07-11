-- Movetra BBM - Fase 3: validasi admin transaksional.
create or replace function public.review_fuel_transaction(
  p_transaction_id uuid, p_action text, p_notes text default null
) returns public.fuel_transactions language plpgsql security definer set search_path = public as $$
declare v_old public.fuel_transaction_status; v_new public.fuel_transaction_status; v_result public.fuel_transactions;
begin
  if not public.is_admin() then raise exception 'Hanya admin yang dapat memvalidasi transaksi BBM'; end if;
  if p_action not in ('VERIFY','REJECT','NEED_REVIEW') then raise exception 'Aksi validasi tidak dikenal'; end if;
  if p_action = 'REJECT' and nullif(trim(p_notes), '') is null then raise exception 'Alasan penolakan wajib diisi'; end if;
  select status into v_old from public.fuel_transactions where id = p_transaction_id for update;
  if v_old is null then raise exception 'Transaksi BBM tidak ditemukan'; end if;
  if v_old not in ('SUBMITTED','NEED_REVIEW') then raise exception 'Status transaksi tidak dapat divalidasi'; end if;
  v_new := case p_action when 'VERIFY' then 'VERIFIED'::public.fuel_transaction_status when 'REJECT' then 'REJECTED'::public.fuel_transaction_status else 'NEED_REVIEW'::public.fuel_transaction_status end;
  update public.fuel_transactions set status = v_new,
    verified_by = case when v_new = 'VERIFIED' then auth.uid() else null end,
    verified_at = case when v_new = 'VERIFIED' then now() else null end,
    rejection_reason = case when v_new = 'REJECTED' then trim(p_notes) else null end,
    notes = case when v_new = 'NEED_REVIEW' and nullif(trim(p_notes), '') is not null then concat_ws(E'\n', notes, 'Catatan admin: ' || trim(p_notes)) else notes end,
    updated_at = now() where id = p_transaction_id returning * into v_result;
  insert into public.fuel_transaction_status_history (fuel_transaction_id, old_status, new_status, notes, changed_by)
  values (p_transaction_id, v_old, v_new, nullif(trim(p_notes), ''), auth.uid());
  return v_result;
end $$;
revoke all on function public.review_fuel_transaction(uuid, text, text) from public;
grant execute on function public.review_fuel_transaction(uuid, text, text) to authenticated;
