import {readFileSync,writeFileSync} from 'node:fs';

const root=new URL('../',import.meta.url);
const migration=readFileSync(new URL('supabase/migrations/005_hardening_and_projection.sql',root),'utf8').trim();
const checkpoint=readFileSync(new URL('supabase/dashboard/004_verify.sql',root),'utf8');
const tables=[...checkpoint.split('])), tables as',1)[0].matchAll(/'([a-z_]+)'/g)].map(m=>m[1]).sort();
const email=process.env.ALLOWED_USER_EMAIL?.trim().toLowerCase();
if(!email||!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email))throw new Error('Set ALLOWED_USER_EMAIL in the server environment.');
if(tables.length!==42||new Set(tables).size!==42||migration.includes('$migration_005$'))throw new Error('Unexpected migration inventory or delimiter.');
const literal=v=>`'${v.replaceAll("'","''")}'`;
const sqlArray=v=>`array[${v.map(literal).join(',')}]`;
const priorFunctions=['public.create_user_profile()','public.configure_private_owner(text)','public.is_private_owner()','public.consume_ai_request(uuid)','private.guard_owner_signup()','private.touch_updated_at()','public.record_review(uuid,uuid,text,timestamptz,integer)','public.sync_personal_state(bigint,text,jsonb)','public.personal_progress(text)','private.resolve_id(uuid,text,text)','private.validate_review_target()','private.create_review_item()','private.create_grammar_review()','private.project_state(uuid,jsonb)'];
const functionQuery=signatures=>`select jsonb_agg(to_jsonb(p) order by p.oid) from pg_catalog.pg_proc p where p.oid in (select to_regprocedure(s) from unnest(${sqlArray(signatures)}) s)`;
const oldFunctionQuery=functionQuery(priorFunctions);
const functionSnapshot=functionQuery([...priorFunctions,'public.claim_ai_request(uuid)']);
const oldPolicyQuery=`select jsonb_agg(to_jsonb(p) order by p.schemaname,p.tablename,p.policyname) from pg_catalog.pg_policies p where (p.schemaname='public' and p.tablename<>'ai_requests') or (p.schemaname='storage' and p.tablename='objects')`;
const claimQuery=`select to_jsonb(p) from pg_catalog.pg_proc p where p.oid=to_regprocedure('public.claim_ai_request(uuid)')`;
const claimPolicyQuery=`select jsonb_agg(to_jsonb(p) order by p.policyname) from pg_catalog.pg_policies p where p.schemaname='public' and p.tablename='ai_requests'`;
const policySnapshot=`select jsonb_agg(to_jsonb(p) order by p.schemaname,p.tablename,p.policyname) from pg_catalog.pg_policies p where p.schemaname='public' or (p.schemaname='storage' and p.tablename='objects')`;
const triggerSnapshot=`select jsonb_agg(to_jsonb(g) order by g.oid) from pg_catalog.pg_trigger g join pg_catalog.pg_class c on c.oid=g.tgrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace where not g.tgisinternal and (n.nspname='public' or g.tgrelid='auth.users'::regclass) and not (g.tgrelid='public.user_progress'::regclass and g.tgname='validate_personal_snapshot')`;
const validatorSnapshot=`select to_jsonb(p) from pg_catalog.pg_proc p where p.oid=to_regprocedure('private.validate_personal_snapshot()')`;
const constraintSnapshot=`select jsonb_agg(to_jsonb(c) order by c.oid) from pg_catalog.pg_constraint c where (c.conrelid='public.user_progress'::regclass and c.conname='bounded_personal_snapshot') or (c.conrelid='public.mistakes'::regclass and c.conname='mistakes_vocabulary_owner')`;
const fkColumns=(relation,key)=>`select array_agg(a.attname::text order by k.ord) from unnest(c.${key}) with ordinality k(num,ord) join pg_catalog.pg_attribute a on a.attrelid=c.${relation} and a.attnum=k.num`;
const fkShape=`c.contype='f' and c.convalidated and c.confrelid='public.vocabulary'::regclass and (${fkColumns('conrelid','conkey')})=array['vocabulary_id','user_id'] and (${fkColumns('confrelid','confkey')})=array['id','user_id']`;
const entry=String.raw`-- Only migration 005. Run this WHOLE file once as postgres, after 004 passes.
-- Replaces two constraints. Does not delete or rewrite learning records.
begin;
set local lock_timeout='5s';
set local statement_timeout='120s';
do $deploy_005$
declare
 v_sql text:=$migration_005$
${migration}
$migration_005$;
 v_tables text[]:=${sqlArray(tables)};
 v_table text;v_rows bigint;v_digest text;
 v_before jsonb:='{}'::jsonb;v_after jsonb:='{}'::jsonb;
 v_helper jsonb;v_event jsonb;v_functions jsonb;v_policies jsonb;v_triggers jsonb;
begin
 perform pg_advisory_xact_lock(hashtext('kotoba-dashboard-migrations'));
 if current_user<>'postgres' then raise exception 'Use postgres in SQL Editor';end if;
 if (select array_agg(m.version order by m.version) from supabase_migrations.schema_migrations m) is distinct from array['001','002','003','004']
  or not exists(select 1 from supabase_migrations.schema_migrations m where m.version='004' and m.name='ai_requests_and_content') then
  raise exception 'Expected only verified migrations 001 through 004';end if;
 if (select array_agg(c.relname::text order by c.relname::text) from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind in ('r','p')) is distinct from v_tables then
  raise exception 'Public table inventory differs from verified 004';end if;
 if (select count(*) from private.app_owner)<>1 or not exists(select 1 from private.app_owner o where o.email=${literal(email)}) then
  raise exception 'Private owner configuration differs';end if;
 if current_setting('server_version_num')::int<150000 then raise exception 'This foreign-key action requires PostgreSQL 15 or newer';end if;
 lock table auth.users in share row exclusive mode;
 lock table ${tables.map(t=>`public.${t}`).join(',')},private.app_owner in share row exclusive mode;
 if exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  where ((n.nspname='public' and c.relkind in ('r','p')) or c.oid='private.app_owner'::regclass) and not c.relrowsecurity)
  or exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
   cross join (values('anon'),('authenticated')) r(role_name)
   cross join (values('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) p(privilege)
   where ((n.nspname='public' and c.relkind in ('r','p')) or c.oid='private.app_owner'::regclass) and has_table_privilege(r.role_name,c.oid,p.privilege)) then
  raise exception 'Checkpoint 004 RLS or closed table privileges changed';end if;
 if has_schema_privilege('anon','private','USAGE') or has_schema_privilege('authenticated','private','USAGE') then raise exception 'Private schema is open to a browser role';end if;
 if (select count(*) from storage.buckets b where b.id in ('personal-audio','personal-backups','personal-content') and not b.public)<>3 then raise exception 'Managed buckets must stay private';end if;
 select to_jsonb(p) into v_helper from pg_catalog.pg_proc p where p.oid=to_regprocedure('public.rls_auto_enable()');
 select to_jsonb(e) into v_event from pg_catalog.pg_event_trigger e where e.evtname='ensure_rls';
 if v_helper is null or v_event is null
  or md5(v_helper::text) is distinct from (select substring(m.statements[2] from 'helper_catalog_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations m where m.version='004')
  or md5(v_event::text) is distinct from (select substring(m.statements[2] from 'ensure_rls_catalog_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations m where m.version='004') then
  raise exception 'RLS helper differs from verified 004';end if;
 if md5((${oldFunctionQuery})::text) is distinct from (select m.statements[4]::jsonb->>'protected_functions' from supabase_migrations.schema_migrations m where m.version='004')
  or md5((${claimQuery})::text) is distinct from (select m.statements[4]::jsonb->>'claim_function' from supabase_migrations.schema_migrations m where m.version='004')
  or md5((${oldPolicyQuery})::text) is distinct from (select m.statements[4]::jsonb->>'policies' from supabase_migrations.schema_migrations m where m.version='004')
  or md5((${claimPolicyQuery})::text) is distinct from (select m.statements[4]::jsonb->>'claim_policy' from supabase_migrations.schema_migrations m where m.version='004') then
  raise exception 'Existing functions or RLS policies differ from verified 004';end if;
 if not exists(select 1 from pg_catalog.pg_constraint c where c.conrelid='public.user_progress'::regclass and c.conname='user_progress_state_check'
  and c.contype='c' and c.convalidated and position('octet_length' in pg_get_constraintdef(c.oid))>0 and position('2097152' in pg_get_constraintdef(c.oid))>0)
  or not exists(select 1 from pg_catalog.pg_constraint c where c.conrelid='public.mistakes'::regclass and c.conname='mistakes_vocabulary_id_user_id_fkey' and ${fkShape} and c.confdeltype='a') then
  raise exception 'Old snapshot or ownership constraint differs; stop and inspect';end if;
 if exists(select 1 from pg_catalog.pg_constraint c where (c.conrelid='public.user_progress'::regclass and c.conname='bounded_personal_snapshot') or (c.conrelid='public.mistakes'::regclass and c.conname='mistakes_vocabulary_owner'))
  or to_regprocedure('private.validate_personal_snapshot()') is not null
  or exists(select 1 from pg_catalog.pg_trigger g where g.tgrelid='public.user_progress'::regclass and g.tgname='validate_personal_snapshot') then
  raise exception 'A 005 object already exists; do not overwrite or repeat';end if;
 if exists(select 1 from public.user_progress u where jsonb_typeof(u.state) is distinct from 'object' or u.state->>'version' is distinct from '2'
  or not u.state ?& array['profile','reviews','dictionary','reviewHistory','sentences','sessions','_clock','_deleted']) then
  raise exception 'Existing snapshots do not match v2; stop and inspect without rewriting data';end if;
 select (${functionSnapshot}) into v_functions;
 select (${policySnapshot}) into v_policies;
 select (${triggerSnapshot}) into v_triggers;
 foreach v_table in array v_tables loop
  execute format('select count(*),md5(coalesce(jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text),''[]''::jsonb)::text) from public.%I x',v_table) into v_rows,v_digest;
  v_before:=v_before||jsonb_build_object(v_table,jsonb_build_object('oid',to_regclass(format('public.%I',v_table))::oid,'rows',v_rows,'content_md5',v_digest));
 end loop;

 execute v_sql;

 foreach v_table in array v_tables loop
  execute format('select count(*),md5(coalesce(jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text),''[]''::jsonb)::text) from public.%I x',v_table) into v_rows,v_digest;
  v_after:=v_after||jsonb_build_object(v_table,jsonb_build_object('oid',to_regclass(format('public.%I',v_table))::oid,'rows',v_rows,'content_md5',v_digest));
 end loop;
 if v_before is distinct from v_after then raise exception 'Existing table identity or learning data changed; rollback';end if;
 if v_functions is distinct from (${functionSnapshot}) or v_policies is distinct from (${policySnapshot}) or v_triggers is distinct from (${triggerSnapshot}) then
  raise exception 'Existing functions, policies or app triggers changed; rollback';end if;
 if v_helper is distinct from (select to_jsonb(p) from pg_catalog.pg_proc p where p.oid=to_regprocedure('public.rls_auto_enable()'))
  or v_event is distinct from (select to_jsonb(e) from pg_catalog.pg_event_trigger e where e.evtname='ensure_rls') then raise exception 'RLS helper changed; rollback';end if;
 if not exists(select 1 from pg_catalog.pg_constraint c where c.conrelid='public.mistakes'::regclass and c.conname='mistakes_vocabulary_owner' and ${fkShape}
  and c.confdeltype='n' and c.confdelsetcols=array[(select a.attnum from pg_catalog.pg_attribute a where a.attrelid=c.conrelid and a.attname='vocabulary_id')]::smallint[]) then
  raise exception 'New foreign key does not preserve user ownership';end if;
 if exists(select 1 from (values('anon'),('authenticated')) r(role_name) where has_function_privilege(r.role_name,'private.validate_personal_snapshot()','EXECUTE')) then
  raise exception 'Private validator is executable by a browser role';end if;
 insert into supabase_migrations.schema_migrations(version,name,statements) values('005','hardening_and_projection',array[
  v_sql,
  format(E'-- helper_catalog_md5=%s; ensure_rls_catalog_md5=%s\n',md5(v_helper::text),md5(v_event::text)),
  v_before::text,
  jsonb_build_object('functions',md5(v_functions::text),'policies',md5(v_policies::text),'triggers',md5(v_triggers::text),
   'validator',md5((${validatorSnapshot})::text),'constraints',md5((${constraintSnapshot})::text))::text
 ]);
end;
$deploy_005$;
commit;
select version,name from supabase_migrations.schema_migrations order by version;
`;
writeFileSync(new URL('supabase/dashboard/005_deploy.sql',root),entry);

