alter type public.order_status add value if not exists 'rejected';

alter table public.orders
  add column if not exists customer_name text,
  add column if not exists customer_phone text,
  add column if not exists delivery_address text,
  add column if not exists payment_method public.payment_method;

drop policy if exists "customers read own order items" on public.order_items;
create policy "customers read own order items" on public.order_items for select using (
  exists (
    select 1 from public.orders
    where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
  )
);

drop policy if exists "customers create own order items" on public.order_items;
create policy "customers create own order items" on public.order_items for insert with check (
  exists (
    select 1 from public.orders
    where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
  )
);
