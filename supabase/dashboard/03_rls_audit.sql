-- AFTER migrations, as postgres. Read-only catalog/configuration audit.
-- Empty problem arrays indicate structural checks passed, not a live login test.
with expected(name) as (select unnest(array[
 'users','profiles','user_languages','vocabulary','vocabulary_examples','vocabulary_collocations',
 'grammar','grammar_relations','grammar_examples','user_grammar_progress','articles','reading_progress',
 'saved_sentences','sentence_vocabulary','sentence_grammar','review_items','review_logs',
 'listening_episodes','listening_progress','speaking_sessions','mistakes','ai_conversations','ai_messages',
 'daily_plans','study_sessions','personal_notes','backups','downloads','sync_batches','client_id_map',
 'user_progress','ai_requests','ai_usage','personal_audio_files','languages','courses','lessons',
 'legacy_profiles','legacy_vocabulary','legacy_grammar','legacy_reviews','legacy_study_sessions','legacy_ai_conversations'
])), tables as (
 select e.name,c.oid,c.relrowsecurity from expected e
 left join pg_catalog.pg_namespace n on n.nspname='public'
 left join pg_catalog.pg_class c on c.relnamespace=n.oid and c.relname=e.name and c.relkind in ('r','p')
), problems(kind,detail) as (
 select 'missing_tables',name from tables where oid is null
 union all select 'rls_disabled',name from tables where oid is not null and not relrowsecurity
 union all select 'anonymous_privileges',t.name||':'||g.privilege
  from tables t cross join (values('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) g(privilege)
  where t.oid is not null and has_table_privilege('anon',t.oid,g.privilege)
 union all select 'authenticated_unsafe_privileges',t.name||':'||g.privilege
  from tables t cross join (values('TRUNCATE'),('REFERENCES'),('TRIGGER')) g(privilege)
  where t.oid is not null and has_table_privilege('authenticated',t.oid,g.privilege)
 union all select 'unconditional_policies',p.tablename||':'||p.policyname
  from pg_catalog.pg_policies p join expected e on e.name=p.tablename where p.schemaname='public'
   and (p.qual ~* '(^|[^a-z_])true([^a-z_]|$)' or p.with_check ~* '(^|[^a-z_])true([^a-z_]|$)')
 union all select 'missing_owner_fences',t.name from tables t
  where t.oid is not null and t.name<>'ai_usage' and not exists(
   select 1 from pg_catalog.pg_policy p where p.polrelid=t.oid and p.polname='private_owner_fence'
    and not p.polpermissive and p.polcmd='*'
    and pg_get_expr(p.polqual,p.polrelid) like '%is_private_owner()%'
    and pg_get_expr(p.polwithcheck,p.polrelid) like '%is_private_owner()%'
    and (t.name not in ('users','profiles') or
      (pg_get_expr(p.polqual,p.polrelid) like '%auth.uid()%' and pg_get_expr(p.polwithcheck,p.polrelid) like '%auth.uid()%'))
    and (not exists(select 1 from pg_catalog.pg_attribute a where a.attrelid=t.oid and a.attname='user_id' and not a.attisdropped) or
      (pg_get_expr(p.polqual,p.polrelid) like '%user_id%' and pg_get_expr(p.polqual,p.polrelid) like '%auth.uid()%'
       and pg_get_expr(p.polwithcheck,p.polrelid) like '%user_id%' and pg_get_expr(p.polwithcheck,p.polrelid) like '%auth.uid()%'))
  )
 union all select 'rpc_only_table_writable',t.name||':'||g.privilege
  from tables t cross join (values('INSERT'),('UPDATE'),('DELETE')) g(privilege)
  where t.name in ('users','user_progress','review_items','review_logs','sync_batches','client_id_map','ai_requests','ai_usage',
   'languages','courses','lessons','legacy_profiles','legacy_vocabulary','legacy_grammar','legacy_reviews','legacy_study_sessions','legacy_ai_conversations')
   and t.oid is not null and has_table_privilege('authenticated',t.oid,g.privilege)
 union all select 'private_schema_exposed',r.role from (values('anon'),('authenticated')) r(role)
  where has_schema_privilege(r.role,'private','USAGE')
)
select jsonb_build_object(
 'expected_tables',(select count(*) from expected),
 'problems',coalesce((select jsonb_agg(jsonb_build_object('check',kind,'detail',detail) order by kind,detail) from problems),'[]'::jsonb),
 'private_owner_configured',exists(select 1 from private.app_owner where email='yzh72339@gmail.com'),
 'owner_auth_uuid_bound',exists(select 1 from private.app_owner where user_id is not null),
 'private_config_rls',(select relrowsecurity from pg_catalog.pg_class where oid='private.app_owner'::regclass),
 'storage',coalesce((select jsonb_agg(jsonb_build_object('id',id,'public',public) order by id) from storage.buckets where id in ('personal-audio','personal-backups','personal-content')),'[]'::jsonb),
 'storage_rls',(select relrowsecurity from pg_catalog.pg_class where oid='storage.objects'::regclass),
 'storage_restrictive_fences',(select count(*) from pg_catalog.pg_policy where polrelid='storage.objects'::regclass and not polpermissive and polname in ('managed_storage_owner_fence','managed_storage_anon_fence')),
 'parent_ownership_policies',coalesce((select jsonb_agg(jsonb_build_object('table',tablename,'command',cmd,'using',qual,'with_check',with_check) order by tablename) from pg_catalog.pg_policies where schemaname='public' and (tablename in ('vocabulary_examples','vocabulary_collocations') and policyname='parent_owned' or tablename='sentence_vocabulary' and policyname='both_owned' or tablename='sentence_grammar' and policyname='sentence_owned')),'[]'::jsonb),
 'browser_can_configure_owner',has_function_privilege('authenticated','public.configure_private_owner(text)','EXECUTE'),
 'anon_can_load_account',has_function_privilege('anon','public.get_private_account()','EXECUTE')
) as rls_audit;
