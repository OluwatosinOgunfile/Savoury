-- Run once in Supabase SQL Editor after kitchen-dispatch-permission-patch.sql.
-- Records kitchen logins and every order status transition for admin auditing.

create table if not exists public.kitchen_activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.users(id) on delete cascade,
  action text not null,
  order_source text check (order_source in ('app', 'pos')),
  order_id uuid,
  from_status text,
  to_status text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists kitchen_activity_actor_idx
on public.kitchen_activity_logs (actor_id, created_at desc);

alter table public.kitchen_activity_logs enable row level security;

drop policy if exists "admins read kitchen activity logs" on public.kitchen_activity_logs;
create policy "admins read kitchen activity logs"
on public.kitchen_activity_logs for select using (public.is_admin());

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
  previous_status text;
  tracked_order_number text;
begin
  if not public.is_active_kitchen_staff() then
    raise exception 'Active kitchen staff access is required';
  end if;
  if next_status not in ('preparing', 'ready', 'out_for_delivery') then
    raise exception 'Kitchen status must be preparing, ready, or out for delivery';
  end if;

  if order_source = 'app' then
    select status::text into previous_status from public.orders where id = target_order_id for update;
    tracked_order_number := 'APP-' || upper(substr(target_order_id::text, 1, 8));
    if next_status = 'out_for_delivery' then
      update public.orders set status = 'out_for_delivery'::public.order_status
      where id = target_order_id and delivery_mode = 'delivery' and status = 'ready';
    else
      update public.orders
      set status = case when next_status = 'preparing' then 'preparing'::public.order_status else 'ready'::public.order_status end
      where id = target_order_id and status in ('received', 'preparing');
    end if;
  elsif order_source = 'pos' then
    select fulfillment_status, receipt_number into previous_status, tracked_order_number
    from public.pos_orders where id = target_order_id for update;
    update public.pos_orders set fulfillment_status = next_status
    where id = target_order_id and (
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

  insert into public.kitchen_activity_logs (
    actor_id, action, order_source, order_id, from_status, to_status, metadata
  ) values (
    auth.uid(), 'updated_order_status', order_source, target_order_id,
    previous_status, next_status, jsonb_build_object('order_number', tracked_order_number)
  );
end;
$$;

revoke all on function public.update_kitchen_order_status(text, uuid, text) from public;
grant execute on function public.update_kitchen_order_status(text, uuid, text) to authenticated;
