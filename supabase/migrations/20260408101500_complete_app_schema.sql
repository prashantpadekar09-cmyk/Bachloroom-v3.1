create extension if not exists "uuid-ossp";

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'app_role'
  ) then
    create type public.app_role as enum ('guest', 'host', 'admin');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'booking_status'
  ) then
    create type public.booking_status as enum ('pending', 'confirmed', 'completed', 'cancelled');
  end if;
end $$;

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.user_roles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null,
  role public.app_role not null
);

create table if not exists public.profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null,
  full_name text,
  phone text,
  avatar_url text,
  referral_code text,
  referred_by uuid,
  wallet_balance numeric(12,2) default 0,
  host_badge text,
  host_score numeric,
  is_blocked boolean default false,
  kyc_status text default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.rooms (
  id uuid primary key default uuid_generate_v4(),
  host_id uuid not null,
  title text not null,
  description text,
  location text not null,
  city text not null,
  price numeric(12,2) not null,
  amenities text[],
  image_url text,
  is_approved boolean default false,
  is_premium boolean default false,
  is_available boolean default true,
  owner_email text not null default '',
  owner_mobile text not null default '',
  rating numeric,
  reviews_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.bookings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null,
  room_id uuid not null references public.rooms(id) on delete cascade,
  check_in date not null,
  check_out date not null,
  guests integer default 1,
  status public.booking_status not null default 'pending',
  room_price numeric(12,2),
  platform_fee numeric(12,2),
  service_fee numeric(12,2),
  total_amount numeric(12,2) not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.user_roles enable row level security;
alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.bookings enable row level security;
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_roles'
      and column_name = 'role'
      and udt_name <> 'app_role'
  ) then
    alter table public.user_roles
      alter column role type public.app_role
      using (
        case lower(role::text)
          when 'admin' then 'admin'::public.app_role
          when 'host' then 'host'::public.app_role
          else 'guest'::public.app_role
        end
      );
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'bookings'
      and column_name = 'status'
      and udt_name <> 'booking_status'
  ) then
    alter table public.bookings
      alter column status type public.booking_status
      using (
        case lower(status::text)
          when 'confirmed' then 'confirmed'::public.booking_status
          when 'completed' then 'completed'::public.booking_status
          when 'cancelled' then 'cancelled'::public.booking_status
          else 'pending'::public.booking_status
        end
      );
  end if;
end $$;

alter table public.user_roles
  alter column role set not null;

alter table public.bookings
  alter column status set default 'pending'::public.booking_status;

alter table public.bookings
  alter column status set not null;

alter table public.profiles
  alter column wallet_balance set default 0;

alter table public.profiles
  alter column kyc_status set default 'pending';

create unique index if not exists profiles_user_id_key on public.profiles(user_id);
create unique index if not exists profiles_referral_code_key on public.profiles(referral_code) where referral_code is not null;
create unique index if not exists user_roles_user_id_role_key on public.user_roles(user_id, role);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_user_id_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_referred_by_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_referred_by_fkey
      foreign key (referred_by) references public.profiles(id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'user_roles_user_id_fkey'
  ) then
    alter table public.user_roles
      add constraint user_roles_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'rooms_host_id_fkey'
  ) then
    alter table public.rooms
      add constraint rooms_host_id_fkey
      foreign key (host_id) references auth.users(id) on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'bookings_user_id_fkey'
  ) then
    alter table public.bookings
      add constraint bookings_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end $$;

create table if not exists public.transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null,
  amount numeric(12,2) not null,
  type text not null,
  source_booking_id uuid,
  description text,
  created_at timestamptz default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'transactions_source_booking_id_fkey'
  ) then
    alter table public.transactions
      add constraint transactions_source_booking_id_fkey
      foreign key (source_booking_id) references public.bookings(id) on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'transactions_user_id_fkey'
  ) then
    alter table public.transactions
      add constraint transactions_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'transactions_type_check'
  ) then
    alter table public.transactions
      add constraint transactions_type_check
      check (type in ('booking_payment', 'referral_earning', 'withdrawal', 'host_earning'));
  end if;
