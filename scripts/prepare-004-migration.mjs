import {readFileSync,writeFileSync} from 'node:fs';

const root=new URL('../',import.meta.url);
const migration=readFileSync(new URL('supabase/migrations/004_ai_requests_and_content.sql',root),'utf8').trim();
const checkpoint=readFileSync(new URL('supabase/dashboard/003_verify.sql',root),'utf8');
const tables=[...checkpoint.split('])), tables as',1)[0].matchAll(/'([a-z_]+)'/g)].map(m=>m[1]).sort();
const email=process.env.ALLOWED_USER_EMAIL?.trim().toLowerCase();
if(!email||!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email))throw new Error('Set ALLOWED_USER_EMAIL in the server environment.');
if(tables.length!==41||new Set(tables).size!==41||migration.includes('$migration_004$'))throw new Error('Unexpected migration inventory or delimiter.');
const literal=v=>`'${v.replaceAll("'","''")}'`;
const sqlArray=v=>`array[${v.map(literal).join(',')}]`;
const protectedFunctions=['public.create_user_profile()','public.configure_private_owner(text)','public.is_private_owner()','public.consume_ai_request(uuid)','private.guard_owner_signup()','private.touch_updated_at()'];
const priorFunctions=['public.record_review(uuid,uuid,text,timestamptz,integer)','public.sync_personal_state(bigint,text,jsonb)','public.personal_progress(text)','private.resolve_id(uuid,text,text)','private.validate_review_target()','private.create_review_item()','private.create_grammar_review()','private.project_state(uuid,jsonb)'];
const functionQuery=signatures=>String.raw`select jsonb_agg(to_jsonb(p) order by p.oid) from pg_catalog.pg_proc p where p.oid in (select to_regprocedure(s) from unnest(${sqlArray(signatures)}) s)`;
const priorQuery=functionQuery(priorFunctions);
const authQuery=functionQuery(protectedFunctions);
const protectedQuery=functionQuery([...protectedFunctions,...priorFunctions]);
const policyQuery=`select jsonb_agg(to_jsonb(p) order by p.schemaname,p.tablename,p.policyname) from pg_catalog.pg_policies p where (p.schemaname='public' and p.tablename<>'ai_requests') or (p.schemaname='storage' and p.tablename='objects')`;
const claimQuery=`select to_jsonb(p) from pg_catalog.pg_proc p where p.oid=to_regprocedure('public.claim_ai_request(uuid)')`;
const claimPolicyQuery=`select jsonb_agg(to_jsonb(p) order by p.policyname) from pg_catalog.pg_policies p where p.schemaname='public' and p.tablename='ai_requests'`;
const contentTables=['grammar','grammar_relations','grammar_examples','articles','listening_episodes'];
const deltas={grammar:3,grammar_relations:1,grammar_examples:2,articles:2,listening_episodes:2};
const seedIds={
 grammar:['10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003'],
 articles:['20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002'],
 listening_episodes:['30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002']
};
const seedRows=Object.entries(seedIds).map(([t,ids])=>`select ${literal(t)} as t,id::text as id,to_jsonb(x) as data from public.${t} x where id::text=any(${sqlArray(ids)})`).join('\n union all ');
// Qualify derived columns: the deployment DO block also declares a loop variable t.
// Bare t here raises SQLSTATE 42702 when the ledger INSERT is compiled.
const seedQuery=`select jsonb_agg(jsonb_build_object('table',q.t,'data',q.data) order by q.t,q.id) from (${seedRows}) q`;
const conflictChecks=Object.entries(seedIds).map(([t,ids])=>`exists(select 1 from public.${t} where id::text=any(${sqlArray(ids)}))`).join('\n  or ');
const entry=String.raw`-- Only migration 004. Run this WHOLE file once as postgres, after 003 passes.
-- Creates one table/RPC and inserts existing starter content. Does not call AI.
begin;
set local lock_timeout='5s';
set local statement_timeout='120s';
do $deploy_004$
declare
 migration_sql text:=$migration_004$
${migration}
$migration_004$;
 expected_tables text[]:=${sqlArray(tables)};
 content_tables text[]:=${sqlArray(contentTables)};
 row_deltas jsonb:=${literal(JSON.stringify(deltas))}::jsonb;
 helper_before jsonb;event_before jsonb;protected_before jsonb;policies_before jsonb;
 data_before jsonb:='{}'::jsonb;content_before jsonb:='{}'::jsonb;
 fingerprint jsonb;t text;row_count bigint;
begin
 perform pg_advisory_xact_lock(hashtext('kotoba-dashboard-migrations'));
 if current_user<>'postgres' then raise exception 'Use postgres in SQL Editor';end if;
 if to_regclass('supabase_migrations.schema_migrations') is null then raise exception 'Missing migration ledger';end if;
 if (select array_agg(version order by version) from supabase_migrations.schema_migrations) is distinct from array['001','002','003']
  or not exists(select 1 from supabase_migrations.schema_migrations where version='003' and name='sync_and_srs') then
  raise exception 'Expected only verified migrations 001, 002 and 003';end if;
 if (select array_agg(c.relname::text order by c.relname::text) from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind in ('r','p')) is distinct from expected_tables then
  raise exception 'Public table inventory differs from verified 003';end if;
 if to_regprocedure('public.claim_ai_request(uuid)') is not null then raise exception '004 RPC already exists; do not overwrite or repeat';end if;
 if (select count(*) from private.app_owner)<>1 or not exists(select 1 from private.app_owner where email=${literal(email)}) then
  raise exception 'Private owner email differs from server configuration';end if;
 lock table auth.users in share row exclusive mode;
 lock table ${tables.map(t=>`public.${t}`).join(',')},private.app_owner in share row exclusive mode;
 if exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  where ((n.nspname='public' and c.relkind in ('r','p')) or c.oid='private.app_owner'::regclass) and not c.relrowsecurity)
  or exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
   cross join (values('anon'),('authenticated')) r(role_name)
   cross join (values('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) v(privilege)
   where ((n.nspname='public' and c.relkind in ('r','p')) or c.oid='private.app_owner'::regclass) and has_table_privilege(r.role_name,c.oid,v.privilege)) then
  raise exception 'Checkpoint 003 RLS or closed table privileges have changed';end if;
 if has_schema_privilege('anon','private','USAGE') or has_schema_privilege('authenticated','private','USAGE') then
  raise exception 'Private schema is accessible to a browser role';end if;
 if (select count(*) from storage.buckets where id in ('personal-audio','personal-backups','personal-content') and not public)<>3 then
  raise exception 'Managed Storage buckets must be private';end if;
 select to_jsonb(p) into helper_before from pg_catalog.pg_proc p where p.oid=to_regprocedure('public.rls_auto_enable()');
 select to_jsonb(e) into event_before from pg_catalog.pg_event_trigger e where e.evtname='ensure_rls';
 if helper_before is null or event_before is null
  or md5(helper_before::text) is distinct from (select substring(statements[2] from 'helper_catalog_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations where version='003')
  or md5(event_before::text) is distinct from (select substring(statements[2] from 'ensure_rls_catalog_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations where version='003') then
  raise exception 'Existing RLS helper differs from verified 003';end if;
 if md5((${authQuery})::text) is distinct from (select substring(statements[4] from 'protected_functions_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations where version='003')
  or md5((${priorQuery})::text) is distinct from (select substring(statements[4] from 'installed_functions_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations where version='003')
  or md5((${policyQuery})::text) is distinct from (select substring(statements[4] from 'policies_catalog_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations where version='003') then
  raise exception 'Auth, SRS/sync functions or policies differ from verified 003';end if;
 if not exists(select 1 from pg_catalog.pg_trigger where tgrelid='auth.users'::regclass and tgname='on_auth_user_created'
  and tgfoid=to_regprocedure('public.create_user_profile()') and tgtype=5 and tgenabled='O')
  or not exists(select 1 from pg_catalog.pg_trigger where tgrelid='auth.users'::regclass and tgname='allow_private_owner_only'
   and tgfoid=to_regprocedure('private.guard_owner_signup()') and tgtype=7 and tgenabled='O') then
  raise exception 'Auth triggers differ from verified 003';end if;
 -- Never overwrite a personalized row or silently accept a conflicting stable ID.
 if ${conflictChecks}
  or exists(select 1 from public.grammar where (language_code,title) in (('ja','〜わけではない'),('ja','〜とは限らない'),('en','The present perfect'))) then
  raise exception 'Starter content identity already exists; stop and inspect before deploying';end if;
 select (${protectedQuery}) into protected_before;
 select (${policyQuery}) into policies_before;
 foreach t in array expected_tables loop
  execute format('select count(*) from public.%I',t) into row_count;
  data_before:=data_before||jsonb_build_object(t,jsonb_build_object('oid',to_regclass(format('public.%I',t))::oid,'rows',row_count));
 end loop;
 foreach t in array content_tables loop
  execute format('select coalesce(jsonb_object_agg(id::text,md5(to_jsonb(x)::text)),''{}''::jsonb) from public.%I x',t) into fingerprint;
  content_before:=content_before||jsonb_build_object(t,fingerprint);
 end loop;

 execute migration_sql;

 foreach t in array expected_tables loop
  execute format('select count(*) from public.%I',t) into row_count;
  if (data_before->t->>'oid')::oid is distinct from to_regclass(format('public.%I',t))::oid
   or row_count<>(data_before->t->>'rows')::bigint+coalesce((row_deltas->>t)::int,0) then
   raise exception 'Unexpected table identity or row-count change in %; rollback',t;end if;
 end loop;
 foreach t in array content_tables loop
  execute format('select coalesce(jsonb_object_agg(id::text,md5(to_jsonb(x)::text)),''{}''::jsonb) from public.%I x where $1 ? id::text',t)
   into fingerprint using content_before->t;
  if fingerprint is distinct from content_before->t then raise exception 'Existing content changed in %; rollback',t;end if;
 end loop;
 if (select count(*) from public.ai_requests)<>0 then raise exception 'Unexpected AI request execution during deployment';end if;
 if not (select relrowsecurity from pg_catalog.pg_class where oid='public.ai_requests'::regclass)
  or exists(select 1 from (values('anon'),('authenticated')) r(role_name)
   cross join (values('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) v(privilege)
   where has_table_privilege(r.role_name,'public.ai_requests',v.privilege)) then
  raise exception 'New AI table RLS or closed privileges are invalid; rollback';end if;
 if has_function_privilege('anon','public.claim_ai_request(uuid)','EXECUTE')
  or not has_function_privilege('authenticated','public.claim_ai_request(uuid)','EXECUTE') then
  raise exception 'New AI RPC browser permissions are invalid; rollback';end if;
 if protected_before is distinct from (${protectedQuery}) or policies_before is distinct from (${policyQuery}) then
  raise exception 'Existing functions or RLS policies changed; rollback';end if;
 if helper_before is distinct from (${`select to_jsonb(p) from pg_catalog.pg_proc p where p.oid=to_regprocedure('public.rls_auto_enable()')`})
  or event_before is distinct from (select to_jsonb(e) from pg_catalog.pg_event_trigger e where e.evtname='ensure_rls') then
  raise exception 'Existing RLS helper changed; rollback';end if;
 insert into supabase_migrations.schema_migrations(version,name,statements) values('004','ai_requests_and_content',array[
  migration_sql,
  format(E'-- helper_catalog_md5=%s; ensure_rls_catalog_md5=%s\n',md5(helper_before::text),md5(event_before::text)),
  jsonb_build_object('tables',data_before,'content',content_before,'deltas',row_deltas)::text,
  jsonb_build_object('policies',md5(policies_before::text),'protected_functions',md5(protected_before::text),
   'claim_function',md5((${claimQuery})::text),'claim_policy',md5((${claimPolicyQuery})::text),'starter_content',md5((${seedQuery})::text))::text
 ]);
end;
$deploy_004$;
commit;
select version,name from supabase_migrations.schema_migrations order by version;
`;
writeFileSync(new URL('supabase/dashboard/004_deploy.sql',root),entry);

