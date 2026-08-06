-- Run once in Supabase SQL Editor.
-- Creates the public menu image bucket while limiting writes to administrators.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'food-images',
  'food-images',
  true,
  12582912,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public read food images" on storage.objects;
drop policy if exists "admins upload food images" on storage.objects;
drop policy if exists "admins update food images" on storage.objects;
drop policy if exists "admins delete food images" on storage.objects;

create policy "public read food images"
on storage.objects for select
using (bucket_id = 'food-images');

create policy "admins upload food images"
on storage.objects for insert to authenticated
with check (bucket_id = 'food-images' and public.is_admin());

create policy "admins update food images"
on storage.objects for update to authenticated
using (bucket_id = 'food-images' and public.is_admin())
with check (bucket_id = 'food-images' and public.is_admin());

create policy "admins delete food images"
on storage.objects for delete to authenticated
using (bucket_id = 'food-images' and public.is_admin());
