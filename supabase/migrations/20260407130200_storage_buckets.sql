insert into storage.buckets (id, name, public)
values
  ('uploads', 'uploads', true),
  ('media', 'media', true),
  ('payment-screenshots', 'payment-screenshots', true)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can upload files to uploads'
  ) then
    execute 'create policy "Users can upload files to uploads"
      on storage.objects
      for insert
      with check (bucket_id = ''uploads'' and auth.uid() is not null)';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Anyone can view files from uploads'
  ) then
    execute 'create policy "Anyone can view files from uploads"
      on storage.objects
      for select
      using (bucket_id = ''uploads'')';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can upload files to media'
  ) then
    execute 'create policy "Users can upload files to media"
      on storage.objects
      for insert
      with check (bucket_id = ''media'' and auth.uid() is not null)';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Anyone can view files from media'
  ) then
    execute 'create policy "Anyone can view files from media"
      on storage.objects
      for select
      using (bucket_id = ''media'')';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can upload files to payment-screenshots'
  ) then
    execute 'create policy "Users can upload files to payment-screenshots"
      on storage.objects
      for insert
      with check (bucket_id = ''payment-screenshots'' and auth.uid() is not null)';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Anyone can view files from payment-screenshots'
  ) then
    execute 'create policy "Anyone can view files from payment-screenshots"
      on storage.objects
      for select
      using (bucket_id = ''payment-screenshots'')';
  end if;
end $$;