const rowQueries=tables.map(t=>`select ${literal(t)} as t,'public.${t}'::regclass::oid as oid,count(*) as rows,md5(coalesce(jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text),'[]'::jsonb)::text) as content_md5 from public.${t} x`).join('\n union all ');
const verify=String.raw`-- Read-only verification after 005 succeeds, as postgres. No RPCs or test writes.
with expected(t) as (select unnest(${sqlArray(tables)})), tables as (
 select e.t,c.oid,c.relrowsecurity from expected e left join pg_catalog.pg_namespace n on n.nspname='public' left join pg_catalog.pg_class c on c.relnamespace=n.oid and c.relname=e.t and c.relkind='r'
), ledger as (select m.statements[3]::jsonb as before_rows,m.statements[4]::jsonb as hashes from supabase_migrations.schema_migrations m where m.version='005'), stored_rows as (
 ${rowQueries}
), problems(kind,detail) as (
 select 'missing_table',t.t from tables t where t.oid is null
 union all select 'rls_disabled',t.t from tables t where t.oid is not null and not t.relrowsecurity
 union all select 'unexpected_table',c.relname::text from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p') and not exists(select 1 from expected e where e.t=c.relname)
 union all select 'browser_table_privilege',t.t||':'||r.role_name||':'||p.privilege from tables t cross join (values('anon'),('authenticated')) r(role_name)
  cross join (values('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) p(privilege) where t.oid is not null and has_table_privilege(r.role_name,t.oid,p.privilege)
 union all select 'old_constraint_remains',c.conname from pg_catalog.pg_constraint c where (c.conrelid='public.user_progress'::regclass and c.conname='user_progress_state_check') or (c.conrelid='public.mistakes'::regclass and c.conname='mistakes_vocabulary_id_user_id_fkey')
 union all select 'invalid_snapshot_bound','bounded_personal_snapshot' where not exists(select 1 from pg_catalog.pg_constraint c where c.conrelid='public.user_progress'::regclass and c.conname='bounded_personal_snapshot' and c.contype='c' and c.convalidated and position('octet_length' in pg_get_constraintdef(c.oid))>0 and position('16777216' in pg_get_constraintdef(c.oid))>0)
 union all select 'invalid_mistake_ownership_fk','mistakes_vocabulary_owner' where not exists(select 1 from pg_catalog.pg_constraint c where c.conrelid='public.mistakes'::regclass and c.conname='mistakes_vocabulary_owner' and ${fkShape}
  and c.confdeltype='n' and c.confdelsetcols=array[(select a.attnum from pg_catalog.pg_attribute a where a.attrelid=c.conrelid and a.attname='vocabulary_id')]::smallint[])
 union all select 'invalid_validator','private.validate_personal_snapshot()' where not exists(select 1 from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang where p.oid=to_regprocedure('private.validate_personal_snapshot()') and not p.prosecdef and pg_get_userbyid(p.proowner)='postgres' and l.lanname='plpgsql'
  and exists(select 1 from unnest(p.proconfig) s where split_part(s,'=',1)='search_path' and trim(split_part(s,'=',2),E' \'"')=''))
 union all select 'validator_browser_execute',r.role_name from (values('anon'),('authenticated')) r(role_name) where to_regprocedure('private.validate_personal_snapshot()') is not null and has_function_privilege(r.role_name,to_regprocedure('private.validate_personal_snapshot()'),'EXECUTE')
 union all select 'invalid_validator_trigger','user_progress.validate_personal_snapshot' where not exists(select 1 from pg_catalog.pg_trigger g where g.tgrelid='public.user_progress'::regclass and g.tgname='validate_personal_snapshot' and g.tgfoid=to_regprocedure('private.validate_personal_snapshot()') and g.tgtype=23 and g.tgenabled='O'
  and (select array_agg(x.num order by x.ord) from unnest(g.tgattr::smallint[]) with ordinality x(num,ord))=array[(select a.attnum from pg_catalog.pg_attribute a where a.attrelid=g.tgrelid and a.attname='state')]::smallint[])
)
select jsonb_build_object(
 'migration_versions',(select jsonb_agg(m.version order by m.version) from supabase_migrations.schema_migrations m),
 'migration_005_recorded',exists(select 1 from supabase_migrations.schema_migrations m where m.version='005' and m.name='hardening_and_projection'),
 'expected_tables',42,'found_tables',(select count(*) from tables t where t.oid is not null),
 'problems',coalesce((select jsonb_agg(jsonb_build_object('check',p.kind,'detail',p.detail) order by p.kind,p.detail) from problems p),'[]'::jsonb),
 'existing_tables_and_data_preserved',coalesce((select jsonb_object_agg(s.t,jsonb_build_object('oid',s.oid,'rows',s.rows,'content_md5',s.content_md5)) from stored_rows s)=(select l.before_rows from ledger l),false),
 'prior_functions_unchanged',coalesce(md5((${functionSnapshot})::text)=(select l.hashes->>'functions' from ledger l),false),
 'prior_policies_unchanged',coalesce(md5((${policySnapshot})::text)=(select l.hashes->>'policies' from ledger l),false),
 'prior_app_triggers_unchanged',coalesce(md5((${triggerSnapshot})::text)=(select l.hashes->>'triggers' from ledger l),false),
 'validator_unchanged',coalesce(md5((${validatorSnapshot})::text)=(select l.hashes->>'validator' from ledger l),false),
 'constraints_unchanged',coalesce(md5((${constraintSnapshot})::text)=(select l.hashes->>'constraints' from ledger l),false),
 'snapshot_limit_bytes',16777216,
 'mistake_user_id_not_null',(select a.attnotnull from pg_catalog.pg_attribute a where a.attrelid='public.mistakes'::regclass and a.attname='user_id'),
 'owner_configured',(select count(*)=1 and bool_and(o.email=${literal(email)}) from private.app_owner o),
 'owner_table_rls',(select c.relrowsecurity from pg_catalog.pg_class c where c.oid='private.app_owner'::regclass),
 'browser_private_schema_access',has_schema_privilege('anon','private','USAGE') or has_schema_privilege('authenticated','private','USAGE'),
 'browser_owner_table_access',exists(select 1 from (values('anon'),('authenticated')) r(role_name) cross join (values('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) p(privilege) where has_table_privilege(r.role_name,'private.app_owner',p.privilege)),
 'private_buckets',(select count(*) from storage.buckets b where b.id in ('personal-audio','personal-backups','personal-content') and not b.public),
 'auth_profile_trigger_present',exists(select 1 from pg_catalog.pg_trigger g where g.tgrelid='auth.users'::regclass and g.tgname='on_auth_user_created' and g.tgfoid=to_regprocedure('public.create_user_profile()') and g.tgtype=5 and g.tgenabled='O'),
 'signup_guard_present',exists(select 1 from pg_catalog.pg_trigger g where g.tgrelid='auth.users'::regclass and g.tgname='allow_private_owner_only' and g.tgfoid=to_regprocedure('private.guard_owner_signup()') and g.tgtype=7 and g.tgenabled='O'),
 'storage_rls',(select c.relrowsecurity from pg_catalog.pg_class c where c.oid='storage.objects'::regclass),
 'ledger_rls',(select c.relrowsecurity from pg_catalog.pg_class c where c.oid='supabase_migrations.schema_migrations'::regclass),
 'browser_ledger_schema_access',has_schema_privilege('anon','supabase_migrations','USAGE') or has_schema_privilege('authenticated','supabase_migrations','USAGE'),
 'rls_helper_unchanged',coalesce((select md5(to_jsonb(p)::text) from pg_catalog.pg_proc p where p.oid=to_regprocedure('public.rls_auto_enable()'))=(select substring(m.statements[2] from 'helper_catalog_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations m where m.version='005'),false),
 'ensure_rls_unchanged',coalesce((select md5(to_jsonb(e)::text) from pg_catalog.pg_event_trigger e where e.evtname='ensure_rls')=(select substring(m.statements[2] from 'ensure_rls_catalog_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations m where m.version='005'),false)
) as migration_005_verification;
`;
writeFileSync(new URL('supabase/dashboard/005_verify.sql',root),verify);
console.log('Prepared only 005_deploy.sql and 005_verify.sql; no database connection or execution.');