end $$;

create table if not exists public.payment_proofs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  amount numeric(12,2) not null,
  screenshot_url text not null,
  upi_reference text,
  status text not null default 'pending',
  admin_note text,
  reviewed_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'payment_proofs_user_id_fkey'
  ) then
    alter table public.payment_proofs
      add constraint payment_proofs_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'payment_proofs_reviewed_by_fkey'
  ) then
    alter table public.payment_proofs
      add constraint payment_proofs_reviewed_by_fkey
      foreign key (reviewed_by) references auth.users(id) on delete set null;
  end if;
end $$;

create table if not exists public.reviews (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null,
  host_id uuid not null,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  rating integer not null,
  comment text,
  tags text[] default '{}',
  created_at timestamptz default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'reviews_user_id_fkey'
  ) then
    alter table public.reviews
      add constraint reviews_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'reviews_host_id_fkey'
  ) then
    alter table public.reviews
      add constraint reviews_host_id_fkey
      foreign key (host_id) references auth.users(id) on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'reviews_rating_check'
  ) then
    alter table public.reviews
      add constraint reviews_rating_check
      check (rating between 1 and 5);
  end if;
end $$;

create table if not exists public.reports (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null,
  host_id uuid not null,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  issue_type text not null,
  description text,
  proof_url text,
  status text not null default 'pending',
  admin_note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'reports_user_id_fkey'
  ) then
    alter table public.reports
      add constraint reports_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'reports_host_id_fkey'
  ) then
    alter table public.reports
      add constraint reports_host_id_fkey
      foreign key (host_id) references auth.users(id) on delete cascade;
  end if;
end $$;

create table if not exists public.withdrawal_requests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null,
  amount numeric(12,2) not null,
  upi_id text,
  bank_details text,
  status text not null default 'pending',
  admin_note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'withdrawal_requests_user_id_fkey'
  ) then
    alter table public.withdrawal_requests
      add constraint withdrawal_requests_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end $$;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

create or replace function public.has_role(_user_id uuid, _role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id and role::text = lower(_role)
  );
$$;

drop policy if exists "Users can view own roles" on public.user_roles;
create policy "Users can view own roles"
on public.user_roles for select
using (auth.uid() = user_id);

