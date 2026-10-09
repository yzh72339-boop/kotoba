import {readFileSync,writeFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
const write=(p,s)=>writeFileSync(new URL(p,root),s);
const migration=read('supabase/migrations/008_phase_one_private_account.sql').trim();
const previous=read('supabase/dashboard/007_verify.sql');
const tables=[...previous.split('])), tables as',1)[0].matchAll(/'([a-z_]+)'/g)].map(m=>m[1]).sort();
const email=process.env.ALLOWED_USER_EMAIL?.trim().toLowerCase();
if(!email||!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email))throw new Error('Set server ALLOWED_USER_EMAIL.');
if(tables.length!==43||new Set(tables).size!==43||migration.includes('$migration_008$'))throw new Error('Unexpected inventory or delimiter.');
const lit=s=>`'${s.replaceAll("'","''")}'`;
const arr=a=>`array[${a.map(lit).join(',')}]`;
const previousQuery=label=>{
 const line=previous.split('\n').find(s=>s.startsWith(` ${lit(label)},coalesce(md5((`));
 if(!line)throw new Error(`Missing 007 checkpoint: ${label}`);
 return line.split('coalesce(md5((')[1].split(')::text)=(select l.hashes')[0];
};
const checks=[['functions','prior_functions_preserved'],['policies','prior_policies_unchanged'],['triggers','prior_app_triggers_unchanged'],['constraints','prior_constraints_unchanged'],['columns','prior_columns_unchanged'],['new_columns','new_columns_unchanged'],['installed_function','installed_function_unchanged']].map(([key,label])=>`md5((${previousQuery(label)})::text) is distinct from (select m.statements[4]::jsonb->>${lit(key)} from supabase_migrations.schema_migrations m where m.version='007')`).join('\n  or ');
// Four Auth function bodies intentionally change. Preserve every other old function.
const protectedFunctions=['public.consume_ai_request(uuid)','private.touch_updated_at()','public.record_review(uuid,uuid,text,timestamptz,integer)','public.sync_personal_state(bigint,text,jsonb)','public.personal_progress(text)','private.resolve_id(uuid,text,text)','private.validate_review_target()','private.create_review_item()','private.create_grammar_review()','private.project_learning_state(uuid,jsonb)','public.claim_ai_request(uuid)','private.validate_personal_snapshot()','private.project_state_v6(uuid,jsonb)','public.due_review_counts(text)','public.export_personal_archive()','private.project_state(uuid,jsonb)'];
const functionQuery=after=>`select jsonb_agg(${after?"to_jsonb(p)||jsonb_build_object('proname',case when p.oid=to_regprocedure('private.project_state_v7(uuid,jsonb)') then 'project_state' else p.proname end)":"to_jsonb(p)"} order by p.oid) from pg_catalog.pg_proc p where p.oid in (select to_regprocedure(s) from unnest(${arr(protectedFunctions.map(s=>after&&s==='private.project_state(uuid,jsonb)'?'private.project_state_v7(uuid,jsonb)':s))}) s)`;
const changedFunctions=['public.is_private_owner()','public.configure_private_owner(text)','private.guard_owner_signup()','public.create_user_profile()'];
const installedFunctions=[...changedFunctions,'private.ensure_private_profile(uuid)','public.get_private_account()','private.project_state(uuid,jsonb)'];
const installed=`select jsonb_agg(to_jsonb(p) order by p.oid) from pg_catalog.pg_proc p where p.oid in (select to_regprocedure(s) from unnest(${arr(installedFunctions)}) s)`;
const policies=`select jsonb_agg(to_jsonb(p) order by p.schemaname,p.tablename,p.policyname) from pg_catalog.pg_policies p where p.schemaname='public' or (p.schemaname='storage' and p.tablename='objects')`;
const triggers=`select jsonb_agg(to_jsonb(g) order by g.oid) from pg_catalog.pg_trigger g join pg_catalog.pg_class c on c.oid=g.tgrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace where not g.tgisinternal and (n.nspname='public' or g.tgrelid='auth.users'::regclass)`;
const newChecks=['valid_current_language_level','valid_target_language_level','profile_name_length','profile_native_language_length','profile_timezone_length'];
const constraints=`select jsonb_agg(to_jsonb(c) order by c.oid) from pg_catalog.pg_constraint c join pg_catalog.pg_class r on r.oid=c.conrelid join pg_catalog.pg_namespace n on n.oid=r.relnamespace where n.nspname='public' and not ((r.relname='user_languages' and c.conname in ('valid_current_language_level','valid_target_language_level')) or (r.relname='profiles' and c.conname in ('profile_name_length','profile_native_language_length','profile_timezone_length')))`;
const newConstraints=`select jsonb_agg(to_jsonb(c) order by c.oid) from pg_catalog.pg_constraint c where (c.conrelid='public.user_languages'::regclass and c.conname in ('valid_current_language_level','valid_target_language_level')) or (c.conrelid='public.profiles'::regclass and c.conname in ('profile_name_length','profile_native_language_length','profile_timezone_length')) or (c.conrelid='private.app_owner'::regclass and c.conname in ('app_owner_user_id_key','app_owner_user_id_fkey'))`;
const columns=`select jsonb_agg(to_jsonb(a) order by a.attrelid,a.attnum) from pg_catalog.pg_attribute a join pg_catalog.pg_class c on c.oid=a.attrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and a.attnum>0 and not a.attisdropped`;
const ownerColumn=`select to_jsonb(a) from pg_catalog.pg_attribute a where a.attrelid='private.app_owner'::regclass and a.attname='user_id' and not a.attisdropped`;
const oldRows=`foreach v_table in array v_tables loop
  execute format('select count(*),md5(coalesce(jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text),''[]''::jsonb)::text) from public.%I x',v_table) into v_count,v_digest;
  v_rows:=v_rows||jsonb_build_object(v_table,jsonb_build_object('oid',to_regclass(format('public.%I',v_table))::oid,'rows',v_count,'content_md5',v_digest));
 end loop;`;
