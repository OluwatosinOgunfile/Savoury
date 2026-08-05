-- Run once in the Supabase SQL Editor after the POS and kitchen migrations.
-- Creates durable POS-ready notifications and a secured counter handover action.

alter table public.pos_orders
add column if not exists ready_at timestamptz;

alter table public.pos_orders
add column if not exists handed_over_at timestamptz;

alter table public.pos_orders
add column if not exists handed_over_by uuid references public.users(id) on delete set null;

create table if not exists public.pos_staff_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  pos_order_id uuid not null references public.pos_orders(id) on delete cascade,
  kind text not null default 'order_ready' check (kind in ('order_ready')),
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (recipient_id, pos_order_id, kind)
);

create index if not exists pos_staff_notifications_recipient_idx
on public.pos_staff_notifications (recipient_id, read_at, created_at desc);

alter table public.pos_staff_notifications enable row level security;

drop policy if exists "sales reps read own pos notifications" on public.pos_staff_notifications;
drop policy if exists "sales reps update own pos notifications" on public.pos_staff_notifications;
drop policy if exists "admins manage pos notifications" on public.pos_staff_notifications;

create policy "sales reps read own pos notifications"
on public.pos_staff_notifications for select
using (public.is_active_sales_rep() and recipient_id = auth.uid());

create policy "sales reps update own pos notifications"
on public.pos_staff_notifications for update
using (public.is_active_sales_rep() and recipient_id = auth.uid())
with check (public.is_active_sales_rep() and recipient_id = auth.uid());

create policy "admins manage pos notifications"
on public.pos_staff_notifications for all
using (public.is_admin()) with check (public.is_admin());

create or replace function public.notify_pos_order_ready()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.fulfillment_status = 'ready'
     and old.fulfillment_status is distinct from new.fulfillment_status then
    new.ready_at := coalesce(new.ready_at, now());

    if new.order_type in ('dine_in', 'takeaway') and new.cashier_id is not null then
      insert into public.pos_staff_notifications (
        recipient_id, pos_order_id, kind, title, body
      ) values (
        new.cashier_id,
        new.id,
        'order_ready',
        'Order ready for handover',
        new.receipt_number || ' is ready for counter handover.'
      )
      on conflict (recipient_id, pos_order_id, kind) do update
      set body = excluded.body, read_at = null, created_at = now();
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists notify_pos_order_ready_trigger on public.pos_orders;
create trigger notify_pos_order_ready_trigger
before update of fulfillment_status on public.pos_orders
for each row execute function public.notify_pos_order_ready();

-- Add notifications for counter orders that were already ready before this migration.
insert into public.pos_staff_notifications (recipient_id, pos_order_id, kind, title, body)
select cashier_id, id, 'order_ready', 'Order ready for handover',
       receipt_number || ' is ready for counter handover.'
from public.pos_orders
where fulfillment_status = 'ready'
  and order_type in ('dine_in', 'takeaway')
  and cashier_id is not null
on conflict (recipient_id, pos_order_id, kind) do nothing;

update public.pos_orders
set ready_at = coalesce(ready_at, now())
where fulfillment_status = 'ready';

create or replace function public.mark_my_pos_notifications_read()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_active_sales_rep() then
    raise exception 'Only active Sales Representatives can update POS notifications';
  end if;

  update public.pos_staff_notifications
  set read_at = now()
  where recipient_id = auth.uid() and read_at is null;
end;
$$;

create or replace function public.confirm_pos_counter_handover(target_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_order public.pos_orders%rowtype;
begin
  if not public.is_active_sales_rep() then
    raise exception 'Only active Sales Representatives can confirm handover';
  end if;

  select * into target_order
  from public.pos_orders
  where id = target_order_id
  for update;

  if not found then
    raise exception 'POS order was not found';
  end if;
  if target_order.cashier_id is distinct from auth.uid() then
    raise exception 'This order belongs to another Sales Representative';
  end if;
  if target_order.order_type not in ('dine_in', 'takeaway') then
    raise exception 'Delivery orders cannot be completed at counter handover';
  end if;
  if target_order.fulfillment_status <> 'ready' then
    raise exception 'Only ready orders can be handed over';
  end if;

  update public.pos_orders
  set fulfillment_status = 'completed',
      handed_over_at = now(),
      handed_over_by = auth.uid()
  where id = target_order_id;

  update public.pos_staff_notifications
  set read_at = coalesce(read_at, now())
  where recipient_id = auth.uid() and pos_order_id = target_order_id;

  insert into public.pos_transaction_logs (
    actor_id, action, entity_type, entity_id, metadata
  ) values (
    auth.uid(), 'confirmed_counter_handover', 'pos_order', target_order_id,
    jsonb_build_object('receipt_number', target_order.receipt_number, 'order_type', target_order.order_type)
  );
end;
$$;

revoke all on function public.mark_my_pos_notifications_read() from public;
revoke all on function public.confirm_pos_counter_handover(uuid) from public;
grant execute on function public.mark_my_pos_notifications_read() to authenticated;
grant execute on function public.confirm_pos_counter_handover(uuid) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'pos_staff_notifications'
     ) then
    alter publication supabase_realtime add table public.pos_staff_notifications;
  end if;
exception
  when insufficient_privilege then
    raise notice 'Enable Realtime for pos_staff_notifications in Supabase if instant events are required.';
end $$;
