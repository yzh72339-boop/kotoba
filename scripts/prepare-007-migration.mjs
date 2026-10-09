import {readFileSync,writeFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
const write=(p,s)=>writeFileSync(new URL(p,root),s);
const migration=read('supabase/migrations/007_audio_position_identity.sql').trim();
const previous=read('supabase/dashboard/006_verify.sql');
const tables=[...previous.split('])), tables as',1)[0].matchAll(/'([a-z_]+)'/g)].map(m=>m[1]).sort();
const email=process.env.ALLOWED_USER_EMAIL?.trim().toLowerCase();
if(!email||!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email))throw new Error('Set server ALLOWED_USER_EMAIL.');
if(tables.length!==43||new Set(tables).size!==43||migration.includes('$migration_007$'))throw new Error('Unexpected inventory or delimiter.');
const lit=s=>`'${s.replaceAll("'","''")}'`;
const arr=a=>`array[${a.map(lit).join(',')}]`;
// Reuse the exact, already-deployed 006 catalog fingerprint expressions.
const previousQuery=label=>{
 const line=previous.split('\n').find(s=>s.startsWith(` ${lit(label)},coalesce(md5((`));
 if(!line)throw new Error(`Missing 006 checkpoint: ${label}`);
 return line.split('coalesce(md5((')[1].split(')::text)=(select l.hashes')[0];
};
const previousChecks=[['functions','prior_functions_preserved'],['policies','prior_policies_unchanged'],['triggers','prior_app_triggers_unchanged'],['validator','validator_unchanged'],['validator_trigger','validator_trigger_unchanged'],['constraints','constraints_unchanged'],['installed_functions','installed_functions_unchanged'],['audio_shape','audio_structure_unchanged']];
const checks=previousChecks.map(([key,label])=>`md5((${previousQuery(label)})::text) is distinct from (select m.statements[4]::jsonb->>${lit(key)} from supabase_migrations.schema_migrations m where m.version='006')`).join('\n  or ');
const functions=['public.create_user_profile()','public.configure_private_owner(text)','public.is_private_owner()','public.consume_ai_request(uuid)','private.guard_owner_signup()','private.touch_updated_at()','public.record_review(uuid,uuid,text,timestamptz,integer)','public.sync_personal_state(bigint,text,jsonb)','public.personal_progress(text)','private.resolve_id(uuid,text,text)','private.validate_review_target()','private.create_review_item()','private.create_grammar_review()','private.project_learning_state(uuid,jsonb)','public.claim_ai_request(uuid)','private.validate_personal_snapshot()','private.project_state(uuid,jsonb)','public.due_review_counts(text)','public.export_personal_archive()'];
const functionQuery=after=>`select jsonb_agg(${after?"to_jsonb(p)||jsonb_build_object('proname',case when p.oid=to_regprocedure('private.project_state_v6(uuid,jsonb)') then 'project_state' else p.proname end)":"to_jsonb(p)"} order by p.oid) from pg_catalog.pg_proc p where p.oid in (select to_regprocedure(s) from unnest(${arr(functions.map(s=>after&&s==='private.project_state(uuid,jsonb)'?'private.project_state_v6(uuid,jsonb)':s))}) s)`;
const policies=`select jsonb_agg(to_jsonb(p) order by p.schemaname,p.tablename,p.policyname) from pg_catalog.pg_policies p where p.schemaname='public' or (p.schemaname='storage' and p.tablename='objects')`;
const triggers=`select jsonb_agg(to_jsonb(g) order by g.oid) from pg_catalog.pg_trigger g join pg_catalog.pg_class c on c.oid=g.tgrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace where not g.tgisinternal and (n.nspname='public' or g.tgrelid='auth.users'::regclass)`;
const constraints=`select jsonb_agg(to_jsonb(c) order by c.oid) from pg_catalog.pg_constraint c join pg_catalog.pg_class r on r.oid=c.conrelid join pg_catalog.pg_namespace n on n.oid=r.relnamespace where n.nspname='public'`;
const columns=`select jsonb_agg(to_jsonb(a) order by a.attrelid,a.attnum) from pg_catalog.pg_attribute a join pg_catalog.pg_class c on c.oid=a.attrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and a.attnum>0 and not a.attisdropped and not ((c.relname='personal_audio_files' and a.attname='source_updated_at') or (c.relname='listening_progress' and a.attname='media_id'))`;
const newColumns=`select jsonb_agg(to_jsonb(a) order by a.attrelid,a.attnum) from pg_catalog.pg_attribute a where (a.attrelid='public.personal_audio_files'::regclass and a.attname='source_updated_at') or (a.attrelid='public.listening_progress'::regclass and a.attname='media_id')`;
const installed=`select to_jsonb(p) from pg_catalog.pg_proc p where p.oid=to_regprocedure('private.project_state(uuid,jsonb)')`;
const oldRows=`foreach v_table in array v_tables loop
  v_omit:=case v_table when 'personal_audio_files' then 'source_updated_at' when 'listening_progress' then 'media_id' else '__kotoba_007_no_column__' end;
  execute format('select count(*),md5(coalesce(jsonb_agg(to_jsonb(x)-%L order by (to_jsonb(x)-%L)::text),''[]''::jsonb)::text) from public.%I x',v_omit,v_omit,v_table) into v_count,v_digest;
  v_rows:=v_rows||jsonb_build_object(v_table,jsonb_build_object('oid',to_regclass(format('public.%I',v_table))::oid,'rows',v_count,'content_md5',v_digest));
 end loop;`;
