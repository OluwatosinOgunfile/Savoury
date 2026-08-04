do $$
begin
  alter type public.user_role add value if not exists 'sales_rep';
exception
  when duplicate_object then null;
end $$;

create table if not exists public.sales_representatives (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  email text unique not null,
  phone text,
  staff_id text unique not null default ('SV-POS-' || upper(substr(gen_random_uuid()::text, 1, 6))),
  status text not null default 'active' check (status in ('active', 'suspended')),
  permissions text[] not null default array['discounts']::text[],
  last_login_at timestamptz,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pos_orders (
  id uuid primary key default gen_random_uuid(),
  receipt_number text unique not null,
  cashier_id uuid references public.users(id) on delete set null,
  cashier_name text not null,
  customer_name text,
  customer_phone text,
  table_number text,
  order_type text not null default 'takeaway' check (order_type in ('dine_in', 'takeaway', 'delivery')),
  subtotal numeric not null default 0,
  discount numeric not null default 0,
  tax numeric not null default 0,
  total numeric not null default 0,
  status text not null default 'paid' check (status in ('paid', 'held', 'cancelled', 'refunded')),
  synced_at timestamptz default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.pos_order_items (
  id uuid primary key default gen_random_uuid(),
  pos_order_id uuid not null references public.pos_orders(id) on delete cascade,
  food_id uuid references public.foods(id) on delete set null,
  food_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric not null default 0,
  subtotal numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.pos_payments (
  id uuid primary key default gen_random_uuid(),
  pos_order_id uuid not null references public.pos_orders(id) on delete cascade,
  method text not null check (method in ('cash', 'card', 'transfer', 'split')),
  amount_paid numeric not null default 0,
  change_amount numeric not null default 0,
  split_details jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.pos_receipts (
  id uuid primary key default gen_random_uuid(),
  pos_order_id uuid not null references public.pos_orders(id) on delete cascade,
  receipt_number text unique not null,
  receipt_payload jsonb not null,
  printed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.pos_held_orders (
  id uuid primary key default gen_random_uuid(),
  cashier_id uuid references public.users(id) on delete set null,
  label text not null,
  order_payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.pos_refunds (
  id uuid primary key default gen_random_uuid(),
  pos_order_id uuid not null references public.pos_orders(id) on delete cascade,
  approved_by uuid references public.users(id) on delete set null,
  amount numeric not null default 0,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.cash_drawer (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users(id) on delete set null,
  movement_type text not null check (movement_type in ('open', 'sale', 'refund', 'cash_in', 'cash_out', 'close')),
  amount numeric not null default 0,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.pos_transaction_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.sales_representatives enable row level security;
alter table public.pos_orders enable row level security;
alter table public.pos_order_items enable row level security;
alter table public.pos_payments enable row level security;
alter table public.pos_receipts enable row level security;
alter table public.pos_held_orders enable row level security;
alter table public.pos_refunds enable row level security;
alter table public.cash_drawer enable row level security;
alter table public.pos_transaction_logs enable row level security;

drop policy if exists "admins manage sales representatives" on public.sales_representatives;
drop policy if exists "sales reps read own profile" on public.sales_representatives;
drop policy if exists "admins and sales reps manage pos orders" on public.pos_orders;
drop policy if exists "admins and sales reps manage pos order items" on public.pos_order_items;
drop policy if exists "admins and sales reps manage pos payments" on public.pos_payments;
drop policy if exists "admins and sales reps manage pos receipts" on public.pos_receipts;
drop policy if exists "admins and sales reps manage held orders" on public.pos_held_orders;
drop policy if exists "admins manage pos refunds" on public.pos_refunds;
drop policy if exists "admins and sales reps manage cash drawer" on public.cash_drawer;
drop policy if exists "admins and sales reps create transaction logs" on public.pos_transaction_logs;

create policy "admins manage sales representatives" on public.sales_representatives for all using (public.is_admin()) with check (public.is_admin());
create policy "sales reps read own profile" on public.sales_representatives for select using (auth.uid() = auth_user_id);
create policy "admins and sales reps manage pos orders" on public.pos_orders for all using (public.is_admin() or exists (select 1 from public.users where id = auth.uid() and role::text = 'sales_rep')) with check (public.is_admin() or exists (select 1 from public.users where id = auth.uid() and role::text = 'sales_rep'));
create policy "admins and sales reps manage pos order items" on public.pos_order_items for all using (public.is_admin() or exists (select 1 from public.users where id = auth.uid() and role::text = 'sales_rep')) with check (public.is_admin() or exists (select 1 from public.users where id = auth.uid() and role::text = 'sales_rep'));
create policy "admins and sales reps manage pos payments" on public.pos_payments for all using (public.is_admin() or exists (select 1 from public.users where id = auth.uid() and role::text = 'sales_rep')) with check (public.is_admin() or exists (select 1 from public.users where id = auth.uid() and role::text = 'sales_rep'));
create policy "admins and sales reps manage pos receipts" on public.pos_receipts for all using (public.is_admin() or exists (select 1 from public.users where id = auth.uid() and role::text = 'sales_rep')) with check (public.is_admin() or exists (select 1 from public.users where id = auth.uid() and role::text = 'sales_rep'));
create policy "admins and sales reps manage held orders" on public.pos_held_orders for all using (public.is_admin() or cashier_id = auth.uid()) with check (public.is_admin() or cashier_id = auth.uid());
create policy "admins manage pos refunds" on public.pos_refunds for all using (public.is_admin()) with check (public.is_admin());
create policy "admins and sales reps manage cash drawer" on public.cash_drawer for all using (public.is_admin() or exists (select 1 from public.users where id = auth.uid() and role::text = 'sales_rep')) with check (public.is_admin() or exists (select 1 from public.users where id = auth.uid() and role::text = 'sales_rep'));
create policy "admins and sales reps create transaction logs" on public.pos_transaction_logs for insert with check (public.is_admin() or exists (select 1 from public.users where id = auth.uid() and role::text = 'sales_rep'));
