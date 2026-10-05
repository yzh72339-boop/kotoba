import {readFileSync,writeFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
const write=(p,s)=>writeFileSync(new URL(p,root),s);
const migration=read('supabase/migrations/009_private_permissions_and_storage.sql').trim();
const previous=read('supabase/dashboard/008_verify.sql');
const tables=[...previous.split('])), tables as',1)[0].matchAll(/'([a-z_]+)'/g)].map(m=>m[1]).sort();
const email=process.env.ALLOWED_USER_EMAIL?.trim().toLowerCase();
if(!email||!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email))throw new Error('Set server ALLOWED_USER_EMAIL.');
if(tables.length!==43||new Set(tables).size!==43||migration.includes('$migration_009$'))throw new Error('Unexpected inventory or delimiter.');
const lit=s=>`'${s.replaceAll("'","''")}'`;
const arr=a=>`array[${a.map(lit).join(',')}]`;
const readOnly=['users','user_progress','review_items','review_logs','sync_batches','client_id_map','ai_requests','languages','courses','lessons','legacy_profiles','legacy_vocabulary','legacy_grammar','legacy_reviews','legacy_study_sessions','legacy_ai_conversations'];
const fenced=tables.filter(t=>t!=='ai_usage');
const previousQuery=label=>{
 const line=previous.split('\n').find(s=>s.startsWith(` ${lit(label)},coalesce(md5((`));
 if(!line)throw new Error(`Missing 008 checkpoint: ${label}`);
 return line.split('coalesce(md5((')[1].split(')::text)=(select l.hashes')[0];
};
const checkpoints=[['functions','prior_learning_functions_preserved'],['policies','prior_policies_unchanged'],['triggers','prior_app_triggers_unchanged'],['constraints','prior_constraints_unchanged'],['columns','prior_columns_unchanged'],['installed_functions','installed_functions_unchanged'],['new_constraints','new_constraints_unchanged'],['owner_column','owner_column_unchanged']];
const checks=checkpoints.map(([key,label])=>`md5((${previousQuery(label)})::text) is distinct from (select m.statements[4]::jsonb->>${lit(key)} from supabase_migrations.schema_migrations m where m.version='008')`).join('\n  or ');
const scope=`(p.schemaname='public' or (p.schemaname='storage' and p.tablename='objects'))`;
const newPolicy=`((p.schemaname='public' and p.tablename=any(${arr(fenced)}) and p.policyname='private_owner_fence') or (p.schemaname='storage' and p.tablename='objects' and p.policyname in ('managed_storage_owner_fence','managed_storage_anon_fence')))`;
const queries={
 functions:`select jsonb_agg(to_jsonb(p) order by p.oid) from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private')`,
 policies:`select jsonb_agg(to_jsonb(p) order by p.schemaname,p.tablename,p.policyname) from pg_catalog.pg_policies p where ${scope} and not ${newPolicy}`,
 triggers:`select jsonb_agg(to_jsonb(g) order by g.oid) from pg_catalog.pg_trigger g join pg_catalog.pg_class c on c.oid=g.tgrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace where not g.tgisinternal and (n.nspname in ('public','private') or g.tgrelid='auth.users'::regclass)`,
 constraints:`select jsonb_agg(to_jsonb(c) order by c.oid) from pg_catalog.pg_constraint c join pg_catalog.pg_class r on r.oid=c.conrelid join pg_catalog.pg_namespace n on n.oid=r.relnamespace where n.nspname in ('public','private')`,
 columns:`select jsonb_agg(to_jsonb(a) order by a.attrelid,a.attnum) from pg_catalog.pg_attribute a join pg_catalog.pg_class c on c.oid=a.attrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','private') and c.relkind='r' and a.attnum>0 and not a.attisdropped`,
 owner:`select to_jsonb(o) from private.app_owner o`,
 buckets:`select jsonb_agg(to_jsonb(b) order by b.id) from storage.buckets b`,
 installed_policies:`select jsonb_agg(to_jsonb(p) order by p.schemaname,p.tablename,p.policyname) from pg_catalog.pg_policies p where ${newPolicy}`
};
const expectedCTE=`expected(t) as (select unnest(${arr(tables)})), permissions as (
 select e.t,r.role_name,p.privilege,
  (r.role_name='authenticated' and e.t<>'ai_usage' and (p.privilege='SELECT' or (not e.t=any(${arr(readOnly)}) and p.privilege in ('INSERT','UPDATE','DELETE')))) as allowed
 from expected e cross join (values('anon'),('authenticated')) r(role_name)
 cross join (values('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER'),('MAINTAIN')) p(privilege)
)`;
const permissionIssues=`select 'table_permission' as kind,p.t||':'||p.role_name||':'||p.privilege as detail from permissions p where has_table_privilege(p.role_name,to_regclass('public.'||p.t),p.privilege) is distinct from p.allowed
 union all select 'column_permission',p.t||'.'||a.attname||':'||p.role_name||':'||p.privilege from permissions p join pg_catalog.pg_attribute a on a.attrelid=to_regclass('public.'||p.t) and a.attnum>0 and not a.attisdropped where case when p.privilege in ('SELECT','INSERT','UPDATE','REFERENCES') then has_column_privilege(p.role_name,a.attrelid,a.attnum,p.privilege) is distinct from p.allowed else false end`;
