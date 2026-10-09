-- Read-only catalog verification. Owner runtime/sync tests are separate.
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
