create table if not exists public.lixzon_user_backups (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  app_id text not null check (app_id in ('mishkah', 'furqan')),
  schema_version integer not null check (schema_version = 1),
  payload jsonb not null check (
    jsonb_typeof(payload) = 'object'
    and octet_length(payload::text) <= 1048576
  ),
  updated_at timestamptz not null default now(),
  primary key (user_id, app_id)
);

alter table public.lixzon_user_backups enable row level security;
revoke all on table public.lixzon_user_backups from anon;
grant select, insert, update, delete on table public.lixzon_user_backups to authenticated;

drop policy if exists "Users read their own LIXZON backups" on public.lixzon_user_backups;
create policy "Users read their own LIXZON backups"
  on public.lixzon_user_backups for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users insert their own LIXZON backups" on public.lixzon_user_backups;
create policy "Users insert their own LIXZON backups"
  on public.lixzon_user_backups for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users update their own LIXZON backups" on public.lixzon_user_backups;
create policy "Users update their own LIXZON backups"
  on public.lixzon_user_backups for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete their own LIXZON backups" on public.lixzon_user_backups;
create policy "Users delete their own LIXZON backups"
  on public.lixzon_user_backups for delete to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.touch_lixzon_user_backup()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

drop trigger if exists touch_lixzon_user_backup on public.lixzon_user_backups;
create trigger touch_lixzon_user_backup
  before update on public.lixzon_user_backups
  for each row execute function public.touch_lixzon_user_backup();