const rowCapture=`foreach v_table in array v_tables loop
  execute format('select count(*),md5(coalesce(jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text),''[]''::jsonb)::text) from public.%I x',v_table) into v_count,v_digest;
  v_rows:=v_rows||jsonb_build_object(v_table,jsonb_build_object('oid',to_regclass(format('public.%I',v_table))::oid,'rows',v_count,'content_md5',v_digest));
 end loop;`;
const preserveKeys=Object.keys(queries).filter(k=>k!=='installed_policies');
const snapshots=keys=>`jsonb_build_object(${keys.map(k=>`${lit(k)},md5((${queries[k]})::text)`).join(',')})`;
const accessIssues=`select 'private_schema_access' as kind,r.role_name||':'||n.schema_name as detail from (values('anon'),('authenticated')) r(role_name) cross join (values('private'),('supabase_migrations')) n(schema_name) where has_schema_privilege(r.role_name,n.schema_name,'USAGE') or has_schema_privilege(r.role_name,n.schema_name,'CREATE')
 union all select 'browser_public_create',r.role_name from (values('anon'),('authenticated')) r(role_name) where has_schema_privilege(r.role_name,'public','CREATE')
 union all select 'private_table_access',r.role_name||':'||c.oid::regclass::text||':'||p.privilege from pg_catalog.pg_class c cross join (values('anon'),('authenticated')) r(role_name) cross join (values('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER'),('MAINTAIN')) p(privilege) where c.oid in ('private.app_owner'::regclass,'supabase_migrations.schema_migrations'::regclass) and has_table_privilege(r.role_name,c.oid,p.privilege)
 union all select 'private_function_execute',r.role_name||':'||p.oid::regprocedure::text from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace cross join (values('anon'),('authenticated')) r(role_name) where (n.nspname='private' or p.oid in (to_regprocedure('public.create_user_profile()'),to_regprocedure('public.configure_private_owner(text)'))) and has_function_privilege(r.role_name,p.oid,'EXECUTE')`;
const policyIssues=`select 'invalid_table_fence' as kind,e.t as detail from expected e left join pg_catalog.pg_policies p on p.schemaname='public' and p.tablename=e.t and p.policyname='private_owner_fence' where e.t<>'ai_usage' and (p.policyname is null or p.permissive<>'RESTRICTIVE' or p.cmd<>'ALL' or p.roles is distinct from array['authenticated']::name[] or p.qual is null or p.with_check is null or p.qual not like '%is_private_owner()%' or p.with_check not like '%is_private_owner()%')
 union all select 'missing_parent_policy',c.t from (values('vocabulary_examples','parent_owned'),('vocabulary_collocations','parent_owned'),('sentence_vocabulary','both_owned'),('sentence_grammar','sentence_owned')) c(t,n) where not exists(select 1 from pg_catalog.pg_policies p where p.schemaname='public' and p.tablename=c.t and p.policyname=c.n and p.qual like '%auth.uid()%' and p.with_check like '%auth.uid()%')
 union all select 'invalid_storage_fence',e.n from (values('managed_storage_owner_fence','authenticated'),('managed_storage_anon_fence','anon')) e(n,r) left join pg_catalog.pg_policies p on p.schemaname='storage' and p.tablename='objects' and p.policyname=e.n where p.policyname is null or p.permissive<>'RESTRICTIVE' or p.cmd<>'ALL' or p.roles is distinct from array[e.r]::name[] or p.qual is null or p.with_check is null
 union all select 'unconditional_policy',p.tablename||':'||p.policyname from pg_catalog.pg_policies p where p.schemaname='public' and (trim(p.qual,' ()')='true' or trim(p.with_check,' ()')='true')`;
