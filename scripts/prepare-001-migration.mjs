import {readFileSync,writeFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const migration=readFileSync(new URL('supabase/migrations/001_kotoba.sql',root),'utf8').trim();
if(migration.includes('$migration_001$'))throw new Error('Migration delimiter collision.');
const sql=`-- Only migration 001. Run the WHOLE file once as postgres.
begin;
set local lock_timeout='5s';
set local statement_timeout='120s';
do $deploy_001$
declare
 migration_sql text:=$migration_001$
${migration}
$migration_001$;
 helper_oid oid;
 helper_before jsonb;
 event_before jsonb;
begin
 perform pg_advisory_xact_lock(hashtext('kotoba-dashboard-migrations'));
 if current_user<>'postgres' then raise exception 'Use postgres in SQL Editor';end if;
 if current_setting('server_version_num')::integer<150000 then raise exception 'PostgreSQL 15+ required';end if;
 if exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p'))
  or to_regclass('supabase_migrations.schema_migrations') is not null
  or to_regnamespace('private') is not null
  or exists(select 1 from pg_catalog.pg_trigger where tgrelid='auth.users'::regclass and not tgisinternal) then
  raise exception 'Database differs from the empty inventory; stop and recheck';
 end if;
 helper_oid:=to_regprocedure('public.rls_auto_enable()');
 select to_jsonb(p) into helper_before from pg_catalog.pg_proc p
 where p.oid=helper_oid and p.prorettype='pg_catalog.event_trigger'::regtype and p.prosecdef
  and pg_get_userbyid(p.proowner)='postgres' and p.proconfig=array['search_path=pg_catalog'];
 select to_jsonb(t) into event_before from pg_catalog.pg_event_trigger t
 where t.evtname='ensure_rls' and t.evtfoid=helper_oid and t.evtevent='ddl_command_end'
  and t.evtenabled='O' and pg_get_userbyid(t.evtowner)='postgres'
  and t.evttags @> array['CREATE TABLE','CREATE TABLE AS','SELECT INTO']
  and t.evttags <@ array['CREATE TABLE','CREATE TABLE AS','SELECT INTO'];
 if helper_before is null or event_before is null then raise exception 'RLS helper differs from the inspected configuration';end if;
 if exists(select 1 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.oid<>helper_oid and not exists(
   select 1 from pg_catalog.pg_depend d where d.classid='pg_proc'::regclass and d.objid=p.oid and d.deptype='e')) then
  raise exception 'Unexpected public function; stop and recheck';
 end if;

 execute migration_sql;

 create schema if not exists supabase_migrations;
 create table supabase_migrations.schema_migrations(version text primary key,statements text[],name text);
 alter table supabase_migrations.schema_migrations enable row level security;
 revoke all on schema supabase_migrations from public,anon,authenticated;
 revoke all on supabase_migrations.schema_migrations from public,anon,authenticated;

 if helper_before is distinct from (select to_jsonb(p) from pg_catalog.pg_proc p where p.oid=helper_oid)
  or event_before is distinct from (select to_jsonb(t) from pg_catalog.pg_event_trigger t where t.evtname='ensure_rls') then
  raise exception 'Existing RLS helper changed; rollback';
 end if;
 if exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind in ('r','p') and not c.relrowsecurity) then
  raise exception 'A public table does not have RLS; rollback';
 end if;
 insert into supabase_migrations.schema_migrations(version,name,statements)
 values('001','kotoba',array[migration_sql,format(E'-- helper_catalog_md5=%s; ensure_rls_catalog_md5=%s\\n',md5(helper_before::text),md5(event_before::text))]);
end;
$deploy_001$;
commit;
select version,name from supabase_migrations.schema_migrations order by version;
`;
writeFileSync(new URL('supabase/dashboard/001_deploy.sql',root),sql);
console.log('Prepared only 001_deploy.sql; no database connection or execution.');
