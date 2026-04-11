create extension if not exists "uuid-ossp";

create table if not exists public.user_roles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null,
  role text not null
);

alter table public.user_roles enable row level security;

drop policy if exists "Users can view own roles" on public.user_roles;
create policy "Users can view own roles"
on public.user_roles for select
using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role text)
returns boolean
language sql
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role::text = _role
  );
$$;

create table if not exists public.profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null,
  full_name text,
  phone text,
  avatar_url text,
  referral_code text,
  referred_by uuid,
  wallet_balance numeric default 0,
  host_badge text,
  host_score numeric,
  is_blocked boolean default false,
  kyc_status text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

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

create table if not exists public.rooms (
  id uuid primary key default uuid_generate_v4(),
  host_id uuid not null,
  title text not null,
  description text,
  location text not null,
  city text not null,
  price numeric not null,
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

alter table public.rooms enable row level security;

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

create table if not exists public.bookings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null,
  room_id uuid not null references public.rooms(id) on delete cascade,
  check_in date not null,
  check_out date not null,
  guests int default 1,
  status text default 'pending',
  room_price numeric,
  platform_fee numeric,
  service_fee numeric,
  total_amount numeric not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.bookings enable row level security;

drop policy if exists "Users can view own bookings" on public.bookings;
create policy "Users can view own bookings"
on public.bookings for select
using (auth.uid() = user_id);

drop policy if exists "Hosts can view bookings for their rooms" on public.bookings;
create policy "Hosts can view bookings for their rooms"
on public.bookings for select
using (
  exists (
    select 1 from public.rooms
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