const allIssues=`${permissionIssues}\n union all ${accessIssues}\n union all ${policyIssues}`;
const deploy=String.raw`-- Only migration 009. Run the whole file as postgres after 008 verification passes.
-- Minimum table grants + restrictive owner fences. No accounts or learning data created.
begin;
set local lock_timeout='5s';
set local statement_timeout='120s';
do $deploy_009$
declare
 v_sql text:=$migration_009$
${migration}
$migration_009$;
 v_tables text[]:=${arr(tables)};
 v_table text;v_count bigint;v_digest text;v_rows jsonb:='{}';v_before jsonb;
 v_helper jsonb;v_event jsonb;v_catalog jsonb;
begin
 perform pg_advisory_xact_lock(hashtext('kotoba-dashboard-migrations'));
 if current_user<>'postgres' then raise exception 'Use postgres in SQL Editor';end if;
 if (select array_agg(m.version order by m.version) from supabase_migrations.schema_migrations m) is distinct from array['001','002','003','004','005','006','007','008']
  or not exists(select 1 from supabase_migrations.schema_migrations m where m.version='008' and m.name='phase_one_private_account') then raise exception 'Expected only verified migrations 001 through 008';end if;
 if (select array_agg(c.relname::text order by c.relname::text) from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p')) is distinct from v_tables then raise exception 'Public table inventory differs from verified 008';end if;
 if exists(select 1 from pg_catalog.pg_policies p where (p.schemaname='public' and p.policyname='private_owner_fence') or (p.schemaname='storage' and p.tablename='objects' and p.policyname in ('managed_storage_owner_fence','managed_storage_anon_fence'))) then raise exception 'A 009 policy already exists; stop instead of overwriting';end if;
 lock table auth.users,${tables.map(t=>`public.${t}`).join(',')},private.app_owner,storage.buckets in share row exclusive mode;
 if (select count(*) from private.app_owner)<>1 or not exists(select 1 from private.app_owner o where o.email=${lit(email)})
  or md5((select (to_jsonb(o)-'user_id')::text from private.app_owner o)) is distinct from (select m.statements[4]::jsonb->>'owner_base' from supabase_migrations.schema_migrations m where m.version='008') then raise exception 'Private owner checkpoint differs';end if;
 if (select count(*) from auth.users u where lower(u.email)=${lit(email)})>1
  or not exists(select 1 from private.app_owner o where (o.user_id is null and not exists(select 1 from auth.users u where lower(u.email)=o.email)) or exists(select 1 from auth.users u where u.id=o.user_id and lower(u.email)=o.email)) then raise exception 'Owner Auth identity is inconsistent';end if;
 if exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where ((n.nspname='public' and c.relkind in ('r','p')) or c.oid in ('private.app_owner'::regclass,'storage.objects'::regclass,'supabase_migrations.schema_migrations'::regclass)) and not c.relrowsecurity) then raise exception 'RLS checkpoint changed';end if;
 if exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace cross join (values('anon'),('authenticated')) r(role_name) cross join (values('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER'),('MAINTAIN')) p(privilege) where n.nspname='public' and c.relkind in ('r','p') and has_table_privilege(r.role_name,c.oid,p.privilege)) then raise exception 'Browser table privileges changed before 009';end if;
 if exists(${accessIssues}) then raise exception 'Private permissions checkpoint changed';end if;
 if (select count(*) from storage.buckets b where b.id in ('personal-audio','personal-backups','personal-content') and not b.public)<>3 then raise exception 'Managed buckets must stay private';end if;
 select to_jsonb(p) into v_helper from pg_catalog.pg_proc p where p.oid=to_regprocedure('public.rls_auto_enable()');
 select to_jsonb(e) into v_event from pg_catalog.pg_event_trigger e where e.evtname='ensure_rls';
 if v_helper is null or v_event is null
  or md5(v_helper::text) is distinct from (select substring(m.statements[2] from 'helper_catalog_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations m where m.version='008')
  or md5(v_event::text) is distinct from (select substring(m.statements[2] from 'ensure_rls_catalog_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations m where m.version='008') then raise exception 'RLS helper differs from verified 008';end if;
 if ${checks} then raise exception 'Objects differ from verified 008';end if;
 v_catalog:=${snapshots(preserveKeys)};
 ${rowCapture}
 v_before:=v_rows;

 execute v_sql;

 v_rows:='{}';
 ${rowCapture}
 if v_before is distinct from v_rows then raise exception 'Existing tables or learning records changed; rollback';end if;
 if v_catalog is distinct from ${snapshots(preserveKeys)} then raise exception 'Prior functions, policies, schema, owner or buckets changed; rollback';end if;
 if v_helper is distinct from (select to_jsonb(p) from pg_catalog.pg_proc p where p.oid=to_regprocedure('public.rls_auto_enable()')) or v_event is distinct from (select to_jsonb(e) from pg_catalog.pg_event_trigger e where e.evtname='ensure_rls') then raise exception 'RLS helper changed; rollback';end if;
 if exists(with ${expectedCTE} ${allIssues}) then raise exception 'Final permissions or restrictive policies are incorrect; rollback';end if;
 insert into supabase_migrations.schema_migrations(version,name,statements) values('009','private_permissions_and_storage',array[
  v_sql,format(E'-- helper_catalog_md5=%s; ensure_rls_catalog_md5=%s\n',md5(v_helper::text),md5(v_event::text)),v_before::text,
  (v_catalog||jsonb_build_object('installed_policies',md5((${queries.installed_policies})::text)))::text
 ]);
end;
$deploy_009$;
commit;
select version,name from supabase_migrations.schema_migrations order by version;
`;
write('supabase/dashboard/009_deploy.sql',deploy);
const stored=tables.map(t=>`select ${lit(t)} as t,'public.${t}'::regclass::oid as oid,count(*) as rows,md5(coalesce(jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text),'[]'::jsonb)::text) as content_md5 from public.${t} x`).join('\n union all ');
const labels={functions:'prior_functions_unchanged',policies:'prior_policies_unchanged',triggers:'prior_app_triggers_unchanged',constraints:'prior_constraints_unchanged',columns:'prior_columns_unchanged',owner:'owner_identity_unchanged',buckets:'storage_buckets_unchanged',installed_policies:'installed_policies_unchanged'};
const flags=Object.entries(queries).map(([k,q])=>` ${lit(labels[k])},coalesce(md5((${q})::text)=(select l.hashes->>${lit(k)} from ledger l),false)`).join(',\n');
const verify=String.raw`-- Read-only verification of 009 as postgres. Does NOT prove real browser login/RLS behavior.
with ${expectedCTE}, tables as (
 select e.t,c.oid,c.relrowsecurity from expected e left join pg_catalog.pg_namespace n on n.nspname='public' left join pg_catalog.pg_class c on c.relnamespace=n.oid and c.relname=e.t and c.relkind='r'
), ledger as (select m.statements[3]::jsonb as before_rows,m.statements[4]::jsonb as hashes from supabase_migrations.schema_migrations m where m.version='009'), stored_rows as (
 ${stored}
), problems(kind,detail) as (
 select 'missing_table',t.t from tables t where t.oid is null
 union all select 'rls_disabled',t.t from tables t where t.oid is not null and not t.relrowsecurity
 union all select 'unexpected_table',c.relname::text from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p') and not exists(select 1 from expected e where e.t=c.relname)
 union all ${allIssues}
)
select jsonb_build_object(
 'migration_versions',(select jsonb_agg(m.version order by m.version) from supabase_migrations.schema_migrations m),
 'migration_009_recorded',exists(select 1 from supabase_migrations.schema_migrations m where m.version='009' and m.name='private_permissions_and_storage'),
 'expected_tables',43,'found_tables',(select count(*) from tables t where t.oid is not null),
 'problems',coalesce((select jsonb_agg(jsonb_build_object('check',p.kind,'detail',p.detail) order by p.kind,p.detail) from problems p),'[]'::jsonb),
 'existing_tables_and_data_preserved',coalesce((select jsonb_object_agg(s.t,jsonb_build_object('oid',s.oid,'rows',s.rows,'content_md5',s.content_md5)) from stored_rows s)=(select l.before_rows from ledger l),false),
${flags},
 'owner_configured',(select count(*)=1 and bool_and(o.email=${lit(email)}) from private.app_owner o),
 'owner_table_rls',(select c.relrowsecurity from pg_catalog.pg_class c where c.oid='private.app_owner'::regclass),
 'owner_auth_users',(select count(*) from auth.users u where lower(u.email)=${lit(email)}),
 'owner_account_status',coalesce((select case when u.email_confirmed_at is null then 'unconfirmed' else 'confirmed' end from auth.users u where lower(u.email)=${lit(email)} limit 1),'not_created'),
 'owner_identity_consistent',(select count(*) from auth.users u where lower(u.email)=${lit(email)})<=1 and exists(select 1 from private.app_owner o where o.email=${lit(email)} and ((o.user_id is null and not exists(select 1 from auth.users u where lower(u.email)=o.email)) or exists(select 1 from auth.users u where u.id=o.user_id and lower(u.email)=o.email))),
 'table_owner_fences',(select count(*) from pg_catalog.pg_policies p where p.schemaname='public' and p.tablename=any(${arr(fenced)}) and p.policyname='private_owner_fence' and p.permissive='RESTRICTIVE'),
 'storage_owner_fences',(select count(*) from pg_catalog.pg_policies p where p.schemaname='storage' and p.tablename='objects' and p.policyname in ('managed_storage_owner_fence','managed_storage_anon_fence') and p.permissive='RESTRICTIVE'),
 'private_buckets',(select count(*) from storage.buckets b where b.id in ('personal-audio','personal-backups','personal-content') and not b.public),
 'browser_private_schema_access',exists(select 1 from (values('anon'),('authenticated')) r(role_name) where has_schema_privilege(r.role_name,'private','USAGE') or has_schema_privilege(r.role_name,'private','CREATE')),
 'browser_owner_table_access',exists(select 1 from (values('anon'),('authenticated')) r(role_name) cross join (values('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER'),('MAINTAIN')) p(privilege) where has_table_privilege(r.role_name,'private.app_owner',p.privilege)),
 'browser_ledger_schema_access',exists(select 1 from (values('anon'),('authenticated')) r(role_name) where has_schema_privilege(r.role_name,'supabase_migrations','USAGE') or has_schema_privilege(r.role_name,'supabase_migrations','CREATE')),
 'storage_rls',(select c.relrowsecurity from pg_catalog.pg_class c where c.oid='storage.objects'::regclass),
 'ledger_rls',(select c.relrowsecurity from pg_catalog.pg_class c where c.oid='supabase_migrations.schema_migrations'::regclass),
 'auth_profile_trigger_present',exists(select 1 from pg_catalog.pg_trigger g where g.tgrelid='auth.users'::regclass and g.tgname='on_auth_user_created' and g.tgfoid=to_regprocedure('public.create_user_profile()') and g.tgtype=5 and g.tgenabled='O'),
 'signup_guard_present',exists(select 1 from pg_catalog.pg_trigger g where g.tgrelid='auth.users'::regclass and g.tgname='allow_private_owner_only' and g.tgfoid=to_regprocedure('private.guard_owner_signup()') and g.tgtype=7 and g.tgenabled='O'),
 'rls_helper_unchanged',coalesce((select md5(to_jsonb(p)::text) from pg_catalog.pg_proc p where p.oid=to_regprocedure('public.rls_auto_enable()'))=(select substring(m.statements[2] from 'helper_catalog_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations m where m.version='009'),false),
 'ensure_rls_unchanged',coalesce((select md5(to_jsonb(e)::text) from pg_catalog.pg_event_trigger e where e.evtname='ensure_rls')=(select substring(m.statements[2] from 'ensure_rls_catalog_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations m where m.version='009'),false)
) as migration_009_verification;
`;
write('supabase/dashboard/009_verify.sql',verify);
console.log(`Prepared only 009_deploy.sql and 009_verify.sql; ${tables.length} tables, ${fenced.length} fences, ${readOnly.length} read-only and ${tables.length-readOnly.length-1} CRUD tables. No database connection or execution.`);
