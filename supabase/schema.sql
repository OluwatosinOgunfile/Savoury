create type public.user_role as enum ('customer', 'admin');
create type public.order_status as enum ('received', 'preparing', 'cooking', 'ready', 'out_for_delivery', 'delivered', 'rejected');
create type public.payment_method as enum ('cash', 'card', 'transfer', 'paystack', 'flutterwave', 'stripe');

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  role public.user_role not null default 'customer',
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references public.users(id) on delete cascade,
  full_name text not null,
  phone text,
  avatar_url text,
  loyalty_points integer not null default 0,
  referral_code text unique,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  parent_id uuid references public.categories(id) on delete set null,
  icon text,
  description text,
  created_at timestamptz not null default now()
);

create table public.foods (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text unique not null,
  description text not null,
  price numeric(12,2) not null check (price >= 0),
  image_url text not null,
  ingredients text[] not null default '{}',
  calories integer not null default 0,
  preparation_time integer not null default 0,
  rating numeric(2,1) not null default 0,
  popularity integer not null default 0,
  is_available boolean not null default true,
  is_special boolean not null default false,
  is_recommended boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  label text not null,
  line1 text not null,
  city text not null,
  latitude numeric,
  longitude numeric,
  distance_km numeric,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  address_id uuid references public.addresses(id) on delete set null,
  status public.order_status not null default 'received',
  delivery_mode text not null check (delivery_mode in ('delivery', 'pickup', 'dining')),
  subtotal numeric(12,2) not null,
  delivery_fee numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  total numeric(12,2) not null,
  customer_name text,
  customer_phone text,
  delivery_address text,
  payment_method public.payment_method,
  special_instructions text,
  estimated_delivery_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade not null,
  food_id uuid references public.foods(id) on delete restrict not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade not null,
  method public.payment_method not null,
  provider_reference text,
  amount numeric(12,2) not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  food_id uuid references public.foods(id) on delete cascade not null,
  rating integer not null check (rating between 1 and 5),
  comment text not null,
  image_url text,
  helpful_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.favorites (
  user_id uuid references public.users(id) on delete cascade not null,
  food_id uuid references public.foods(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  primary key (user_id, food_id)
);

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  value numeric(12,2) not null,
  min_order numeric(12,2) not null default 0,
  expires_at timestamptz,
  is_active boolean not null default true
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.restaurant_settings (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Savoury',
  tagline text not null default 'Fresh Meals Delivered Fast.',
  opening_hours text not null,
  delivery_base_fee numeric(12,2) not null default 1200,
  tax_rate numeric(5,4) not null default 0.075,
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, role)
  values (new.id, new.email, 'customer')
  on conflict (id) do update
  set email = excluded.email;

  insert into public.profiles (id, full_name, phone, avatar_url, referral_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1), 'Savoury Customer'),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'avatar_url',
    upper(substr(replace(new.id::text, '-', ''), 1, 10))
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    phone = coalesce(excluded.phone, public.profiles.phone),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert or update on auth.users
for each row execute function public.handle_new_auth_user();

alter table public.users enable row level security;
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.foods enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.reviews enable row level security;
alter table public.favorites enable row level security;
alter table public.coupons enable row level security;
alter table public.notifications enable row level security;
alter table public.addresses enable row level security;
alter table public.restaurant_settings enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create policy "public read categories" on public.categories for select using (true);
create policy "public read foods" on public.foods for select using (true);
create policy "public read active coupons" on public.coupons for select using (is_active = true);
create policy "public read restaurant settings" on public.restaurant_settings for select using (true);
create policy "users read own account row" on public.users for select using (auth.uid() = id);
create policy "customers manage own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "customers manage own addresses" on public.addresses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "customers read own orders" on public.orders for select using (auth.uid() = user_id);
create policy "customers create orders" on public.orders for insert with check (auth.uid() = user_id);
create policy "customers read own order items" on public.order_items for select using (
  exists (
    select 1 from public.orders
    where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
  )
);
create policy "customers create own order items" on public.order_items for insert with check (
  exists (
    select 1 from public.orders
    where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
  )
);
create policy "customers manage own favorites" on public.favorites for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "customers manage own notifications" on public.notifications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "authenticated reviews" on public.reviews for insert with check (auth.uid() = user_id);
create policy "public read reviews" on public.reviews for select using (true);
create policy "admins manage users" on public.users for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage categories" on public.categories for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage foods" on public.foods for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage orders" on public.orders for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage order items" on public.order_items for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage payments" on public.payments for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage coupons" on public.coupons for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage restaurant settings" on public.restaurant_settings for all using (public.is_admin()) with check (public.is_admin());
