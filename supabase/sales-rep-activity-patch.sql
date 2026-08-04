-- Run once in Supabase SQL Editor to let admins view the POS activity timeline.

drop policy if exists "admins read pos transaction logs" on public.pos_transaction_logs;

create policy "admins read pos transaction logs"
on public.pos_transaction_logs
for select
using (public.is_admin());
