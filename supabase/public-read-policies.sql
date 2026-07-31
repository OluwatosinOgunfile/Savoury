do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'restaurant_settings'
      and policyname = 'public read restaurant settings'
  ) then
    create policy "public read restaurant settings"
    on public.restaurant_settings
    for select
    using (true);
  end if;
end;
$$;
