-- Run once in the Supabase SQL Editor to enable the POS-to-delivery handoff.

alter table public.pos_orders
add column if not exists delivery_address text;

alter table public.pos_orders
add column if not exists fulfillment_status text not null default 'received';

alter table public.pos_orders
drop constraint if exists pos_orders_fulfillment_status_check;

alter table public.pos_orders
add constraint pos_orders_fulfillment_status_check
check (fulfillment_status in (
  'received',
  'preparing',
  'ready',
  'out_for_delivery',
  'delivered',
  'completed',
  'cancelled'
));

create index if not exists pos_orders_delivery_queue_idx
on public.pos_orders (order_type, fulfillment_status, created_at desc);
