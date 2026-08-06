-- Run once in Supabase SQL Editor after kitchen-role-patch.sql.
-- Kitchen staff may adjust operational stock only; menu content and pricing remain admin-only.

create table if not exists public.kitchen_stock_adjustments (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.users(id) on delete cascade,
  food_id uuid not null references public.foods(id) on delete cascade,
  previous_quantity integer not null,
  new_quantity integer not null,
  previous_availability boolean not null,
  new_availability boolean not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists kitchen_stock_adjustments_created_idx
on public.kitchen_stock_adjustments (created_at desc);

alter table public.kitchen_stock_adjustments enable row level security;

drop policy if exists "kitchen staff read stock adjustments" on public.kitchen_stock_adjustments;
drop policy if exists "admins read stock adjustments" on public.kitchen_stock_adjustments;

create policy "kitchen staff read stock adjustments"
on public.kitchen_stock_adjustments for select
using (public.is_active_kitchen_staff());

create policy "admins read stock adjustments"
on public.kitchen_stock_adjustments for select
using (public.is_admin());

create or replace function public.adjust_kitchen_food_stock(
  target_food_id uuid,
  quantity_change integer,
  adjustment_reason text,
  available_override boolean default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  previous_quantity integer;
  next_quantity integer;
  previous_availability boolean;
  next_availability boolean;
  tracked_food_name text;
begin
  if not public.is_active_kitchen_staff() then
    raise exception 'Active kitchen staff access is required';
  end if;
  if length(trim(coalesce(adjustment_reason, ''))) < 3 then
    raise exception 'Provide a reason for this stock adjustment';
  end if;
  if quantity_change = 0 and available_override is null then
    raise exception 'Enter a stock quantity or change availability';
  end if;

  select stock_quantity, is_available, name
  into previous_quantity, previous_availability, tracked_food_name
  from public.foods
  where id = target_food_id
  for update;

  if not found then
    raise exception 'Food item was not found';
  end if;

  next_quantity := previous_quantity + quantity_change;
  if next_quantity < 0 then
    raise exception 'Stock cannot be reduced below zero';
  end if;

  next_availability := coalesce(
    available_override,
    case
      when next_quantity = 0 then false
      when quantity_change > 0 then true
      else previous_availability
    end
  );
  if next_availability and next_quantity = 0 then
    raise exception 'Add stock before marking this item available';
  end if;

  update public.foods
  set stock_quantity = next_quantity,
      is_available = next_availability
  where id = target_food_id;

  insert into public.kitchen_stock_adjustments (
    actor_id, food_id, previous_quantity, new_quantity,
    previous_availability, new_availability, reason
  ) values (
    auth.uid(), target_food_id, previous_quantity, next_quantity,
    previous_availability, next_availability, trim(adjustment_reason)
  );

  if to_regclass('public.kitchen_activity_logs') is not null then
    execute 'insert into public.kitchen_activity_logs
      (actor_id, action, metadata)
      values ($1, $2, $3)'
    using auth.uid(), 'adjusted_stock', jsonb_build_object(
      'food_id', target_food_id,
      'food_name', tracked_food_name,
      'previous_quantity', previous_quantity,
      'new_quantity', next_quantity,
      'previous_availability', previous_availability,
      'new_availability', next_availability,
      'reason', trim(adjustment_reason)
    );
  end if;
end;
$$;

revoke all on function public.adjust_kitchen_food_stock(uuid, integer, text, boolean) from public;
grant execute on function public.adjust_kitchen_food_stock(uuid, integer, text, boolean) to authenticated;
