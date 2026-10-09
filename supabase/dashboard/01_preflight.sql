-- CURRENT STEP. Run as postgres in Supabase Dashboard > SQL Editor.
-- Metadata only: no DDL, no learning records, no passwords/tokens/keys.
select jsonb_build_object(
 'postgres_version',current_setting('server_version'),
 'postgres_15_or_newer',current_setting('server_version_num')::integer>=150000,
 'public_tables',coalesce((
  select jsonb_agg(jsonb_build_object('table',c.relname,'rls',c.relrowsecurity) order by c.relname)
  from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind in ('r','p')
 ),'[]'::jsonb),
 'private_schema_exists',to_regnamespace('private') is not null,
 'private_owner_table_exists',to_regclass('private.app_owner') is not null,
 'custom_public_functions',coalesce((
  select jsonb_agg(p.oid::regprocedure::text order by p.oid::regprocedure::text)
  from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and not exists(
   select 1 from pg_catalog.pg_depend d where d.classid='pg_proc'::regclass and d.objid=p.oid and d.deptype='e'
  )
 ),'[]'::jsonb),
 'migration_history_exists',to_regclass('supabase_migrations.schema_migrations') is not null,
 'auth_user_triggers',coalesce((
  select jsonb_agg(t.tgname order by t.tgname) from pg_catalog.pg_trigger t
  where t.tgrelid='auth.users'::regclass and not t.tgisinternal
 ),'[]'::jsonb),
 'owner_auth_account_count',(
  select count(*) from auth.users where lower(email)='owner@example.com'
 ),
 'existing_app_buckets',coalesce((
  select jsonb_agg(jsonb_build_object('id',id,'public',public) order by id)
  from storage.buckets where id in ('personal-audio','personal-backups','personal-content')
 ),'[]'::jsonb)
) as database_preflight;

-- If migration_history_exists=true, review its version list separately:
-- select version from supabase_migrations.schema_migrations order by version;
-- Do not execute any migration until existing/partial installations are checked.
