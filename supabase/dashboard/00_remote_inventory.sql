-- First SQL for the CURRENT one-migration-at-a-time workflow.
-- Run as postgres in Supabase Dashboard > SQL Editor. Metadata SELECT only.
-- A missing migration-history relation is handled without creating anything.
select jsonb_build_object(
 'postgres_version',current_setting('server_version'),
 'migration_versions',case
  when to_regclass('supabase_migrations.schema_migrations') is null then null
  else to_jsonb(xpath('/table/row/version/text()',query_to_xml(
   'select version from supabase_migrations.schema_migrations order by version',false,false,'')))
 end,
 'public_tables',coalesce((
  select jsonb_agg(jsonb_build_object('table',c.relname,'rls',c.relrowsecurity,
   'columns',(select jsonb_agg(a.attname order by a.attnum) from pg_catalog.pg_attribute a where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped)) order by c.relname)
  from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind in ('r','p')
 ),'[]'::jsonb),
 'public_privileges',coalesce((
  select jsonb_agg(jsonb_build_object('table',c.relname,
   'anon_select',has_table_privilege('anon',c.oid,'SELECT'),
   'authenticated_select',has_table_privilege('authenticated',c.oid,'SELECT'),
   'authenticated_insert',has_table_privilege('authenticated',c.oid,'INSERT'),
   'authenticated_update',has_table_privilege('authenticated',c.oid,'UPDATE'),
   'authenticated_delete',has_table_privilege('authenticated',c.oid,'DELETE'),
   'authenticated_truncate',has_table_privilege('authenticated',c.oid,'TRUNCATE')) order by c.relname)
  from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind in ('r','p')
 ),'[]'::jsonb),
 'public_policies',coalesce((
  select jsonb_agg(jsonb_build_object('table',tablename,'policy',policyname,'command',cmd,
   'roles',roles,'using',qual,'with_check',with_check,'permissive',permissive) order by tablename,policyname)
  from pg_catalog.pg_policies where schemaname='public'
 ),'[]'::jsonb),
 'custom_public_functions',coalesce((
  select jsonb_agg(p.oid::regprocedure::text order by p.oid::regprocedure::text)
  from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and not exists(select 1 from pg_catalog.pg_depend d
   where d.classid='pg_proc'::regclass and d.objid=p.oid and d.deptype='e')
 ),'[]'::jsonb),
 'private_schema_exists',to_regnamespace('private') is not null,
 'private_owner_table_exists',to_regclass('private.app_owner') is not null,
 'auth_user_triggers',coalesce((select jsonb_agg(tgname order by tgname)
  from pg_catalog.pg_trigger where tgrelid='auth.users'::regclass and not tgisinternal),'[]'::jsonb),
 'app_buckets',coalesce((select jsonb_agg(jsonb_build_object('id',id,'public',public) order by id)
  from storage.buckets where id in ('personal-audio','personal-backups','personal-content')),'[]'::jsonb)
) as deployment_inventory;
