-- Selisih BBM didefinisikan sebagai estimasi nominal dikurangi real payment.
-- Nilai positif berarti pembayaran aktual lebih rendah dari estimasi.

create or replace function public.set_fuel_payment_difference()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.payment_difference := round(new.estimated_amount - new.real_payment, 2);
  return new;
end;
$$;

drop trigger if exists set_fuel_payment_difference on public.fuel_transactions;
create trigger set_fuel_payment_difference
before insert or update of estimated_amount, real_payment
on public.fuel_transactions
for each row execute function public.set_fuel_payment_difference();

-- Koreksi seluruh transaksi lama yang tersimpan dengan rumus terbalik.
update public.fuel_transactions
set payment_difference = round(estimated_amount - real_payment, 2)
where payment_difference is distinct from round(estimated_amount - real_payment, 2);
