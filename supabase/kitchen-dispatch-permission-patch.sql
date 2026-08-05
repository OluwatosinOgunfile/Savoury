-- Run once in the Supabase SQL Editor.
-- Kitchen staff may dispatch ready delivery orders, but cannot mark them delivered.

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
declare
  affected_rows integer;
begin
  if not public.is_active_kitchen_staff() then
    raise exception 'Active kitchen staff access is required';
  end if;

  if next_status not in ('preparing', 'ready', 'out_for_delivery') then
    raise exception 'Kitchen status must be preparing, ready, or out for delivery';
  end if;

  if order_source = 'app' then
    if next_status = 'out_for_delivery' then
      update public.orders
      set status = 'out_for_delivery'::public.order_status
      where id = target_order_id
        and delivery_mode = 'delivery'
        and status = 'ready';
    else
      update public.orders
      set status = case
        when next_status = 'preparing' then 'preparing'::public.order_status
        else 'ready'::public.order_status
      end
      where id = target_order_id
        and status in ('received', 'preparing');
    end if;
  elsif order_source = 'pos' then
    update public.pos_orders
    set fulfillment_status = next_status
    where id = target_order_id
      and (
        (next_status in ('preparing', 'ready') and fulfillment_status in ('received', 'preparing'))
        or (next_status = 'out_for_delivery' and order_type = 'delivery' and fulfillment_status = 'ready')
      );
  else
    raise exception 'Unknown kitchen order source';
  end if;

  get diagnostics affected_rows = row_count;
  if affected_rows = 0 then
    raise exception 'This order cannot move to the requested kitchen status';
  end if;
end;
$$;

grant execute on function public.update_kitchen_order_status(text, uuid, text) to authenticated;
