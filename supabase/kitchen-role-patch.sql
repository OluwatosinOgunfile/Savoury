-- Run once in Supabase SQL Editor.

do $$
begin
  alter type public.user_role add value if not exists 'kitchen';
exception when duplicate_object then null;
end $$;

create table if not exists public.kitchen_staff (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  full_name text not null,
  email text unique not null,
  phone text,
  staff_id text unique not null default ('SV-KIT-' || upper(substr(gen_random_uuid()::text, 1, 6))),
  status text not null default 'active' check (status in ('active', 'suspended')),
  must_change_password boolean not null default true,
  last_login_at timestamptz,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pos_orders
add column if not exists fulfillment_status text not null default 'received'
check (fulfillment_status in ('received', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'completed', 'cancelled'));

alter table public.pos_orders
add column if not exists delivery_address text;

alter table public.kitchen_staff enable row level security;

create or replace function public.is_active_kitchen_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users users
    join public.kitchen_staff staff on staff.auth_user_id = users.id
    where users.id = auth.uid()
      and users.role::text = 'kitchen'
      and staff.status = 'active'
  );
$$;

drop policy if exists "admins manage kitchen staff" on public.kitchen_staff;
drop policy if exists "kitchen staff read own profile" on public.kitchen_staff;
drop policy if exists "kitchen staff read app orders" on public.orders;
drop policy if exists "kitchen staff read app order items" on public.order_items;
drop policy if exists "kitchen staff read pos orders" on public.pos_orders;
drop policy if exists "kitchen staff read pos order items" on public.pos_order_items;

create policy "admins manage kitchen staff" on public.kitchen_staff
for all using (public.is_admin()) with check (public.is_admin());

create policy "kitchen staff read own profile" on public.kitchen_staff
for select using (auth.uid() = auth_user_id);

create policy "kitchen staff read app orders" on public.orders
for select using (public.is_active_kitchen_staff());

create policy "kitchen staff read app order items" on public.order_items
for select using (public.is_active_kitchen_staff());

create policy "kitchen staff read pos orders" on public.pos_orders
for select using (public.is_active_kitchen_staff());

create policy "kitchen staff read pos order items" on public.pos_order_items
for select using (public.is_active_kitchen_staff());

create or replace function public.update_kitchen_order_status(
  order_source text,
  target_order_id uuid,
  next_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_active_kitchen_staff() then
    raise exception 'Active kitchen staff access is required';
  end if;

  if next_status not in ('preparing', 'ready') then
    raise exception 'Kitchen status must be preparing or ready';
  end if;

  if order_source = 'app' then
    update public.orders
    set status = case when next_status = 'preparing' then 'preparing'::public.order_status else 'ready'::public.order_status end
    where id = target_order_id
      and status in ('received', 'preparing');
  elsif order_source = 'pos' then
    update public.pos_orders
    set fulfillment_status = next_status
    where id = target_order_id
      and fulfillment_status in ('received', 'preparing');
  else
    raise exception 'Unknown kitchen order source';
  end if;
end;
$$;

grant execute on function public.update_kitchen_order_status(text, uuid, text) to authenticated;
