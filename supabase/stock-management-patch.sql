alter table public.foods
  add column if not exists stock_quantity integer not null default 50 check (stock_quantity >= 0);

update public.foods
set stock_quantity = 50
where stock_quantity is null;

create or replace function public.reserve_food_stock(items jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  requested_food_id uuid;
  requested_quantity integer;
  remaining_stock integer;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to place an order.';
  end if;

  for item in select * from jsonb_array_elements(items)
  loop
    requested_food_id := (item->>'food_id')::uuid;
    requested_quantity := (item->>'quantity')::integer;

    if requested_quantity <= 0 then
      raise exception 'Invalid quantity for food item %.', requested_food_id;
    end if;

    select stock_quantity
    into remaining_stock
    from public.foods
    where id = requested_food_id
      and is_available = true
    for update;

    if remaining_stock is null then
      raise exception 'This food item is no longer available.';
    end if;

    if remaining_stock < requested_quantity then
      raise exception 'Only % item(s) left in stock.', remaining_stock;
    end if;

    update public.foods
    set stock_quantity = stock_quantity - requested_quantity
    where id = requested_food_id;
  end loop;
end;
$$;

grant execute on function public.reserve_food_stock(jsonb) to authenticated;
