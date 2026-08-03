alter table public.orders
drop constraint if exists orders_delivery_mode_check;

alter table public.orders
add constraint orders_delivery_mode_check
check (delivery_mode in ('delivery', 'pickup', 'dining'));