const identityConsistent=`(select count(*) from auth.users u where lower(u.email)=${lit(email)})<=1 and exists(select 1 from private.app_owner o where o.email=${lit(email)} and ((o.user_id is null and not exists(select 1 from auth.users u where lower(u.email)=o.email)) or exists(select 1 from auth.users u where u.id=o.user_id and lower(u.email)=o.email)))`;
const deploy=String.raw`-- Only migration 008. Run the whole file as postgres after 007 verification passes.
-- Binds the owner identity. Does not create an Auth account or rewrite learning data.
begin;
set local lock_timeout='5s';
set local statement_timeout='120s';
do $deploy_008$
declare
 v_sql text:=$migration_008$
${migration}
$migration_008$;
 v_tables text[]:=${arr(tables)};
 v_table text;v_count bigint;v_digest text;v_rows jsonb:='{}';v_before jsonb;
 v_helper jsonb;v_event jsonb;v_functions jsonb;v_policies jsonb;v_triggers jsonb;v_constraints jsonb;v_columns jsonb;v_owner jsonb;
begin
 perform pg_advisory_xact_lock(hashtext('kotoba-dashboard-migrations'));
 if current_user<>'postgres' then raise exception 'Use postgres in SQL Editor';end if;
 if (select array_agg(m.version order by m.version) from supabase_migrations.schema_migrations m) is distinct from array['001','002','003','004','005','006','007']
  or not exists(select 1 from supabase_migrations.schema_migrations m where m.version='007' and m.name='audio_position_identity') then raise exception 'Expected only verified migrations 001 through 007';end if;
 if (select array_agg(c.relname::text order by c.relname::text) from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p')) is distinct from v_tables then raise exception 'Public table inventory differs from verified 007';end if;
 if (select count(*) from private.app_owner)<>1 or not exists(select 1 from private.app_owner o where o.email=${lit(email)}) then raise exception 'Private owner differs';end if;
 if to_regprocedure('private.project_state_v7(uuid,jsonb)') is not null or to_regprocedure('private.ensure_private_profile(uuid)') is not null or to_regprocedure('public.get_private_account()') is not null
  or exists(select 1 from pg_catalog.pg_attribute a where a.attrelid='private.app_owner'::regclass and a.attname='user_id' and not a.attisdropped)
  or exists(select 1 from pg_catalog.pg_constraint c where c.conrelid in ('public.profiles'::regclass,'public.user_languages'::regclass) and c.conname=any(${arr(newChecks)})) then raise exception 'An 008 object already exists; stop instead of overwriting';end if;
 lock table auth.users in share row exclusive mode;
 lock table ${tables.map(t=>`public.${t}`).join(',')},private.app_owner in share row exclusive mode;
 if (select count(*) from auth.users u where lower(u.email)=${lit(email)})>1 then raise exception 'Owner email maps to multiple Auth identities';end if;
 if exists(select 1 from public.user_languages l where (l.current_level is not null and not ((l.language_code='en' and l.current_level in ('A1','A2','B1','B2','C1','C2')) or (l.language_code='ja' and l.current_level in ('N5','N4','N3','N2','N1')))) or (l.target_level is not null and not ((l.language_code='en' and l.target_level in ('A1','A2','B1','B2','C1','C2')) or (l.language_code='ja' and l.target_level in ('N5','N4','N3','N2','N1')))))
  or exists(select 1 from public.profiles p where length(p.display_name)>100 or length(p.native_language) not between 2 and 32 or length(p.timezone) not between 1 and 100) then raise exception 'Existing profiles do not satisfy new bounds; stop without rewriting data';end if;
 if exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where ((n.nspname='public' and c.relkind in ('r','p')) or c.oid in ('private.app_owner'::regclass,'storage.objects'::regclass,'supabase_migrations.schema_migrations'::regclass)) and not c.relrowsecurity) then raise exception 'RLS checkpoint changed';end if;
 if exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace cross join (values('anon'),('authenticated')) r(role_name) cross join (values('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) p(privilege) where ((n.nspname='public' and c.relkind in ('r','p')) or c.oid='private.app_owner'::regclass) and has_table_privilege(r.role_name,c.oid,p.privilege)) then raise exception 'Browser table privileges changed';end if;
 if exists(select 1 from (values('anon'),('authenticated')) r(role_name) cross join (values('private'),('supabase_migrations')) n(schema_name) where has_schema_privilege(r.role_name,n.schema_name,'USAGE')) then raise exception 'Private schema privileges changed';end if;
 if (select count(*) from storage.buckets b where b.id in ('personal-audio','personal-backups','personal-content') and not b.public)<>3 then raise exception 'Managed buckets must stay private';end if;
 select to_jsonb(p) into v_helper from pg_catalog.pg_proc p where p.oid=to_regprocedure('public.rls_auto_enable()');
 select to_jsonb(e) into v_event from pg_catalog.pg_event_trigger e where e.evtname='ensure_rls';
 if v_helper is null or v_event is null
  or md5(v_helper::text) is distinct from (select substring(m.statements[2] from 'helper_catalog_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations m where m.version='007')
  or md5(v_event::text) is distinct from (select substring(m.statements[2] from 'ensure_rls_catalog_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations m where m.version='007') then raise exception 'RLS helper differs from verified 007';end if;
 if ${checks} then raise exception 'Objects differ from verified 007';end if;
 select (${functionQuery(false)}),(${policies}),(${triggers}),(${constraints}),(${columns}),(select to_jsonb(o) from private.app_owner o) into v_functions,v_policies,v_triggers,v_constraints,v_columns,v_owner;
 ${oldRows}
 v_before:=v_rows;

 execute v_sql;

 v_rows:='{}';
 ${oldRows}
 if v_before is distinct from v_rows then raise exception 'Existing tables or learning records changed; rollback';end if;
 if v_functions is distinct from (${functionQuery(true)}) or v_policies is distinct from (${policies}) or v_triggers is distinct from (${triggers}) or v_constraints is distinct from (${constraints}) or v_columns is distinct from (${columns}) then raise exception 'Prior learning functions, RLS or schema changed unexpectedly; rollback';end if;
 if v_owner is distinct from (select to_jsonb(o)-'user_id' from private.app_owner o) or not (${identityConsistent}) then raise exception 'Owner identity binding is inconsistent';end if;
 if v_helper is distinct from (select to_jsonb(p) from pg_catalog.pg_proc p where p.oid=to_regprocedure('public.rls_auto_enable()')) or v_event is distinct from (select to_jsonb(e) from pg_catalog.pg_event_trigger e where e.evtname='ensure_rls') then raise exception 'RLS helper changed; rollback';end if;
 if exists(select 1 from (values('anon'),('authenticated')) r(role_name) cross join unnest(array['private.ensure_private_profile(uuid)','private.project_state(uuid,jsonb)','private.project_state_v7(uuid,jsonb)','private.guard_owner_signup()','public.create_user_profile()','public.configure_private_owner(text)']) s where has_function_privilege(r.role_name,s,'EXECUTE'))
  or exists(select 1 from unnest(array['public.is_private_owner()','public.get_private_account()']) s where has_function_privilege('anon',s,'EXECUTE') or not has_function_privilege('authenticated',s,'EXECUTE')) then raise exception 'Auth function permissions are incorrect';end if;
 insert into supabase_migrations.schema_migrations(version,name,statements) values('008','phase_one_private_account',array[
  v_sql,format(E'-- helper_catalog_md5=%s; ensure_rls_catalog_md5=%s\n',md5(v_helper::text),md5(v_event::text)),v_before::text,
  jsonb_build_object('functions',md5(v_functions::text),'policies',md5(v_policies::text),'triggers',md5(v_triggers::text),'constraints',md5(v_constraints::text),'columns',md5(v_columns::text),'installed_functions',md5((${installed})::text),'new_constraints',md5((${newConstraints})::text),'owner_column',md5((${ownerColumn})::text),'owner_base',md5(v_owner::text))::text
 ]);
end;
$deploy_008$;
commit;
select version,name from supabase_migrations.schema_migrations order by version;
`;
write('supabase/dashboard/008_deploy.sql',deploy);
const rowQueries=tables.map(t=>`select ${lit(t)} as t,'public.${t}'::regclass::oid as oid,count(*) as rows,md5(coalesce(jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text),'[]'::jsonb)::text) as content_md5 from public.${t} x`).join('\n union all ');
const flags=[['prior_learning_functions_preserved',functionQuery(true),'functions'],['prior_policies_unchanged',policies,'policies'],['prior_app_triggers_unchanged',triggers,'triggers'],['prior_constraints_unchanged',constraints,'constraints'],['prior_columns_unchanged',columns,'columns'],['installed_functions_unchanged',installed,'installed_functions'],['new_constraints_unchanged',newConstraints,'new_constraints'],['owner_column_unchanged',ownerColumn,'owner_column']].map(([label,q,key])=>` ${lit(label)},coalesce(md5((${q})::text)=(select l.hashes->>${lit(key)} from ledger l),false)`).join(',\n');
const verify=String.raw`-- Read-only verification of 008, as postgres. No RPCs, writes or role/JWT changes.
with expected(t) as (select unnest(${arr(tables)})), tables as (
 select e.t,c.oid,c.relrowsecurity from expected e left join pg_catalog.pg_namespace n on n.nspname='public' left join pg_catalog.pg_class c on c.relnamespace=n.oid and c.relname=e.t and c.relkind='r'
), ledger as (select m.statements[3]::jsonb as before_rows,m.statements[4]::jsonb as hashes from supabase_migrations.schema_migrations m where m.version='008'), stored_rows as (
 ${rowQueries}
), problems(kind,detail) as (
 select 'missing_table',t.t from tables t where t.oid is null
 union all select 'rls_disabled',t.t from tables t where t.oid is not null and not t.relrowsecurity
 union all select 'unexpected_table',c.relname::text from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p') and not exists(select 1 from expected e where e.t=c.relname)
 union all select 'browser_table_privilege',t.t||':'||r.role_name||':'||p.privilege from tables t cross join (values('anon'),('authenticated')) r(role_name) cross join (values('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) p(privilege) where t.oid is not null and has_table_privilege(r.role_name,t.oid,p.privilege)
 union all select 'private_function_execute',r.role_name||':'||s from (values('anon'),('authenticated')) r(role_name) cross join unnest(array['private.ensure_private_profile(uuid)','private.project_state(uuid,jsonb)','private.project_state_v7(uuid,jsonb)','private.project_state_v6(uuid,jsonb)','private.project_learning_state(uuid,jsonb)','private.guard_owner_signup()','public.create_user_profile()','public.configure_private_owner(text)']) s where to_regprocedure(s) is not null and has_function_privilege(r.role_name,to_regprocedure(s),'EXECUTE')
 union all select 'invalid_rpc_permissions',s from unnest(array['public.is_private_owner()','public.get_private_account()']) s where to_regprocedure(s) is null or has_function_privilege('anon',to_regprocedure(s),'EXECUTE') or not has_function_privilege('authenticated',to_regprocedure(s),'EXECUTE')
 union all select 'invalid_owner_column','private.app_owner.user_id' where not exists(select 1 from pg_catalog.pg_attribute a where a.attrelid='private.app_owner'::regclass and a.attname='user_id' and a.atttypid='uuid'::regtype and not a.attnotnull and not a.atthasdef and not a.attisdropped)
 union all select 'invalid_owner_fk','app_owner_user_id_fkey' where not exists(select 1 from pg_catalog.pg_constraint c where c.conrelid='private.app_owner'::regclass and c.conname='app_owner_user_id_fkey' and c.contype='f' and c.convalidated and c.confrelid='auth.users'::regclass and c.confdeltype='n' and c.conkey=array[(select a.attnum from pg_catalog.pg_attribute a where a.attrelid=c.conrelid and a.attname='user_id')]::smallint[] and c.confkey=array[(select a.attnum from pg_catalog.pg_attribute a where a.attrelid=c.confrelid and a.attname='id')]::smallint[])
 union all select 'invalid_owner_unique','app_owner_user_id_key' where not exists(select 1 from pg_catalog.pg_constraint c where c.conrelid='private.app_owner'::regclass and c.conname='app_owner_user_id_key' and c.contype='u' and c.convalidated and c.conkey=array[(select a.attnum from pg_catalog.pg_attribute a where a.attrelid=c.conrelid and a.attname='user_id')]::smallint[])
 union all select 'invalid_new_check',c.table_name||'.'||c.constraint_name from (values('user_languages','valid_current_language_level'),('user_languages','valid_target_language_level'),('profiles','profile_name_length'),('profiles','profile_native_language_length'),('profiles','profile_timezone_length')) c(table_name,constraint_name) where not exists(select 1 from pg_catalog.pg_constraint k where k.conrelid=to_regclass('public.'||c.table_name) and k.conname=c.constraint_name and k.contype='c' and k.convalidated)
 union all select 'invalid_function_security',s from unnest(${arr(installedFunctions)}) s left join pg_catalog.pg_proc p on p.oid=to_regprocedure(s) where p.oid is null or not p.prosecdef or pg_get_userbyid(p.proowner)<>'postgres' or not coalesce(exists(select 1 from unnest(p.proconfig) x where split_part(x,'=',1)='search_path' and trim(split_part(x,'=',2),E' \'"')=''),false)
)
select jsonb_build_object(
 'migration_versions',(select jsonb_agg(m.version order by m.version) from supabase_migrations.schema_migrations m),
 'migration_008_recorded',exists(select 1 from supabase_migrations.schema_migrations m where m.version='008' and m.name='phase_one_private_account'),
 'expected_tables',43,'found_tables',(select count(*) from tables t where t.oid is not null),
 'problems',coalesce((select jsonb_agg(jsonb_build_object('check',p.kind,'detail',p.detail) order by p.kind,p.detail) from problems p),'[]'::jsonb),
 'existing_tables_and_data_preserved',coalesce((select jsonb_object_agg(s.t,jsonb_build_object('oid',s.oid,'rows',s.rows,'content_md5',s.content_md5)) from stored_rows s)=(select l.before_rows from ledger l),false),
${flags},
 'owner_base_preserved',coalesce(md5((select (to_jsonb(o)-'user_id')::text from private.app_owner o))=(select l.hashes->>'owner_base' from ledger l),false),
 'owner_identity_consistent',(${identityConsistent}),
 'owner_auth_users',(select count(*) from auth.users u where lower(u.email)=${lit(email)}),
 'owner_account_status',coalesce((select case when u.email_confirmed_at is null then 'unconfirmed' else 'confirmed' end from auth.users u where lower(u.email)=${lit(email)} limit 1),'not_created'),
 'owner_configured',(select count(*)=1 and bool_and(o.email=${lit(email)}) from private.app_owner o),
 'owner_table_rls',(select c.relrowsecurity from pg_catalog.pg_class c where c.oid='private.app_owner'::regclass),
 'browser_private_schema_access',has_schema_privilege('anon','private','USAGE') or has_schema_privilege('authenticated','private','USAGE'),
 'browser_owner_table_access',exists(select 1 from (values('anon'),('authenticated')) r(role_name) cross join (values('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) p(privilege) where has_table_privilege(r.role_name,'private.app_owner',p.privilege)),
 'private_buckets',(select count(*) from storage.buckets b where b.id in ('personal-audio','personal-backups','personal-content') and not b.public),
 'auth_profile_trigger_present',exists(select 1 from pg_catalog.pg_trigger g where g.tgrelid='auth.users'::regclass and g.tgname='on_auth_user_created' and g.tgfoid=to_regprocedure('public.create_user_profile()') and g.tgtype=5 and g.tgenabled='O'),
 'signup_guard_present',exists(select 1 from pg_catalog.pg_trigger g where g.tgrelid='auth.users'::regclass and g.tgname='allow_private_owner_only' and g.tgfoid=to_regprocedure('private.guard_owner_signup()') and g.tgtype=7 and g.tgenabled='O'),
 'storage_rls',(select c.relrowsecurity from pg_catalog.pg_class c where c.oid='storage.objects'::regclass),
 'ledger_rls',(select c.relrowsecurity from pg_catalog.pg_class c where c.oid='supabase_migrations.schema_migrations'::regclass),
 'browser_ledger_schema_access',has_schema_privilege('anon','supabase_migrations','USAGE') or has_schema_privilege('authenticated','supabase_migrations','USAGE'),
 'rls_helper_unchanged',coalesce((select md5(to_jsonb(p)::text) from pg_catalog.pg_proc p where p.oid=to_regprocedure('public.rls_auto_enable()'))=(select substring(m.statements[2] from 'helper_catalog_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations m where m.version='008'),false),
 'ensure_rls_unchanged',coalesce((select md5(to_jsonb(e)::text) from pg_catalog.pg_event_trigger e where e.evtname='ensure_rls')=(select substring(m.statements[2] from 'ensure_rls_catalog_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations m where m.version='008'),false)
) as migration_008_verification;
`;
write('supabase/dashboard/008_verify.sql',verify);
console.log('Prepared only 008_deploy.sql and 008_verify.sql; no database connection or execution.');
