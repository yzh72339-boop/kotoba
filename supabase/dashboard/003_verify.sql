-- Read-only verification AFTER 003_deploy.sql succeeds, as postgres.
-- No RPC is invoked. This is not a review/sync runtime or browser acceptance test.
with expected(t) as (select unnest(array['ai_conversations','ai_messages','ai_usage','articles','backups','client_id_map','courses','daily_plans','downloads','grammar','grammar_examples','grammar_relations','languages','legacy_ai_conversations','legacy_grammar','legacy_profiles','legacy_reviews','legacy_study_sessions','legacy_vocabulary','lessons','listening_episodes','listening_progress','mistakes','personal_notes','profiles','reading_progress','review_items','review_logs','saved_sentences','sentence_grammar','sentence_vocabulary','speaking_sessions','study_sessions','sync_batches','user_grammar_progress','user_languages','user_progress','users','vocabulary','vocabulary_collocations','vocabulary_examples'])), tables as (
 select e.t,c.oid,c.relrowsecurity from expected e left join pg_catalog.pg_namespace n on n.nspname='public'
 left join pg_catalog.pg_class c on c.relnamespace=n.oid and c.relname=e.t and c.relkind='r'
), function_expected(signature,definer,browser) as (values
 ('public.record_review(uuid,uuid,text,timestamptz,integer)',true,true),
 ('public.sync_personal_state(bigint,text,jsonb)',true,true),
 ('public.personal_progress(text)',false,true),
 ('private.resolve_id(uuid,text,text)',true,false),
 ('private.validate_review_target()',false,false),
 ('private.create_review_item()',true,false),
 ('private.create_grammar_review()',true,false),
 ('private.project_state(uuid,jsonb)',true,false)
), functions as (
 select f.*,p.oid,p.prosecdef,p.proowner,p.proconfig,p.prosrc,l.lanname from function_expected f
 left join pg_catalog.pg_proc p on p.oid=to_regprocedure(f.signature)
 left join pg_catalog.pg_language l on l.oid=p.prolang
), trigger_expected(t,name,signature,event_mask) as (values
 ('review_items','validate_review_target','private.validate_review_target()',23),
 ('vocabulary','vocabulary_enters_srs','private.create_review_item()',5),
 ('saved_sentences','sentences_enter_srs','private.create_review_item()',5),
 ('user_grammar_progress','grammar_enters_srs','private.create_grammar_review()',5)
), stored_rows(t,oid,rows) as (
 select 'ai_conversations','public.ai_conversations'::regclass::oid,count(*) from public.ai_conversations
 union all select 'ai_messages','public.ai_messages'::regclass::oid,count(*) from public.ai_messages
 union all select 'ai_usage','public.ai_usage'::regclass::oid,count(*) from public.ai_usage
 union all select 'articles','public.articles'::regclass::oid,count(*) from public.articles
 union all select 'backups','public.backups'::regclass::oid,count(*) from public.backups
 union all select 'client_id_map','public.client_id_map'::regclass::oid,count(*) from public.client_id_map
 union all select 'courses','public.courses'::regclass::oid,count(*) from public.courses
 union all select 'daily_plans','public.daily_plans'::regclass::oid,count(*) from public.daily_plans
 union all select 'downloads','public.downloads'::regclass::oid,count(*) from public.downloads
 union all select 'grammar','public.grammar'::regclass::oid,count(*) from public.grammar
 union all select 'grammar_examples','public.grammar_examples'::regclass::oid,count(*) from public.grammar_examples
 union all select 'grammar_relations','public.grammar_relations'::regclass::oid,count(*) from public.grammar_relations
 union all select 'languages','public.languages'::regclass::oid,count(*) from public.languages
 union all select 'legacy_ai_conversations','public.legacy_ai_conversations'::regclass::oid,count(*) from public.legacy_ai_conversations
 union all select 'legacy_grammar','public.legacy_grammar'::regclass::oid,count(*) from public.legacy_grammar
 union all select 'legacy_profiles','public.legacy_profiles'::regclass::oid,count(*) from public.legacy_profiles
 union all select 'legacy_reviews','public.legacy_reviews'::regclass::oid,count(*) from public.legacy_reviews
 union all select 'legacy_study_sessions','public.legacy_study_sessions'::regclass::oid,count(*) from public.legacy_study_sessions
 union all select 'legacy_vocabulary','public.legacy_vocabulary'::regclass::oid,count(*) from public.legacy_vocabulary
 union all select 'lessons','public.lessons'::regclass::oid,count(*) from public.lessons
 union all select 'listening_episodes','public.listening_episodes'::regclass::oid,count(*) from public.listening_episodes
 union all select 'listening_progress','public.listening_progress'::regclass::oid,count(*) from public.listening_progress
 union all select 'mistakes','public.mistakes'::regclass::oid,count(*) from public.mistakes
 union all select 'personal_notes','public.personal_notes'::regclass::oid,count(*) from public.personal_notes
 union all select 'profiles','public.profiles'::regclass::oid,count(*) from public.profiles
 union all select 'reading_progress','public.reading_progress'::regclass::oid,count(*) from public.reading_progress
 union all select 'review_items','public.review_items'::regclass::oid,count(*) from public.review_items
 union all select 'review_logs','public.review_logs'::regclass::oid,count(*) from public.review_logs
 union all select 'saved_sentences','public.saved_sentences'::regclass::oid,count(*) from public.saved_sentences
 union all select 'sentence_grammar','public.sentence_grammar'::regclass::oid,count(*) from public.sentence_grammar
 union all select 'sentence_vocabulary','public.sentence_vocabulary'::regclass::oid,count(*) from public.sentence_vocabulary
 union all select 'speaking_sessions','public.speaking_sessions'::regclass::oid,count(*) from public.speaking_sessions
 union all select 'study_sessions','public.study_sessions'::regclass::oid,count(*) from public.study_sessions
 union all select 'sync_batches','public.sync_batches'::regclass::oid,count(*) from public.sync_batches
 union all select 'user_grammar_progress','public.user_grammar_progress'::regclass::oid,count(*) from public.user_grammar_progress
 union all select 'user_languages','public.user_languages'::regclass::oid,count(*) from public.user_languages
 union all select 'user_progress','public.user_progress'::regclass::oid,count(*) from public.user_progress
 union all select 'users','public.users'::regclass::oid,count(*) from public.users
 union all select 'vocabulary','public.vocabulary'::regclass::oid,count(*) from public.vocabulary
 union all select 'vocabulary_collocations','public.vocabulary_collocations'::regclass::oid,count(*) from public.vocabulary_collocations
 union all select 'vocabulary_examples','public.vocabulary_examples'::regclass::oid,count(*) from public.vocabulary_examples
), problems(kind,detail) as (
 select 'missing_table',t from tables where oid is null
 union all select 'rls_disabled',t from tables where oid is not null and not relrowsecurity
 union all select 'unexpected_table',c.relname::text from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind in ('r','p') and not exists(select 1 from expected e where e.t=c.relname)
 union all select 'browser_table_privilege',t.t||':'||r.role_name||':'||v.privilege from tables t
  cross join (values('anon'),('authenticated')) r(role_name)
  cross join (values('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) v(privilege)
  where t.oid is not null and has_table_privilege(r.role_name,t.oid,v.privilege)
 union all select 'invalid_function',signature from functions where oid is null or prosecdef is distinct from definer
  or lanname is distinct from 'plpgsql' or pg_get_userbyid(proowner) is distinct from 'postgres'
  or not exists(select 1 from unnest(proconfig) s where split_part(s,'=',1)='search_path'
   and trim(split_part(s,'=',2),E' \'"')='')
 union all select 'invalid_function_grant',f.signature||':'||r.role_name from functions f
  cross join (values('anon'),('authenticated')) r(role_name) where f.oid is not null
   and has_function_privilege(r.role_name,f.oid,'EXECUTE') is distinct from (f.browser and r.role_name='authenticated')
 union all select 'missing_rpc_owner_guard',signature from functions where browser
  and position('is_private_owner'in coalesce(prosrc,''))=0
 union all select 'invalid_trigger',x.t||':'||x.name from trigger_expected x where not exists(
  select 1 from pg_catalog.pg_trigger g where g.tgrelid=to_regclass('public.'||x.t) and g.tgname=x.name
   and g.tgfoid=to_regprocedure(x.signature) and g.tgtype=x.event_mask and g.tgenabled='O'
 )
 union all select 'missing_review_idempotency_constraint','review_logs(user_id,client_event_id)' where not exists(
  select 1 from pg_catalog.pg_constraint c where c.conrelid='public.review_logs'::regclass and c.contype='u' and c.convalidated
   and (select array_agg(a.attname::text order by k.ord) from unnest(c.conkey) with ordinality k(num,ord)
    join pg_catalog.pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.num)=array['user_id','client_event_id']
 )
 union all select 'missing_sync_idempotency_constraint','sync_batches(user_id,batch_id)' where not exists(
  select 1 from pg_catalog.pg_constraint c where c.conrelid='public.sync_batches'::regclass and c.contype='p' and c.convalidated
   and (select array_agg(a.attname::text order by k.ord) from unnest(c.conkey) with ordinality k(num,ord)
    join pg_catalog.pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.num)=array['user_id','batch_id']
 )
)
select jsonb_build_object(
 'migration_versions',(select jsonb_agg(version order by version) from supabase_migrations.schema_migrations),
 'migration_003_recorded',exists(select 1 from supabase_migrations.schema_migrations where version='003' and name='sync_and_srs'),
 'expected_tables',41,'found_tables',(select count(*) from tables where oid is not null),
 'expected_functions',8,'found_functions',(select count(*) from functions where oid is not null),
 'problems',coalesce((select jsonb_agg(jsonb_build_object('check',kind,'detail',detail) order by kind,detail) from problems),'[]'::jsonb),
 'existing_tables_preserved',coalesce((select jsonb_object_agg(t,jsonb_build_object('oid',oid,'rows',rows)) from stored_rows)=
  (select substring(statements[3] from 'table_oid_and_rows=([^\n]+)')::jsonb from supabase_migrations.schema_migrations where version='003'),false),
 'policies_unchanged',coalesce(md5((select jsonb_agg(to_jsonb(p) order by p.schemaname,p.tablename,p.policyname)
 from pg_catalog.pg_policies p where p.schemaname='public' or (p.schemaname='storage' and p.tablename='objects'))::text)=
  (select substring(statements[4] from 'policies_catalog_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations where version='003'),false),
 'auth_functions_unchanged',coalesce(md5((select jsonb_agg(to_jsonb(p) order by p.oid) from pg_catalog.pg_proc p
 where p.oid in (select to_regprocedure(s) from unnest(array['public.create_user_profile()','public.configure_private_owner(text)','public.is_private_owner()','public.consume_ai_request(uuid)','private.guard_owner_signup()','private.touch_updated_at()']) s))::text)=
  (select substring(statements[4] from 'protected_functions_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations where version='003'),false),
 'installed_functions_unchanged',coalesce(md5((select jsonb_agg(to_jsonb(p) order by p.oid) from pg_catalog.pg_proc p
 where p.oid in (select to_regprocedure(s) from unnest(array['public.record_review(uuid,uuid,text,timestamptz,integer)','public.sync_personal_state(bigint,text,jsonb)','public.personal_progress(text)','private.resolve_id(uuid,text,text)','private.validate_review_target()','private.create_review_item()','private.create_grammar_review()','private.project_state(uuid,jsonb)']) s))::text)=
  (select substring(statements[4] from 'installed_functions_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations where version='003'),false),
 'owner_configured',(select count(*)=1 and bool_and(email='yzh72339@gmail.com') from private.app_owner),
 'owner_table_rls',(select relrowsecurity from pg_catalog.pg_class where oid='private.app_owner'::regclass),
 'browser_private_schema_access',has_schema_privilege('anon','private','USAGE') or has_schema_privilege('authenticated','private','USAGE'),
 'browser_owner_table_access',exists(select 1 from (values('anon'),('authenticated')) r(role_name)
  cross join (values('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) v(privilege)
  where has_table_privilege(r.role_name,'private.app_owner',v.privilege)),
 'private_buckets',(select count(*) from storage.buckets where id in ('personal-audio','personal-backups','personal-content') and not public),
 'auth_profile_trigger_present',exists(select 1 from pg_catalog.pg_trigger where tgrelid='auth.users'::regclass
  and tgname='on_auth_user_created' and tgfoid=to_regprocedure('public.create_user_profile()') and tgtype=5 and tgenabled='O'),
 'signup_guard_present',exists(select 1 from pg_catalog.pg_trigger where tgrelid='auth.users'::regclass
  and tgname='allow_private_owner_only' and tgfoid=to_regprocedure('private.guard_owner_signup()') and tgtype=7 and tgenabled='O'),
 'storage_rls',(select relrowsecurity from pg_catalog.pg_class where oid='storage.objects'::regclass),
 'ledger_rls',(select relrowsecurity from pg_catalog.pg_class where oid='supabase_migrations.schema_migrations'::regclass),
 'browser_ledger_schema_access',has_schema_privilege('anon','supabase_migrations','USAGE') or has_schema_privilege('authenticated','supabase_migrations','USAGE'),
 'rls_helper_unchanged',coalesce((select md5(to_jsonb(p)::text) from pg_catalog.pg_proc p where p.oid=to_regprocedure('public.rls_auto_enable()'))=
  (select substring(statements[2] from 'helper_catalog_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations where version='003'),false),
 'ensure_rls_unchanged',coalesce((select md5(to_jsonb(e)::text) from pg_catalog.pg_event_trigger e where e.evtname='ensure_rls')=
  (select substring(statements[2] from 'ensure_rls_catalog_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations where version='003'),false)
) as migration_003_verification;
