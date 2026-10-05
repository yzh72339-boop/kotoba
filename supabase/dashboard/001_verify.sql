-- Read-only verification AFTER 001_deploy.sql succeeds, as postgres.
-- This checks checkpoint 001: structure, policies, closed browser access,
-- and preservation of the existing RLS helper. It is not final login acceptance.
with expected(t) as (select unnest(array[
 'languages','users','profiles','courses','lessons','vocabulary','grammar',
 'reviews','study_sessions','user_progress','ai_conversations','ai_usage'
])), tables as (
 select e.t,c.oid,c.relrowsecurity from expected e
 left join pg_catalog.pg_namespace n on n.nspname='public'
 left join pg_catalog.pg_class c on c.relnamespace=n.oid and c.relname=e.t and c.relkind='r'
), personal(t,policy,column_name,command) as (values
 ('users','own user','id','SELECT'),('profiles','own profile','user_id','ALL'),
 ('reviews','own reviews','user_id','ALL'),('study_sessions','own sessions','user_id','ALL'),
 ('user_progress','own progress','user_id','ALL'),('ai_conversations','own conversations','user_id','ALL')
), problems(kind,detail) as (
 select 'missing_table',t from tables where oid is null
 union all select 'rls_disabled',t from tables where oid is not null and not relrowsecurity
 union all select 'browser_privilege',t.t||':'||r.role_name||':'||v.privilege
  from tables t cross join (values('anon'),('authenticated')) r(role_name)
  cross join (values('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) v(privilege)
  where t.oid is not null and has_table_privilege(r.role_name,t.oid,v.privilege)
 union all select 'missing_closed_fence',t.t from tables t where not exists(
  select 1 from pg_catalog.pg_policies p where p.schemaname='public' and p.tablename=t.t
   and p.policyname='stage_001_closed' and p.permissive='RESTRICTIVE' and p.cmd='ALL'
   and p.qual='false' and p.with_check='false' and 'anon'=any(p.roles) and 'authenticated'=any(p.roles)
 )
 union all select 'invalid_personal_policy',x.t from personal x
  left join pg_catalog.pg_policies p on p.schemaname='public' and p.tablename=x.t and p.policyname=x.policy
  where p.cmd is distinct from x.command or not coalesce('authenticated'=any(p.roles),false)
   or regexp_replace(coalesce(p.qual,''),'[[:space:]()]','','g')<>'auth.uid='||x.column_name
   or (x.command='ALL' and regexp_replace(coalesce(p.with_check,''),'[[:space:]()]','','g')<>'auth.uid='||x.column_name)
 union all select 'unconditional_policy',p.tablename||':'||p.policyname
  from pg_catalog.pg_policies p join expected e on e.t=p.tablename where p.schemaname='public'
   and (p.qual ~* '(^|[^a-z_])true([^a-z_]|$)' or p.with_check ~* '(^|[^a-z_])true([^a-z_]|$)')
 union all select 'browser_rpc_execute',r.role_name||':'||f.signature
  from (values('anon'),('authenticated')) r(role_name)
  cross join (values('public.create_user_profile()'),('public.consume_ai_request(uuid)')) f(signature)
  where has_function_privilege(r.role_name,f.signature,'EXECUTE')
)
select jsonb_build_object(
 'migration_versions',(select jsonb_agg(version order by version) from supabase_migrations.schema_migrations),
 'migration_001_recorded',exists(select 1 from supabase_migrations.schema_migrations where version='001' and name='kotoba'),
 'expected_tables',12,
 'found_tables',(select count(*) from tables where oid is not null),
 'problems',coalesce((select jsonb_agg(jsonb_build_object('check',kind,'detail',detail) order by kind,detail) from problems),'[]'::jsonb),
 'languages',(select jsonb_agg(id order by id) from public.languages),
 'auth_profile_trigger_present',exists(select 1 from pg_catalog.pg_trigger where tgrelid='auth.users'::regclass
  and tgname='on_auth_user_created' and tgfoid=to_regprocedure('public.create_user_profile()') and tgtype=5 and tgenabled='O'),
 'profiles_backfilled',not exists(select 1 from auth.users a left join public.users u on u.id=a.id
  left join public.profiles p on p.user_id=a.id where u.id is null or p.user_id is null),
 'ledger_rls',(select relrowsecurity from pg_catalog.pg_class where oid='supabase_migrations.schema_migrations'::regclass),
 'browser_ledger_schema_access',has_schema_privilege('anon','supabase_migrations','USAGE') or has_schema_privilege('authenticated','supabase_migrations','USAGE'),
 'rls_helper_unchanged',coalesce(
  (select md5(to_jsonb(p)::text) from pg_catalog.pg_proc p where p.oid=to_regprocedure('public.rls_auto_enable()'))=
  (select substring(statements[2] from 'helper_catalog_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations where version='001'),false),
 'ensure_rls_unchanged',coalesce(
  (select md5(to_jsonb(t)::text) from pg_catalog.pg_event_trigger t where t.evtname='ensure_rls')=
  (select substring(statements[2] from 'ensure_rls_catalog_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations where version='001'),false)
) as migration_001_verification;
