-- Read-only inspection after the failed 004 transaction. Run as postgres.
-- Does not execute a migration, RPC, or cleanup operation.
select jsonb_build_object(
 'migration_versions',(select jsonb_agg(version order by version) from supabase_migrations.schema_migrations),
 'migration_004_recorded',exists(select 1 from supabase_migrations.schema_migrations where version='004'),
 'ai_requests_exists',to_regclass('public.ai_requests') is not null,
 'claim_ai_request_exists',to_regprocedure('public.claim_ai_request(uuid)') is not null,
 'public_table_count',(select count(*) from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind in ('r','p')),
 'starter_grammar_ids',(select count(*) from public.grammar where id::text=any(array[
  '10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003'])),
 'starter_article_ids',(select count(*) from public.articles where id::text=any(array[
  '20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002'])),
 'starter_listening_ids',(select count(*) from public.listening_episodes where id::text=any(array[
  '30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002'])),
 'starter_grammar_titles',(select count(*) from public.grammar where (language_code,title) in
  (('ja','〜わけではない'),('ja','〜とは限らない'),('en','The present perfect'))),
 'rls_helper_unchanged',coalesce((select md5(to_jsonb(p)::text) from pg_catalog.pg_proc p where p.oid=to_regprocedure('public.rls_auto_enable()'))=
  (select substring(statements[2] from 'helper_catalog_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations where version='003'),false),
 'ensure_rls_unchanged',coalesce((select md5(to_jsonb(e)::text) from pg_catalog.pg_event_trigger e where e.evtname='ensure_rls')=
  (select substring(statements[2] from 'ensure_rls_catalog_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations where version='003'),false)
) as migration_004_failure_inventory;