const allTables=[...tables,'ai_requests'].sort();
const storedRows=tables.map(t=>`select ${literal(t)} as t,'public.${t}'::regclass::oid as oid,count(*) as rows from public.${t}`).join('\n union all ');
const currentContent=contentTables.map(t=>`select ${literal(t)} as t,coalesce(jsonb_object_agg(x.id::text,md5(to_jsonb(x)::text)),'{}'::jsonb) as fingerprint from public.${t} x where (select statements[3]::jsonb#>array['content',${literal(t)}] from supabase_migrations.schema_migrations where version='004') ? x.id::text`).join('\n union all ');
const verify=String.raw`-- Read-only verification AFTER 004_deploy.sql succeeds, as postgres.
-- Does not call AI/RPCs, change roles, or insert test data.
with expected(t) as (select unnest(${sqlArray(allTables)})), tables as (
 select e.t,c.oid,c.relrowsecurity from expected e left join pg_catalog.pg_namespace n on n.nspname='public'
 left join pg_catalog.pg_class c on c.relnamespace=n.oid and c.relname=e.t and c.relkind='r'
), ledger as (
 select statements[3]::jsonb as snapshot,statements[4]::jsonb as hashes from supabase_migrations.schema_migrations where version='004'
), stored_rows as (
 ${storedRows}
), content_preservation as (
 ${currentContent}
), seed_rows as (${seedRows}), problems(kind,detail) as (
 select 'missing_table',t from tables where oid is null
 union all select 'rls_disabled',t from tables where oid is not null and not relrowsecurity
 union all select 'unexpected_table',c.relname::text from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind in ('r','p') and not exists(select 1 from expected e where e.t=c.relname)
 union all select 'browser_table_privilege',t.t||':'||r.role_name||':'||v.privilege from tables t
  cross join (values('anon'),('authenticated')) r(role_name)
  cross join (values('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) v(privilege)
  where t.oid is not null and has_table_privilege(r.role_name,t.oid,v.privilege)
 union all select 'invalid_claim_function','public.claim_ai_request(uuid)' where not exists(
  select 1 from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
  where p.oid=to_regprocedure('public.claim_ai_request(uuid)') and p.prosecdef and l.lanname='plpgsql'
   and pg_get_userbyid(p.proowner)='postgres' and position('is_private_owner' in p.prosrc)>0
   and position('auth.uid()' in p.prosrc)>0 and position('p_request is null' in p.prosrc)>0
   and exists(select 1 from unnest(p.proconfig) s where split_part(s,'=',1)='search_path' and trim(split_part(s,'=',2),E' \'"')='')
 )
 union all select 'invalid_claim_grant',r.role_name from (values('anon'),('authenticated')) r(role_name)
  where to_regprocedure('public.claim_ai_request(uuid)') is not null
   and has_function_privilege(r.role_name,to_regprocedure('public.claim_ai_request(uuid)'),'EXECUTE') is distinct from (r.role_name='authenticated')
 union all select 'invalid_ai_policy','ai_requests:owner_read' where (select count(*) from pg_catalog.pg_policies where schemaname='public' and tablename='ai_requests')<>1 or not exists(
  select 1 from pg_catalog.pg_policies p where p.schemaname='public' and p.tablename='ai_requests'
   and p.policyname='owner_read' and p.cmd='SELECT' and p.roles=array['authenticated']::name[] and p.with_check is null
   and position('is_private_owner' in p.qual)>0 and position('user_id' in p.qual)>0 and position('auth.uid()' in p.qual)>0
 )
 union all select 'invalid_ai_primary_key','ai_requests(user_id,request_id)' where not exists(
  select 1 from pg_catalog.pg_constraint c where c.conrelid='public.ai_requests'::regclass and c.contype='p' and c.convalidated
   and (select array_agg(a.attname::text order by k.ord) from unnest(c.conkey) with ordinality k(num,ord)
    join pg_catalog.pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.num)=array['user_id','request_id']
 )
 union all select 'invalid_ai_user_fk','ai_requests.user_id -> auth.users.id' where not exists(
  select 1 from pg_catalog.pg_constraint c where c.conrelid='public.ai_requests'::regclass and c.contype='f' and c.convalidated
   and c.confrelid='auth.users'::regclass and c.confdeltype='c'
   and c.conkey=array[(select attnum from pg_catalog.pg_attribute where attrelid=c.conrelid and attname='user_id')]::smallint[]
   and c.confkey=array[(select attnum from pg_catalog.pg_attribute where attrelid=c.confrelid and attname='id')]::smallint[]
 )
 union all select 'invalid_ai_status_constraint','pending / complete / failed' where not exists(
  select 1 from pg_catalog.pg_constraint c where c.conrelid='public.ai_requests'::regclass and c.contype='c' and c.convalidated
   and pg_get_constraintdef(c.oid) like '%status%' and pg_get_constraintdef(c.oid) like '%pending%'
   and pg_get_constraintdef(c.oid) like '%complete%' and pg_get_constraintdef(c.oid) like '%failed%'
 )
 union all select 'invalid_ai_column',x.name from (values('user_id','uuid',true),('request_id','uuid',true),('status','text',true),('response','jsonb',false),('started_at','timestamp with time zone',true),('completed_at','timestamp with time zone',false)) x(name,type,not_null)
  where not exists(select 1 from pg_catalog.pg_attribute a where a.attrelid='public.ai_requests'::regclass and a.attname=x.name and not a.attisdropped and format_type(a.atttypid,a.atttypmod)=x.type and a.attnotnull=x.not_null)
 union all select 'invalid_starter_content',s.t||':'||s.id from seed_rows s where length(coalesce(s.data->>'title',''))=0
  or s.data->>'language_code' not in ('en','ja')
  or (s.t='grammar' and (length(coalesce(s.data->>'structure',''))=0 or length(coalesce(s.data->>'meaning_zh',''))=0))
  or (s.t='articles' and (length(coalesce(s.data->>'content',''))=0 or length(coalesce(s.data->>'translation_zh',''))=0))
  or (s.t='listening_episodes' and (jsonb_typeof(s.data->'transcript') is distinct from 'array'
   or case when jsonb_typeof(s.data->'transcript')='array' then jsonb_array_length(s.data->'transcript')<>5 else true end))
)
select jsonb_build_object(
 'migration_versions',(select jsonb_agg(version order by version) from supabase_migrations.schema_migrations),
 'migration_004_recorded',exists(select 1 from supabase_migrations.schema_migrations where version='004' and name='ai_requests_and_content'),
 'expected_tables',42,'found_tables',(select count(*) from tables where oid is not null),
 'ai_requests_rls',(select relrowsecurity from pg_catalog.pg_class where oid='public.ai_requests'::regclass),
 'browser_ai_table_access',exists(select 1 from (values('anon'),('authenticated')) r(role_name)
  cross join (values('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) v(privilege) where has_table_privilege(r.role_name,'public.ai_requests',v.privilege)),
 'problems',coalesce((select jsonb_agg(jsonb_build_object('check',kind,'detail',detail) order by kind,detail) from problems),'[]'::jsonb),
 'existing_tables_preserved',coalesce((select bool_and(s.oid=(l.snapshot#>>array['tables',s.t,'oid'])::oid
   and s.rows=(l.snapshot#>>array['tables',s.t,'rows'])::bigint+coalesce((l.snapshot#>>array['deltas',s.t])::int,0)) from stored_rows s cross join ledger l),false),
 'existing_content_preserved',coalesce((select bool_and(c.fingerprint=l.snapshot#>array['content',c.t]) from content_preservation c cross join ledger l),false),
 'starter_content_unchanged',coalesce(md5((${seedQuery})::text)=(select hashes->>'starter_content' from ledger),false),
 'starter_grammar',(select count(*) from public.grammar where id::text=any(${sqlArray(seedIds.grammar)})),
 'starter_articles',(select count(*) from public.articles where id::text=any(${sqlArray(seedIds.articles)})),
 'starter_listening',(select count(*) from public.listening_episodes where id::text=any(${sqlArray(seedIds.listening_episodes)})),
 'starter_relation_present',exists(select 1 from public.grammar_relations where grammar_id='10000000-0000-4000-8000-000000000001' and related_grammar_id='10000000-0000-4000-8000-000000000002' and relation_type='often_confused'),
 'starter_examples_present',(select count(*)=2 from public.grammar_examples where (grammar_id,sentence) in
  (('10000000-0000-4000-8000-000000000001'::uuid,'日本人だからといって、みんな寿司が好きなわけではない。'),('10000000-0000-4000-8000-000000000003'::uuid,'I have lived in Tokyo for three years.'))),
 'prior_policies_unchanged',coalesce(md5((${policyQuery})::text)=(select hashes->>'policies' from ledger),false),
 'prior_functions_unchanged',coalesce(md5((${protectedQuery})::text)=(select hashes->>'protected_functions' from ledger),false),
 'claim_function_unchanged',coalesce(md5((${claimQuery})::text)=(select hashes->>'claim_function' from ledger),false),
 'claim_policy_unchanged',coalesce(md5((${claimPolicyQuery})::text)=(select hashes->>'claim_policy' from ledger),false),
 'owner_configured',(select count(*)=1 and bool_and(email=${literal(email)}) from private.app_owner),
 'owner_table_rls',(select relrowsecurity from pg_catalog.pg_class where oid='private.app_owner'::regclass),
 'browser_private_schema_access',has_schema_privilege('anon','private','USAGE') or has_schema_privilege('authenticated','private','USAGE'),
 'browser_owner_table_access',exists(select 1 from (values('anon'),('authenticated')) r(role_name)
  cross join (values('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) v(privilege) where has_table_privilege(r.role_name,'private.app_owner',v.privilege)),
 'private_buckets',(select count(*) from storage.buckets where id in ('personal-audio','personal-backups','personal-content') and not public),
 'auth_profile_trigger_present',exists(select 1 from pg_catalog.pg_trigger where tgrelid='auth.users'::regclass and tgname='on_auth_user_created' and tgfoid=to_regprocedure('public.create_user_profile()') and tgtype=5 and tgenabled='O'),
 'signup_guard_present',exists(select 1 from pg_catalog.pg_trigger where tgrelid='auth.users'::regclass and tgname='allow_private_owner_only' and tgfoid=to_regprocedure('private.guard_owner_signup()') and tgtype=7 and tgenabled='O'),
 'storage_rls',(select relrowsecurity from pg_catalog.pg_class where oid='storage.objects'::regclass),
 'ledger_rls',(select relrowsecurity from pg_catalog.pg_class where oid='supabase_migrations.schema_migrations'::regclass),
 'browser_ledger_schema_access',has_schema_privilege('anon','supabase_migrations','USAGE') or has_schema_privilege('authenticated','supabase_migrations','USAGE'),
 'rls_helper_unchanged',coalesce((select md5(to_jsonb(p)::text) from pg_catalog.pg_proc p where p.oid=to_regprocedure('public.rls_auto_enable()'))=
  (select substring(statements[2] from 'helper_catalog_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations where version='004'),false),
 'ensure_rls_unchanged',coalesce((select md5(to_jsonb(e)::text) from pg_catalog.pg_event_trigger e where e.evtname='ensure_rls')=
  (select substring(statements[2] from 'ensure_rls_catalog_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations where version='004'),false)
) as migration_004_verification;
`;
writeFileSync(new URL('supabase/dashboard/004_verify.sql',root),verify);
console.log('Prepared only 004_deploy.sql and 004_verify.sql; no database connection or execution.');
