drop policy if exists "Admins can view all rooms" on public.rooms;
create policy "Admins can view all rooms"
on public.rooms for select
using (has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can update all rooms" on public.rooms;
create policy "Admins can update all rooms"
on public.rooms for update
using (has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can delete all rooms" on public.rooms;
create policy "Admins can delete all rooms"
on public.rooms for delete
using (has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles"
on public.profiles for select
using (has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can update all profiles" on public.profiles;
create policy "Admins can update all profiles"
on public.profiles for update
using (has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can view all bookings" on public.bookings;
create policy "Admins can view all bookings"
on public.bookings for select
using (has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can update all bookings" on public.bookings;
create policy "Admins can update all bookings"
on public.bookings for update
using (has_role(auth.uid(), 'admin'));
