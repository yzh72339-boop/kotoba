import {readFile,writeFile} from 'node:fs/promises';
const sql=await readFile('supabase/migrations/010_content_library_identity.sql','utf8');
// One migration only. Full transaction protects data if a prerequisite is missing.
const deploy=`-- Run only after migrations 001–009 are verified. Do not execute another migration here.
begin;
set local lock_timeout='5s';
set local statement_timeout='120s';
do $deploy_010$
declare v_sql text:=$migration_010$\n${sql}\n$migration_010$;v_policies text;v_helper text;v_rows jsonb;v_after jsonb;
begin
 if exists(select 1 from supabase_migrations.schema_migrations m where m.version='010') then
  if not exists(select 1 from supabase_migrations.schema_migrations m where m.version='010' and m.name='content_library_identity' and m.statements=array[v_sql]) then
   raise exception 'Migration 010 already exists with different SQL; stop and inspect';
  end if;
  raise notice 'Migration 010 already recorded; no changes made';return;
 end if;
 if (select count(*) from supabase_migrations.schema_migrations m where m.version in ('001','002','003','004','005','006','007','008','009'))<>9 then
  raise exception 'Verified migrations 001–009 are required';end if;
 if to_regprocedure('private.project_state(uuid,jsonb)') is null or to_regprocedure('private.project_pre_library_state(uuid,jsonb)') is not null then
  raise exception 'Unexpected projection function state; stop and inspect';end if;
 v_policies:=(select md5(coalesce(jsonb_agg(to_jsonb(p) order by p.schemaname,p.tablename,p.policyname)::text,'[]')) from pg_catalog.pg_policies p where p.schemaname in ('public','storage'));
 v_helper:=coalesce(pg_get_functiondef(to_regprocedure('public.rls_auto_enable()')),'');
 select jsonb_object_agg(c.relname,c.oid) into v_rows from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r';
 execute v_sql;
 if v_policies is distinct from (select md5(coalesce(jsonb_agg(to_jsonb(p) order by p.schemaname,p.tablename,p.policyname)::text,'[]')) from pg_catalog.pg_policies p where p.schemaname in ('public','storage')) then
  raise exception 'RLS policy changed; rollback';end if;
 if v_helper is distinct from coalesce(pg_get_functiondef(to_regprocedure('public.rls_auto_enable()')),'') then
  raise exception 'RLS helper changed; rollback';end if;
 select jsonb_object_agg(c.relname,c.oid) into v_after from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r';
 if v_rows is distinct from v_after then raise exception 'Existing tables changed; rollback';end if;
 insert into supabase_migrations.schema_migrations(version,name,statements) values('010','content_library_identity',array[v_sql]);
end;
$deploy_010$;
commit;
select version,name from supabase_migrations.schema_migrations order by version;
`;
await writeFile('supabase/dashboard/010_deploy.sql',deploy);
const verify=`-- Read-only catalog verification. Owner runtime/sync tests are separate.
with problems as (
 select 'missing_migration_010' as problem where not exists(select 1 from supabase_migrations.schema_migrations where version='010' and name='content_library_identity')
 union all select 'missing_function:'||f.signature from (values('private.project_state(uuid,jsonb)'),('private.project_pre_library_state(uuid,jsonb)'),('private.prepare_library_projection(uuid,jsonb)'),('private.finish_library_projection(uuid,jsonb)'),('public.content_library_ready()')) f(signature) where to_regprocedure(f.signature) is null
 union all select 'private_execute:'||r.role_name||':'||p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace cross join (values('anon'),('authenticated')) r(role_name) where n.nspname='private' and has_function_privilege(r.role_name,p.oid,'EXECUTE')
 union all select 'rls_disabled:'||c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity
 union all select 'unconditional_policy:'||tablename||':'||policyname from pg_policies where schemaname='public' and (trim(qual,' ()')='true' or trim(with_check,' ()')='true')
 union all select 'anon_capability_execute' where has_function_privilege('anon','public.content_library_ready()','EXECUTE')
 union all select 'authenticated_capability_missing' where not has_function_privilege('authenticated','public.content_library_ready()','EXECUTE')
)
select jsonb_build_object('problems',coalesce((select jsonb_agg(problem) from problems),'[]'::jsonb),'migration_010_recorded',exists(select 1 from supabase_migrations.schema_migrations where version='010'),'private_buckets',(select count(*) from storage.buckets where id in ('personal-audio','personal-content','personal-backups') and not public),'private_helpers_browser_access',exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and (has_function_privilege('anon',p.oid,'EXECUTE') or has_function_privilege('authenticated',p.oid,'EXECUTE')))) as migration_010_verification;
`;
await writeFile('supabase/dashboard/010_verify.sql',verify);
console.log('Prepared only migration 010 + read-only verification. Not deployed.');
