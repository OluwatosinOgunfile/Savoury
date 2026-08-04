-- Run after schema.sql and pos-sales-rep-patch.sql.
-- This makes role restrictions authoritative in Supabase, not only in React routes.

create or replace function public.is_customer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'customer'
  );
$$;

create or replace function public.is_active_sales_rep()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users users
    join public.sales_representatives reps on reps.auth_user_id = users.id
    where users.id = auth.uid()
      and users.role = 'sales_rep'
      and reps.status = 'active'
  );
$$;

drop policy if exists "customers manage own addresses" on public.addresses;
drop policy if exists "customers read own orders" on public.orders;
drop policy if exists "customers create orders" on public.orders;
drop policy if exists "customers read own order items" on public.order_items;
drop policy if exists "customers create own order items" on public.order_items;
drop policy if exists "customers manage own favorites" on public.favorites;
drop policy if exists "customers manage own notifications" on public.notifications;
drop policy if exists "authenticated reviews" on public.reviews;

create policy "customers manage own addresses" on public.addresses
for all using (public.is_customer() and auth.uid() = user_id)
with check (public.is_customer() and auth.uid() = user_id);

create policy "customers read own orders" on public.orders
for select using (public.is_customer() and auth.uid() = user_id);

create policy "customers create orders" on public.orders
for insert with check (public.is_customer() and auth.uid() = user_id);

create policy "customers read own order items" on public.order_items
for select using (
  public.is_customer() and exists (
    select 1 from public.orders
    where orders.id = order_items.order_id and orders.user_id = auth.uid()
  )
);

create policy "customers create own order items" on public.order_items
for insert with check (
  public.is_customer() and exists (
    select 1 from public.orders
    where orders.id = order_items.order_id and orders.user_id = auth.uid()
  )
);

create policy "customers manage own favorites" on public.favorites
for all using (public.is_customer() and auth.uid() = user_id)
with check (public.is_customer() and auth.uid() = user_id);

create policy "customers manage own notifications" on public.notifications
for all using (public.is_customer() and auth.uid() = user_id)
with check (public.is_customer() and auth.uid() = user_id);

create policy "authenticated reviews" on public.reviews
for insert with check (public.is_customer() and auth.uid() = user_id);

drop policy if exists "admins and sales reps manage pos orders" on public.pos_orders;
drop policy if exists "admins and sales reps manage pos order items" on public.pos_order_items;
drop policy if exists "admins and sales reps manage pos payments" on public.pos_payments;
drop policy if exists "admins and sales reps manage pos receipts" on public.pos_receipts;
drop policy if exists "admins and sales reps manage held orders" on public.pos_held_orders;
drop policy if exists "admins and sales reps manage cash drawer" on public.cash_drawer;
drop policy if exists "admins and sales reps create transaction logs" on public.pos_transaction_logs;
drop policy if exists "admins and active sales reps manage pos orders" on public.pos_orders;
drop policy if exists "admins and active sales reps manage pos order items" on public.pos_order_items;
drop policy if exists "admins and active sales reps manage pos payments" on public.pos_payments;
drop policy if exists "admins and active sales reps manage pos receipts" on public.pos_receipts;
drop policy if exists "admins and active sales reps manage held orders" on public.pos_held_orders;
drop policy if exists "admins and active sales reps manage cash drawer" on public.cash_drawer;
drop policy if exists "admins and active sales reps create transaction logs" on public.pos_transaction_logs;
drop policy if exists "admins read pos transaction logs" on public.pos_transaction_logs;

create policy "admins and active sales reps manage pos orders" on public.pos_orders
for all using (public.is_admin() or public.is_active_sales_rep())
with check (public.is_admin() or public.is_active_sales_rep());

create policy "admins and active sales reps manage pos order items" on public.pos_order_items
for all using (public.is_admin() or public.is_active_sales_rep())
with check (public.is_admin() or public.is_active_sales_rep());

create policy "admins and active sales reps manage pos payments" on public.pos_payments
for all using (public.is_admin() or public.is_active_sales_rep())
with check (public.is_admin() or public.is_active_sales_rep());

create policy "admins and active sales reps manage pos receipts" on public.pos_receipts
for all using (public.is_admin() or public.is_active_sales_rep())
with check (public.is_admin() or public.is_active_sales_rep());

create policy "admins and active sales reps manage held orders" on public.pos_held_orders
for all using (public.is_admin() or (public.is_active_sales_rep() and cashier_id = auth.uid()))
with check (public.is_admin() or (public.is_active_sales_rep() and cashier_id = auth.uid()));

create policy "admins and active sales reps manage cash drawer" on public.cash_drawer
for all using (public.is_admin() or public.is_active_sales_rep())
with check (public.is_admin() or public.is_active_sales_rep());

create policy "admins and active sales reps create transaction logs" on public.pos_transaction_logs
for insert with check (public.is_admin() or public.is_active_sales_rep());

create policy "admins read pos transaction logs" on public.pos_transaction_logs
for select using (public.is_admin());