const deploy=String.raw`-- Only migration 007. Run the whole file as postgres after 006 verification passes.
-- Adds two nullable columns; does not call sync or backfill learning records.
begin;
set local lock_timeout='5s';
set local statement_timeout='120s';
do $deploy_007$
declare
 v_sql text:=$migration_007$
${migration}
$migration_007$;
 v_tables text[]:=${arr(tables)};
 v_table text;v_omit text;v_count bigint;v_digest text;v_rows jsonb:='{}';v_before jsonb;
 v_helper jsonb;v_event jsonb;v_functions jsonb;v_policies jsonb;v_triggers jsonb;v_constraints jsonb;v_columns jsonb;
begin
 perform pg_advisory_xact_lock(hashtext('kotoba-dashboard-migrations'));
 if current_user<>'postgres' then raise exception 'Use postgres in SQL Editor';end if;
 if (select array_agg(m.version order by m.version) from supabase_migrations.schema_migrations m) is distinct from array['001','002','003','004','005','006']
  or not exists(select 1 from supabase_migrations.schema_migrations m where m.version='006' and m.name='personal_audio_and_memory') then raise exception 'Expected only verified migrations 001 through 006';end if;
 if (select array_agg(c.relname::text order by c.relname::text) from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p')) is distinct from v_tables then raise exception 'Public table inventory differs from verified 006';end if;
 if (select count(*) from private.app_owner)<>1 or not exists(select 1 from private.app_owner o where o.email=${lit(email)}) then raise exception 'Private owner differs';end if;
 if to_regprocedure('private.project_state_v6(uuid,jsonb)') is not null
  or exists(select 1 from pg_catalog.pg_attribute a where not a.attisdropped and ((a.attrelid='public.personal_audio_files'::regclass and a.attname='source_updated_at') or (a.attrelid='public.listening_progress'::regclass and a.attname='media_id'))) then raise exception 'A 007 object already exists; stop instead of overwriting';end if;
 lock table auth.users in share row exclusive mode;
 lock table ${tables.map(t=>`public.${t}`).join(',')},private.app_owner in share row exclusive mode;
 if exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where ((n.nspname='public' and c.relkind in ('r','p')) or c.oid in ('private.app_owner'::regclass,'storage.objects'::regclass,'supabase_migrations.schema_migrations'::regclass)) and not c.relrowsecurity) then raise exception 'RLS checkpoint changed';end if;
 if exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace cross join (values('anon'),('authenticated')) r(role_name) cross join (values('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) p(privilege)
  where ((n.nspname='public' and c.relkind in ('r','p')) or c.oid='private.app_owner'::regclass) and has_table_privilege(r.role_name,c.oid,p.privilege)) then raise exception 'Browser table privileges changed';end if;
 if exists(select 1 from (values('anon'),('authenticated')) r(role_name) cross join (values('private'),('supabase_migrations')) n(schema_name) where has_schema_privilege(r.role_name,n.schema_name,'USAGE')) then raise exception 'Private schema privileges changed';end if;
 if (select count(*) from storage.buckets b where b.id in ('personal-audio','personal-backups','personal-content') and not b.public)<>3 then raise exception 'Managed buckets must stay private';end if;
 select to_jsonb(p) into v_helper from pg_catalog.pg_proc p where p.oid=to_regprocedure('public.rls_auto_enable()');
 select to_jsonb(e) into v_event from pg_catalog.pg_event_trigger e where e.evtname='ensure_rls';
 if v_helper is null or v_event is null
  or md5(v_helper::text) is distinct from (select substring(m.statements[2] from 'helper_catalog_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations m where m.version='006')
  or md5(v_event::text) is distinct from (select substring(m.statements[2] from 'ensure_rls_catalog_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations m where m.version='006') then raise exception 'RLS helper differs from verified 006';end if;
 if ${checks} then raise exception 'Objects differ from verified 006';end if;
 select (${functionQuery(false)}),(${policies}),(${triggers}),(${constraints}),(${columns}) into v_functions,v_policies,v_triggers,v_constraints,v_columns;
 ${oldRows}
 v_before:=v_rows;

 execute v_sql;

 v_rows:='{}';
 ${oldRows}
 if v_before is distinct from v_rows then raise exception 'Existing tables or learning records changed; rollback';end if;
 if v_functions is distinct from (${functionQuery(true)}) or v_policies is distinct from (${policies}) or v_triggers is distinct from (${triggers}) or v_constraints is distinct from (${constraints}) or v_columns is distinct from (${columns}) then raise exception 'Prior functions, RLS or schema changed unexpectedly; rollback';end if;
 if exists(select 1 from public.personal_audio_files a where a.source_updated_at is not null) or exists(select 1 from public.listening_progress p where p.media_id is not null) then raise exception 'New columns were unexpectedly backfilled';end if;
 if v_helper is distinct from (select to_jsonb(p) from pg_catalog.pg_proc p where p.oid=to_regprocedure('public.rls_auto_enable()'))
  or v_event is distinct from (select to_jsonb(e) from pg_catalog.pg_event_trigger e where e.evtname='ensure_rls') then raise exception 'RLS helper changed; rollback';end if;
 if exists(select 1 from (values('anon'),('authenticated')) r(role_name) cross join unnest(array['private.project_state(uuid,jsonb)','private.project_state_v6(uuid,jsonb)','private.project_learning_state(uuid,jsonb)']) s where has_function_privilege(r.role_name,s,'EXECUTE')) then raise exception 'Private projection is executable by a browser role';end if;
 insert into supabase_migrations.schema_migrations(version,name,statements) values('007','audio_position_identity',array[
  v_sql,format(E'-- helper_catalog_md5=%s; ensure_rls_catalog_md5=%s\n',md5(v_helper::text),md5(v_event::text)),v_before::text,
  jsonb_build_object('functions',md5(v_functions::text),'policies',md5(v_policies::text),'triggers',md5(v_triggers::text),'constraints',md5(v_constraints::text),'columns',md5(v_columns::text),'new_columns',md5((${newColumns})::text),'installed_function',md5((${installed})::text))::text
 ]);
end;
$deploy_007$;
commit;
select version,name from supabase_migrations.schema_migrations order by version;
`;
write('supabase/dashboard/007_deploy.sql',deploy);
const rowQueries=tables.map(t=>{
 const omit=t==='personal_audio_files'?"-'source_updated_at'":t==='listening_progress'?"-'media_id'":'';
 return `select ${lit(t)} as t,'public.${t}'::regclass::oid as oid,count(*) as rows,md5(coalesce(jsonb_agg(to_jsonb(x)${omit} order by (to_jsonb(x)${omit})::text),'[]'::jsonb)::text) as content_md5 from public.${t} x`;
}).join('\n union all ');
const flags=[['prior_functions_preserved',functionQuery(true),'functions'],['prior_policies_unchanged',policies,'policies'],['prior_app_triggers_unchanged',triggers,'triggers'],['prior_constraints_unchanged',constraints,'constraints'],['prior_columns_unchanged',columns,'columns'],['new_columns_unchanged',newColumns,'new_columns'],['installed_function_unchanged',installed,'installed_function']].map(([label,q,key])=>` ${lit(label)},coalesce(md5((${q})::text)=(select l.hashes->>${lit(key)} from ledger l),false)`).join(',\n');
const verify=String.raw`-- Read-only verification of 007, as postgres. No RPCs, writes or role/JWT changes.
with expected(t) as (select unnest(${arr(tables)})), tables as (
 select e.t,c.oid,c.relrowsecurity from expected e left join pg_catalog.pg_namespace n on n.nspname='public' left join pg_catalog.pg_class c on c.relnamespace=n.oid and c.relname=e.t and c.relkind='r'
), ledger as (select m.statements[3]::jsonb as before_rows,m.statements[4]::jsonb as hashes from supabase_migrations.schema_migrations m where m.version='007'), stored_rows as (
 ${rowQueries}
), problems(kind,detail) as (
 select 'missing_table',t.t from tables t where t.oid is null
 union all select 'rls_disabled',t.t from tables t where t.oid is not null and not t.relrowsecurity
 union all select 'unexpected_table',c.relname::text from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p') and not exists(select 1 from expected e where e.t=c.relname)
 union all select 'browser_table_privilege',t.t||':'||r.role_name||':'||p.privilege from tables t cross join (values('anon'),('authenticated')) r(role_name) cross join (values('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) p(privilege) where t.oid is not null and has_table_privilege(r.role_name,t.oid,p.privilege)
 union all select 'private_function_execute',r.role_name||':'||s from (values('anon'),('authenticated')) r(role_name) cross join unnest(array['private.project_state(uuid,jsonb)','private.project_state_v6(uuid,jsonb)','private.project_learning_state(uuid,jsonb)']) s where to_regprocedure(s) is not null and has_function_privilege(r.role_name,to_regprocedure(s),'EXECUTE')
 union all select 'invalid_projection_security','private.project_state(uuid,jsonb)' where not exists(select 1 from pg_catalog.pg_proc p where p.oid=to_regprocedure('private.project_state(uuid,jsonb)') and p.prosecdef and pg_get_userbyid(p.proowner)='postgres' and exists(select 1 from unnest(p.proconfig) x where split_part(x,'=',1)='search_path' and trim(split_part(x,'=',2),E' \'"')=''))
 union all select 'invalid_column',c.table_name||'.'||c.column_name from (values('personal_audio_files','source_updated_at','timestamp with time zone'::regtype),('listening_progress','media_id','text'::regtype)) c(table_name,column_name,type_oid) where not exists(select 1 from pg_catalog.pg_attribute a where a.attrelid=to_regclass('public.'||c.table_name) and a.attname=c.column_name and a.atttypid=c.type_oid and not a.attnotnull and not a.atthasdef and not a.attisdropped)
)
select jsonb_build_object(
 'migration_versions',(select jsonb_agg(m.version order by m.version) from supabase_migrations.schema_migrations m),
 'migration_007_recorded',exists(select 1 from supabase_migrations.schema_migrations m where m.version='007' and m.name='audio_position_identity'),
 'expected_tables',43,'found_tables',(select count(*) from tables t where t.oid is not null),
 'problems',coalesce((select jsonb_agg(jsonb_build_object('check',p.kind,'detail',p.detail) order by p.kind,p.detail) from problems p),'[]'::jsonb),
 'existing_tables_and_data_preserved',coalesce((select jsonb_object_agg(s.t,jsonb_build_object('oid',s.oid,'rows',s.rows,'content_md5',s.content_md5)) from stored_rows s)=(select l.before_rows from ledger l),false),
${flags},
 'new_columns_unfilled',not exists(select 1 from public.personal_audio_files a where a.source_updated_at is not null) and not exists(select 1 from public.listening_progress p where p.media_id is not null),
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
 'rls_helper_unchanged',coalesce((select md5(to_jsonb(p)::text) from pg_catalog.pg_proc p where p.oid=to_regprocedure('public.rls_auto_enable()'))=(select substring(m.statements[2] from 'helper_catalog_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations m where m.version='007'),false),
 'ensure_rls_unchanged',coalesce((select md5(to_jsonb(e)::text) from pg_catalog.pg_event_trigger e where e.evtname='ensure_rls')=(select substring(m.statements[2] from 'ensure_rls_catalog_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations m where m.version='007'),false)
) as migration_007_verification;
`;
write('supabase/dashboard/007_verify.sql',verify);
console.log('Prepared only 007_deploy.sql and 007_verify.sql; no database connection or execution.');
