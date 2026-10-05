import {readFileSync,writeFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const migration=readFileSync(new URL('supabase/migrations/003_sync_and_srs.sql',root),'utf8').trim();
const checkpoint=readFileSync(new URL('supabase/dashboard/002_verify.sql',root),'utf8');
const tables=[...checkpoint.split('])), tables as',1)[0].matchAll(/'([a-z_]+)'/g)].map(m=>m[1]).sort();
const email=process.env.ALLOWED_USER_EMAIL?.trim().toLowerCase();
if(!email||!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email))throw new Error('Set ALLOWED_USER_EMAIL in the server environment.');
if(tables.length!==41||new Set(tables).size!==41||migration.includes('$migration_003$'))throw new Error('Unexpected migration inventory or delimiter.');
const literal=v=>`'${v.replaceAll("'","''")}'`;
const sqlArray=v=>`array[${v.map(literal).join(',')}]`;
const functions=[
 ['public.record_review(uuid,uuid,text,timestamptz,integer)',true,true],
 ['public.sync_personal_state(bigint,text,jsonb)',true,true],
 ['public.personal_progress(text)',false,true],
 ['private.resolve_id(uuid,text,text)',true,false],
 ['private.validate_review_target()',false,false],
 ['private.create_review_item()',true,false],
 ['private.create_grammar_review()',true,false],
 ['private.project_state(uuid,jsonb)',true,false]
];
const protectedFunctions=['public.create_user_profile()','public.configure_private_owner(text)','public.is_private_owner()','public.consume_ai_request(uuid)','private.guard_owner_signup()','private.touch_updated_at()'];
const protectedQuery=String.raw`select jsonb_agg(to_jsonb(p) order by p.oid) from pg_catalog.pg_proc p
 where p.oid in (select to_regprocedure(s) from unnest(${sqlArray(protectedFunctions)}) s)`;
const policyQuery=String.raw`select jsonb_agg(to_jsonb(p) order by p.schemaname,p.tablename,p.policyname)
 from pg_catalog.pg_policies p where p.schemaname='public' or (p.schemaname='storage' and p.tablename='objects')`;
const functionQuery=String.raw`select jsonb_agg(to_jsonb(p) order by p.oid) from pg_catalog.pg_proc p
 where p.oid in (select to_regprocedure(s) from unnest(${sqlArray(functions.map(f=>f[0]))}) s)`;
