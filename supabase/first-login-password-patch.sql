-- Run once after pos-sales-rep-patch.sql on an existing Supabase project.
-- Existing POS users will be prompted to set a private password at their next login.

alter table public.sales_representatives
add column if not exists must_change_password boolean not null default true;
