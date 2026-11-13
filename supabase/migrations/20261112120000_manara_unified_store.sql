drop function if exists public.create_lixzon_sync_pair(text);
drop function if exists public.join_lixzon_sync_pair(text);
drop function if exists public.read_lixzon_paired_records(text);
drop function if exists public.upsert_lixzon_paired_records(text, jsonb);
drop function if exists public.revoke_lixzon_sync_pair(text);

drop table if exists public.lixzon_paired_sync_records cascade;
drop table if exists public.lixzon_sync_pairs cascade;
drop table if exists public.lixzon_sync_records cascade;
drop function if exists public.touch_lixzon_sync_record();

alter table public.lixzon_user_backups
  drop constraint if exists lixzon_user_backups_app_id_check;
alter table public.lixzon_user_backups
  add constraint lixzon_user_backups_app_id_check
  check (app_id in ('mishkah', 'furqan', 'manara'));

insert into public.lixzon_user_backups (user_id, app_id, schema_version, payload, updated_at)
select user_id, 'manara', schema_version, payload, updated_at
from public.lixzon_user_backups
where app_id = 'furqan'
on conflict (user_id, app_id) do nothing;