const entry=String.raw`-- Only migration 003. Run the WHOLE file once as postgres, after 002 passes.
begin;
set local lock_timeout='5s';
set local statement_timeout='120s';
do $deploy_003$
declare
 migration_sql text:=$migration_003$
${migration}
$migration_003$;
 expected_tables text[]:=${sqlArray(tables)};
 helper_before jsonb;
 event_before jsonb;
 protected_before jsonb;
 policies_before jsonb;
 data_before jsonb:='{}'::jsonb;
 data_after jsonb:='{}'::jsonb;
 t text;
 row_count bigint;
begin
 perform pg_advisory_xact_lock(hashtext('kotoba-dashboard-migrations'));
 if current_user<>'postgres' then raise exception 'Use postgres in SQL Editor';end if;
 if to_regclass('supabase_migrations.schema_migrations') is null then raise exception 'Missing migration ledger';end if;
 if (select array_agg(version order by version) from supabase_migrations.schema_migrations) is distinct from array['001','002']
  or not exists(select 1 from supabase_migrations.schema_migrations where version='002' and name='personal_backend') then
  raise exception 'Expected only verified migrations 001 and 002; stop and recheck';
 end if;
 if (select array_agg(c.relname::text order by c.relname::text) from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p')) is distinct from expected_tables then
  raise exception 'Public table inventory differs from verified 002';
 end if;
 if to_regclass('private.app_owner') is null then raise exception 'Private owner configuration is missing';end if;
 if (select count(*) from private.app_owner)<>1 or not exists(select 1 from private.app_owner where email=${literal(email)}) then
  raise exception 'Private owner email differs from server configuration';
 end if;
 if exists(select 1 from unnest(${sqlArray(functions.map(f=>f[0]))}) s where to_regprocedure(s) is not null) then
  raise exception 'A migration 003 function already exists; do not overwrite or repeat';
 end if;
 lock table auth.users in share row exclusive mode;
 lock table ${tables.map(t=>`public.${t}`).join(',')},private.app_owner in share row exclusive mode;
 if exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  where ((n.nspname='public' and c.relkind in ('r','p')) or c.oid='private.app_owner'::regclass) and not c.relrowsecurity)
  or exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
   cross join (values('anon'),('authenticated')) r(role_name)
   cross join (values('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) v(privilege)
   where ((n.nspname='public' and c.relkind in ('r','p')) or c.oid='private.app_owner'::regclass)
    and has_table_privilege(r.role_name,c.oid,v.privilege)) then
  raise exception 'Checkpoint 002 RLS or closed table privileges have changed';
 end if;
 if has_schema_privilege('anon','private','USAGE') or has_schema_privilege('authenticated','private','USAGE') then
  raise exception 'Private schema is accessible to a browser role';
 end if;
 if (select count(*) from storage.buckets where id in ('personal-audio','personal-backups','personal-content') and not public)<>3 then
  raise exception 'Managed Storage buckets must be private';
 end if;
 if not exists(select 1 from pg_catalog.pg_trigger where tgrelid='auth.users'::regclass
  and tgname='on_auth_user_created' and tgfoid=to_regprocedure('public.create_user_profile()') and tgtype=5 and tgenabled='O')
  or not exists(select 1 from pg_catalog.pg_trigger where tgrelid='auth.users'::regclass
   and tgname='allow_private_owner_only' and tgfoid=to_regprocedure('private.guard_owner_signup()') and tgtype=7 and tgenabled='O') then
  raise exception 'Auth triggers differ from verified 002';
 end if;
 select to_jsonb(p) into helper_before from pg_catalog.pg_proc p where p.oid=to_regprocedure('public.rls_auto_enable()');
 select to_jsonb(e) into event_before from pg_catalog.pg_event_trigger e where e.evtname='ensure_rls';
 if helper_before is null or event_before is null
  or md5(helper_before::text) is distinct from (select substring(statements[2] from 'helper_catalog_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations where version='002')
  or md5(event_before::text) is distinct from (select substring(statements[2] from 'ensure_rls_catalog_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations where version='002') then
  raise exception 'Existing RLS helper differs from verified 002';
 end if;
 select (${protectedQuery}) into protected_before;
 select (${policyQuery}) into policies_before;
 foreach t in array expected_tables loop
  execute format('select count(*) from public.%I',t) into row_count;
  data_before:=data_before||jsonb_build_object(t,jsonb_build_object('oid',to_regclass(format('public.%I',t))::oid,'rows',row_count));
 end loop;

 execute migration_sql;

 foreach t in array expected_tables loop
  execute format('select count(*) from public.%I',t) into row_count;
  data_after:=data_after||jsonb_build_object(t,jsonb_build_object('oid',to_regclass(format('public.%I',t))::oid,'rows',row_count));
 end loop;
 if data_before is distinct from data_after then raise exception 'Existing table identity or row count changed; rollback';end if;
 if protected_before is distinct from (${protectedQuery}) or policies_before is distinct from (${policyQuery}) then
  raise exception 'Existing Auth functions or RLS policies changed; rollback';
 end if;
 if helper_before is distinct from (select to_jsonb(p) from pg_catalog.pg_proc p where p.oid=to_regprocedure('public.rls_auto_enable()'))
  or event_before is distinct from (select to_jsonb(e) from pg_catalog.pg_event_trigger e where e.evtname='ensure_rls') then
  raise exception 'Existing RLS helper changed; rollback';
 end if;
 insert into supabase_migrations.schema_migrations(version,name,statements)
 values('003','sync_and_srs',array[
  migration_sql,
  format(E'-- helper_catalog_md5=%s; ensure_rls_catalog_md5=%s\n',md5(helper_before::text),md5(event_before::text)),
  format(E'-- table_oid_and_rows=%s\n',data_before::text),
  format(E'-- policies_catalog_md5=%s; protected_functions_md5=%s; installed_functions_md5=%s\n',
   md5(policies_before::text),md5(protected_before::text),md5((${functionQuery})::text))
 ]);
end;
$deploy_003$;
commit;
select version,name from supabase_migrations.schema_migrations order by version;
`;
writeFileSync(new URL('supabase/dashboard/003_deploy.sql',root),entry);

