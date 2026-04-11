create or replace function public.handle_booking_completed_commissions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'completed'::public.booking_status
     and (old.status is distinct from new.status) then
    perform public.process_referral_commission(new.id);
    perform public.process_host_earning(new.id);
  end if;

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'on_booking_completed_process_commissions'
  ) then
    create trigger on_booking_completed_process_commissions
    after update of status on public.bookings
    for each row
    execute function public.handle_booking_completed_commissions();
  end if;
end $$;

