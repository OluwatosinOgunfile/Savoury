create table if not exists public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  display_name text,
  email text,
  status text not null default 'online' check (status in ('online', 'away', 'offline')),
  current_page text,
  cart_items integer not null default 0 check (cart_items >= 0),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  display_name text,
  action text not null,
  page text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.staff_members (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  email text unique not null,
  phone text,
  role text not null default 'staff' check (role in ('admin', 'manager', 'kitchen', 'delivery', 'staff', 'cashier')),
  status text not null default 'invited' check (status in ('invited', 'active', 'inactive')),
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.staff_members add column if not exists auth_user_id uuid references auth.users(id) on delete set null;
alter table public.staff_members drop constraint if exists staff_members_role_check;
alter table public.staff_members add constraint staff_members_role_check check (role in ('admin', 'manager', 'kitchen', 'delivery', 'staff', 'cashier'));

alter table public.user_sessions enable row level security;
alter table public.activity_events enable row level security;
alter table public.staff_members enable row level security;

drop policy if exists "admins manage profiles" on public.profiles;
drop policy if exists "admins manage addresses" on public.addresses;
drop policy if exists "admins manage reviews" on public.reviews;
drop policy if exists "admins manage notifications" on public.notifications;
drop policy if exists "admins manage user sessions" on public.user_sessions;
drop policy if exists "admins manage activity events" on public.activity_events;
drop policy if exists "admins manage staff members" on public.staff_members;
drop policy if exists "customers manage own session" on public.user_sessions;
drop policy if exists "customers create own activity events" on public.activity_events;

create policy "admins manage profiles" on public.profiles for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage addresses" on public.addresses for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage reviews" on public.reviews for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage notifications" on public.notifications for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage user sessions" on public.user_sessions for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage activity events" on public.activity_events for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage staff members" on public.staff_members for all using (public.is_admin()) with check (public.is_admin());
create policy "customers manage own session" on public.user_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "customers create own activity events" on public.activity_events for insert with check (auth.uid() = user_id);