const verify=String.raw`-- Read-only verification AFTER 003_deploy.sql succeeds, as postgres.
-- No RPC is invoked. This is not a review/sync runtime or browser acceptance test.
with expected(t) as (select unnest(${sqlArray(tables)})), tables as (
 select e.t,c.oid,c.relrowsecurity from expected e left join pg_catalog.pg_namespace n on n.nspname='public'
 left join pg_catalog.pg_class c on c.relnamespace=n.oid and c.relname=e.t and c.relkind='r'
), function_expected(signature,definer,browser) as (values
 ${functions.map(f=>`(${literal(f[0])},${f[1]},${f[2]})`).join(',\n ')}
), functions as (
 select f.*,p.oid,p.prosecdef,p.proowner,p.proconfig,p.prosrc,l.lanname from function_expected f
 left join pg_catalog.pg_proc p on p.oid=to_regprocedure(f.signature)
 left join pg_catalog.pg_language l on l.oid=p.prolang
), trigger_expected(t,name,signature,event_mask) as (values
 ('review_items','validate_review_target','private.validate_review_target()',23),
 ('vocabulary','vocabulary_enters_srs','private.create_review_item()',5),
 ('saved_sentences','sentences_enter_srs','private.create_review_item()',5),
 ('user_grammar_progress','grammar_enters_srs','private.create_grammar_review()',5)
), stored_rows(t,oid,rows) as (
 ${tables.map(t=>`select ${literal(t)},'public.${t}'::regclass::oid,count(*) from public.${t}`).join('\n union all ')}
), problems(kind,detail) as (
 select 'missing_table',t from tables where oid is null
 union all select 'rls_disabled',t from tables where oid is not null and not relrowsecurity
 union all select 'unexpected_table',c.relname::text from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind in ('r','p') and not exists(select 1 from expected e where e.t=c.relname)
 union all select 'browser_table_privilege',t.t||':'||r.role_name||':'||v.privilege from tables t
  cross join (values('anon'),('authenticated')) r(role_name)
  cross join (values('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) v(privilege)
  where t.oid is not null and has_table_privilege(r.role_name,t.oid,v.privilege)
 union all select 'invalid_function',signature from functions where oid is null or prosecdef is distinct from definer
  or lanname is distinct from 'plpgsql' or pg_get_userbyid(proowner) is distinct from 'postgres'
  or not exists(select 1 from unnest(proconfig) s where split_part(s,'=',1)='search_path'
   and trim(split_part(s,'=',2),E' \'"')='')
 union all select 'invalid_function_grant',f.signature||':'||r.role_name from functions f
  cross join (values('anon'),('authenticated')) r(role_name) where f.oid is not null
   and has_function_privilege(r.role_name,f.oid,'EXECUTE') is distinct from (f.browser and r.role_name='authenticated')
 union all select 'missing_rpc_owner_guard',signature from functions where browser
  and position('is_private_owner'in coalesce(prosrc,''))=0
 union all select 'invalid_trigger',x.t||':'||x.name from trigger_expected x where not exists(
  select 1 from pg_catalog.pg_trigger g where g.tgrelid=to_regclass('public.'||x.t) and g.tgname=x.name
   and g.tgfoid=to_regprocedure(x.signature) and g.tgtype=x.event_mask and g.tgenabled='O'
 )
 union all select 'missing_review_idempotency_constraint','review_logs(user_id,client_event_id)' where not exists(
  select 1 from pg_catalog.pg_constraint c where c.conrelid='public.review_logs'::regclass and c.contype='u' and c.convalidated
   and (select array_agg(a.attname::text order by k.ord) from unnest(c.conkey) with ordinality k(num,ord)
    join pg_catalog.pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.num)=array['user_id','client_event_id']
 )
 union all select 'missing_sync_idempotency_constraint','sync_batches(user_id,batch_id)' where not exists(
  select 1 from pg_catalog.pg_constraint c where c.conrelid='public.sync_batches'::regclass and c.contype='p' and c.convalidated
   and (select array_agg(a.attname::text order by k.ord) from unnest(c.conkey) with ordinality k(num,ord)
    join pg_catalog.pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.num)=array['user_id','batch_id']
 )
)
select jsonb_build_object(
 'migration_versions',(select jsonb_agg(version order by version) from supabase_migrations.schema_migrations),
 'migration_003_recorded',exists(select 1 from supabase_migrations.schema_migrations where version='003' and name='sync_and_srs'),
 'expected_tables',41,'found_tables',(select count(*) from tables where oid is not null),
 'expected_functions',8,'found_functions',(select count(*) from functions where oid is not null),
 'problems',coalesce((select jsonb_agg(jsonb_build_object('check',kind,'detail',detail) order by kind,detail) from problems),'[]'::jsonb),
 'existing_tables_preserved',coalesce((select jsonb_object_agg(t,jsonb_build_object('oid',oid,'rows',rows)) from stored_rows)=
  (select substring(statements[3] from 'table_oid_and_rows=([^\n]+)')::jsonb from supabase_migrations.schema_migrations where version='003'),false),
 'policies_unchanged',coalesce(md5((${policyQuery})::text)=
  (select substring(statements[4] from 'policies_catalog_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations where version='003'),false),
 'auth_functions_unchanged',coalesce(md5((${protectedQuery})::text)=
  (select substring(statements[4] from 'protected_functions_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations where version='003'),false),
 'installed_functions_unchanged',coalesce(md5((${functionQuery})::text)=
  (select substring(statements[4] from 'installed_functions_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations where version='003'),false),
 'owner_configured',(select count(*)=1 and bool_and(email=${literal(email)}) from private.app_owner),
 'owner_table_rls',(select relrowsecurity from pg_catalog.pg_class where oid='private.app_owner'::regclass),
 'browser_private_schema_access',has_schema_privilege('anon','private','USAGE') or has_schema_privilege('authenticated','private','USAGE'),
 'browser_owner_table_access',exists(select 1 from (values('anon'),('authenticated')) r(role_name)
  cross join (values('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) v(privilege)
  where has_table_privilege(r.role_name,'private.app_owner',v.privilege)),
 'private_buckets',(select count(*) from storage.buckets where id in ('personal-audio','personal-backups','personal-content') and not public),
 'auth_profile_trigger_present',exists(select 1 from pg_catalog.pg_trigger where tgrelid='auth.users'::regclass
  and tgname='on_auth_user_created' and tgfoid=to_regprocedure('public.create_user_profile()') and tgtype=5 and tgenabled='O'),
 'signup_guard_present',exists(select 1 from pg_catalog.pg_trigger where tgrelid='auth.users'::regclass
  and tgname='allow_private_owner_only' and tgfoid=to_regprocedure('private.guard_owner_signup()') and tgtype=7 and tgenabled='O'),
 'storage_rls',(select relrowsecurity from pg_catalog.pg_class where oid='storage.objects'::regclass),
 'ledger_rls',(select relrowsecurity from pg_catalog.pg_class where oid='supabase_migrations.schema_migrations'::regclass),
 'browser_ledger_schema_access',has_schema_privilege('anon','supabase_migrations','USAGE') or has_schema_privilege('authenticated','supabase_migrations','USAGE'),
 'rls_helper_unchanged',coalesce((select md5(to_jsonb(p)::text) from pg_catalog.pg_proc p where p.oid=to_regprocedure('public.rls_auto_enable()'))=
  (select substring(statements[2] from 'helper_catalog_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations where version='003'),false),
 'ensure_rls_unchanged',coalesce((select md5(to_jsonb(e)::text) from pg_catalog.pg_event_trigger e where e.evtname='ensure_rls')=
  (select substring(statements[2] from 'ensure_rls_catalog_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations where version='003'),false)
) as migration_003_verification;
`;
writeFileSync(new URL('supabase/dashboard/003_verify.sql',root),verify);
console.log('Prepared only 003_deploy.sql and 003_verify.sql; no database connection or execution.');
