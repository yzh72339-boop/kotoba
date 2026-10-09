-- Read only. No user data, function or migration is changed.
with projection as (
 select coalesce(pg_get_functiondef(to_regprocedure('private.project_learning_state(uuid,jsonb)')),'') as definition
), problems as (
 select 'missing_migration_011' as problem where not exists(
  select 1 from supabase_migrations.schema_migrations where version='011' and name='text_event_identity')
 union all select 'text_mistake_event_not_ready' from projection where strpos(definition,
  $check$event_id:=case when j->>'id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then (j->>'id')::uuid else entity end;$check$)=0
 union all select 'text_study_event_not_ready' from projection where strpos(definition,
  $check$(j->>'count')::int,case when j->>'id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then (j->>'id')::uuid else entity end)$check$)=0
 union all select 'private_execute:'||r.role_name||':'||p.oid::regprocedure::text
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace cross join (values('anon'),('authenticated')) r(role_name)
  where n.nspname='private' and has_function_privilege(r.role_name,p.oid,'EXECUTE')
 union all select 'rls_disabled:'||c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind='r' and not c.relrowsecurity
 union all select 'unconditional_policy:'||tablename||':'||policyname from pg_policies
  where schemaname='public' and (trim(qual,' ()')='true' or trim(with_check,' ()')='true')
)
select jsonb_build_object(
 'problems',coalesce((select jsonb_agg(problem) from problems),'[]'::jsonb),
 'migration_011_recorded',exists(select 1 from supabase_migrations.schema_migrations where version='011' and name='text_event_identity'),
 'private_helpers_browser_access',exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='private' and (has_function_privilege('anon',p.oid,'EXECUTE') or has_function_privilege('authenticated',p.oid,'EXECUTE'))),
 'private_buckets',(select count(*) from storage.buckets where id in ('personal-audio','personal-content','personal-backups') and not public)
) as migration_011_verification;