drop policy if exists "Profiles viewable by everyone" on public.profiles;
create policy "Profiles viewable by everyone"
on public.profiles for select
using (true);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update
using (auth.uid() = user_id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles for insert
with check (auth.uid() = user_id);

drop policy if exists "Rooms viewable by everyone" on public.rooms;
create policy "Rooms viewable by everyone"
on public.rooms for select
using (true);

drop policy if exists "Hosts can insert rooms" on public.rooms;
create policy "Hosts can insert rooms"
on public.rooms for insert
with check (auth.uid() = host_id);

drop policy if exists "Hosts can update own rooms" on public.rooms;
create policy "Hosts can update own rooms"
on public.rooms for update
using (auth.uid() = host_id);

drop policy if exists "Hosts can delete own rooms" on public.rooms;
create policy "Hosts can delete own rooms"
on public.rooms for delete
using (auth.uid() = host_id);

drop policy if exists "Users can view own bookings" on public.bookings;
create policy "Users can view own bookings"
on public.bookings for select
using (auth.uid() = user_id);

drop policy if exists "Hosts can view bookings for their rooms" on public.bookings;
create policy "Hosts can view bookings for their rooms"
on public.bookings for select
using (
  exists (
    select 1
    from public.rooms
    where rooms.id = room_id and rooms.host_id = auth.uid()
  )
);

drop policy if exists "Users can create bookings" on public.bookings;
create policy "Users can create bookings"
on public.bookings for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own bookings" on public.bookings;
create policy "Users can update own bookings"
on public.bookings for update
using (auth.uid() = user_id);

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
alter table public.transactions enable row level security;
alter table public.payment_proofs enable row level security;
alter table public.reviews enable row level security;
alter table public.reports enable row level security;
alter table public.withdrawal_requests enable row level security;

drop policy if exists "Users can view own transactions" on public.transactions;
create policy "Users can view own transactions"
on public.transactions for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own transactions" on public.transactions;
create policy "Users can insert own transactions"
on public.transactions for insert
with check (auth.uid() = user_id);

drop policy if exists "Admins can view all transactions" on public.transactions;
create policy "Admins can view all transactions"
on public.transactions for select
using (has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can insert transactions" on public.transactions;
create policy "Admins can insert transactions"
on public.transactions for insert
with check (has_role(auth.uid(), 'admin'));

drop policy if exists "Users can view own payment proofs" on public.payment_proofs;
create policy "Users can view own payment proofs"
on public.payment_proofs for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own payment proofs" on public.payment_proofs;
create policy "Users can insert own payment proofs"
on public.payment_proofs for insert
with check (auth.uid() = user_id);

drop policy if exists "Admins can view all payment proofs" on public.payment_proofs;
create policy "Admins can view all payment proofs"
on public.payment_proofs for select
using (has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can update payment proofs" on public.payment_proofs;
create policy "Admins can update payment proofs"
on public.payment_proofs for update
using (has_role(auth.uid(), 'admin'));

drop policy if exists "Anyone can view reviews" on public.reviews;
create policy "Anyone can view reviews"
on public.reviews for select
using (true);

drop policy if exists "Users can insert own reviews" on public.reviews;
create policy "Users can insert own reviews"
on public.reviews for insert
with check (auth.uid() = user_id);

drop policy if exists "Admins can delete reviews" on public.reviews;
create policy "Admins can delete reviews"
on public.reviews for delete
using (has_role(auth.uid(), 'admin'));

drop policy if exists "Users can insert own reports" on public.reports;
create policy "Users can insert own reports"
on public.reports for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can view own reports" on public.reports;
create policy "Users can view own reports"
on public.reports for select
using (auth.uid() = user_id);

drop policy if exists "Admins can view all reports" on public.reports;
create policy "Admins can view all reports"
on public.reports for select
using (has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can update reports" on public.reports;
create policy "Admins can update reports"
on public.reports for update
using (has_role(auth.uid(), 'admin'));

drop policy if exists "Users can insert own withdrawal requests" on public.withdrawal_requests;
create policy "Users can insert own withdrawal requests"
on public.withdrawal_requests for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can view own withdrawal requests" on public.withdrawal_requests;
create policy "Users can view own withdrawal requests"
on public.withdrawal_requests for select
using (auth.uid() = user_id);

drop policy if exists "Admins can view all withdrawal requests" on public.withdrawal_requests;
create policy "Admins can view all withdrawal requests"
on public.withdrawal_requests for select
using (has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can update withdrawal requests" on public.withdrawal_requests;
create policy "Admins can update withdrawal requests"
on public.withdrawal_requests for update
using (has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can view all roles" on public.user_roles;
create policy "Admins can view all roles"
on public.user_roles for select
using (has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can insert roles" on public.user_roles;
create policy "Admins can insert roles"
on public.user_roles for insert
with check (has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can delete profiles" on public.profiles;
create policy "Admins can delete profiles"
on public.profiles for delete
using (has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can delete bookings" on public.bookings;
create policy "Admins can delete bookings"
on public.bookings for delete
using (has_role(auth.uid(), 'admin'));

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

create or replace function public.has_role(_user_id uuid, _role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id and role::text = lower(_role)
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, full_name, referral_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    'APNA-' || upper(substr(md5(new.id::text), 1, 8))
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create or replace function public.assign_default_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_roles (user_id, role)
  values (new.id, 'guest'::public.app_role)
  on conflict (user_id, role) do nothing;
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'on_auth_user_created'
  ) then
    create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'on_auth_user_created_role'
  ) then
    create trigger on_auth_user_created_role
    after insert on auth.users
    for each row execute function public.assign_default_role();
  end if;
end $$;

create or replace function public.process_referral_commission(booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking record;
  v_booker_profile record;
  v_level1_profile record;
  v_level2_profile record;
  v_level3_profile record;
  v_admin_user_id uuid;
  v_l1 numeric(12,2);
  v_l2 numeric(12,2);
  v_l3 numeric(12,2);
  v_admin_share numeric(12,2) := 0;
  v_has_level1 boolean := false;
  v_has_level2 boolean := false;
begin
  select *
  into v_booking
  from public.bookings
  where id = booking_id
    and status = 'completed'::public.booking_status;

  if not found then
    return;
  end if;

  if exists (
    select 1
    from public.transactions
    where source_booking_id = booking_id
      and type = 'referral_earning'
  ) then
    return;
  end if;

  v_l1 := round(coalesce(v_booking.total_amount, 0) * 0.05, 2);
  v_l2 := round(coalesce(v_booking.total_amount, 0) * 0.02, 2);
  v_l3 := round(coalesce(v_booking.total_amount, 0) * 0.01, 2);

  select user_id
  into v_admin_user_id
  from public.user_roles
  where role = 'admin'::public.app_role
  limit 1;

  select *
  into v_booker_profile
  from public.profiles
  where user_id = v_booking.user_id;

  if not found or v_booker_profile.referred_by is null then
    if v_admin_user_id is not null then
      v_admin_share := v_l1 + v_l2 + v_l3;
    end if;
  else
    select * into v_level1_profile from public.profiles where id = v_booker_profile.referred_by;
    if found then
      v_has_level1 := true;
      update public.profiles
      set wallet_balance = coalesce(wallet_balance, 0) + v_l1
      where id = v_level1_profile.id;

      insert into public.transactions (user_id, amount, type, source_booking_id, description)
      values (v_level1_profile.user_id, v_l1, 'referral_earning', booking_id, 'Level 1 referral (5%)');
    else
      v_admin_share := v_admin_share + v_l1;
    end if;

    if v_has_level1 and v_level1_profile.referred_by is not null then
      select * into v_level2_profile from public.profiles where id = v_level1_profile.referred_by;
      if found then
        v_has_level2 := true;
        update public.profiles
        set wallet_balance = coalesce(wallet_balance, 0) + v_l2
        where id = v_level2_profile.id;

        insert into public.transactions (user_id, amount, type, source_booking_id, description)
        values (v_level2_profile.user_id, v_l2, 'referral_earning', booking_id, 'Level 2 referral (2%)');
      else
        v_admin_share := v_admin_share + v_l2;
      end if;
    else
      v_admin_share := v_admin_share + v_l2;
    end if;

    if v_has_level2 and v_level2_profile.referred_by is not null then
      select * into v_level3_profile from public.profiles where id = v_level2_profile.referred_by;
      if found then
        update public.profiles
        set wallet_balance = coalesce(wallet_balance, 0) + v_l3
        where id = v_level3_profile.id;

        insert into public.transactions (user_id, amount, type, source_booking_id, description)
        values (v_level3_profile.user_id, v_l3, 'referral_earning', booking_id, 'Level 3 referral (1%)');
      else
        v_admin_share := v_admin_share + v_l3;
      end if;
    else
      v_admin_share := v_admin_share + v_l3;
    end if;
  end if;

  if v_admin_share > 0 and v_admin_user_id is not null then
    update public.profiles
    set wallet_balance = coalesce(wallet_balance, 0) + v_admin_share
    where user_id = v_admin_user_id;

    insert into public.transactions (user_id, amount, type, source_booking_id, description)
    values (v_admin_user_id, v_admin_share, 'referral_earning', booking_id, 'Unclaimed referral commission');
  end if;
end;
$$;

create or replace function public.process_host_earning(booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking record;
  v_room record;
  v_host_share numeric(12,2);
begin
  select *
  into v_booking
  from public.bookings
  where id = booking_id
    and status = 'completed'::public.booking_status;

  if not found then
    return;
  end if;

  if exists (
    select 1
    from public.transactions
    where source_booking_id = booking_id
      and type = 'host_earning'
  ) then
    return;
  end if;

  select id, host_id, title
  into v_room
  from public.rooms
  where id = v_booking.room_id;

  if not found or v_room.host_id is null then
    return;
  end if;

  v_host_share := round(coalesce(v_booking.platform_fee, coalesce(v_booking.total_amount, 0) * 0.18) * 0.25, 2);
  if v_host_share <= 0 then
    return;
  end if;

  update public.profiles
  set wallet_balance = coalesce(wallet_balance, 0) + v_host_share
  where user_id = v_room.host_id;

  insert into public.transactions (user_id, amount, type, source_booking_id, description)
  values (
    v_room.host_id,
    v_host_share,
    'host_earning',
    booking_id,
    coalesce(v_room.title, 'Room') || ' booking commission'
  );
end;
$$;

grant execute on function public.process_referral_commission(uuid) to authenticated, service_role;
grant execute on function public.process_host_earning(uuid) to authenticated, service_role;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'update_profiles_updated_at'
  ) then
    create trigger update_profiles_updated_at
    before update on public.profiles
    for each row execute function public.update_updated_at_column();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'update_rooms_updated_at'
  ) then
    create trigger update_rooms_updated_at
    before update on public.rooms
    for each row execute function public.update_updated_at_column();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'update_bookings_updated_at'
  ) then
    create trigger update_bookings_updated_at
    before update on public.bookings
    for each row execute function public.update_updated_at_column();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'update_payment_proofs_updated_at'
  ) then
    create trigger update_payment_proofs_updated_at
    before update on public.payment_proofs
    for each row execute function public.update_updated_at_column();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'update_reports_updated_at'
  ) then
    create trigger update_reports_updated_at
    before update on public.reports
    for each row execute function public.update_updated_at_column();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'update_withdrawal_requests_updated_at'
  ) then
    create trigger update_withdrawal_requests_updated_at
    before update on public.withdrawal_requests
    for each row execute function public.update_updated_at_column();
  end if;
end $$;

create index if not exists idx_profiles_referred_by on public.profiles(referred_by);
create index if not exists idx_profiles_kyc_status on public.profiles(kyc_status);
create index if not exists idx_rooms_host_id on public.rooms(host_id);
create index if not exists idx_rooms_city_approval on public.rooms(city, is_approved, is_available);
create index if not exists idx_bookings_user_id on public.bookings(user_id);
create index if not exists idx_bookings_room_id on public.bookings(room_id);
create index if not exists idx_bookings_status on public.bookings(status);
create index if not exists idx_transactions_user_id_created_at on public.transactions(user_id, created_at desc);
create index if not exists idx_transactions_source_booking on public.transactions(source_booking_id);
create index if not exists idx_reviews_host_id_created_at on public.reviews(host_id, created_at desc);
create index if not exists idx_reports_status_created_at on public.reports(status, created_at desc);
create index if not exists idx_payment_proofs_status_created_at on public.payment_proofs(status, created_at desc);
create index if not exists idx_withdrawals_user_id_created_at on public.withdrawal_requests(user_id, created_at desc);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'payment_proofs'
    ) then
      execute 'alter publication supabase_realtime add table public.payment_proofs';
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'reviews'
    ) then
      execute 'alter publication supabase_realtime add table public.reviews';
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'reports'
    ) then
      execute 'alter publication supabase_realtime add table public.reports';
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'withdrawal_requests'
    ) then
      execute 'alter publication supabase_realtime add table public.withdrawal_requests';
    end if;
  end if;
end $$;