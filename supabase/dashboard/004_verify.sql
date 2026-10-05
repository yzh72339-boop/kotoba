-- Read-only verification AFTER 004_deploy.sql succeeds, as postgres.
-- Does not call AI/RPCs, change roles, or insert test data.
with expected(t) as (select unnest(array['ai_conversations','ai_messages','ai_requests','ai_usage','articles','backups','client_id_map','courses','daily_plans','downloads','grammar','grammar_examples','grammar_relations','languages','legacy_ai_conversations','legacy_grammar','legacy_profiles','legacy_reviews','legacy_study_sessions','legacy_vocabulary','lessons','listening_episodes','listening_progress','mistakes','personal_notes','profiles','reading_progress','review_items','review_logs','saved_sentences','sentence_grammar','sentence_vocabulary','speaking_sessions','study_sessions','sync_batches','user_grammar_progress','user_languages','user_progress','users','vocabulary','vocabulary_collocations','vocabulary_examples'])), tables as (
 select e.t,c.oid,c.relrowsecurity from expected e left join pg_catalog.pg_namespace n on n.nspname='public'
 left join pg_catalog.pg_class c on c.relnamespace=n.oid and c.relname=e.t and c.relkind='r'
), ledger as (
 select statements[3]::jsonb as snapshot,statements[4]::jsonb as hashes from supabase_migrations.schema_migrations where version='004'
), stored_rows as (
 select 'ai_conversations' as t,'public.ai_conversations'::regclass::oid as oid,count(*) as rows from public.ai_conversations
 union all select 'ai_messages' as t,'public.ai_messages'::regclass::oid as oid,count(*) as rows from public.ai_messages
 union all select 'ai_usage' as t,'public.ai_usage'::regclass::oid as oid,count(*) as rows from public.ai_usage
 union all select 'articles' as t,'public.articles'::regclass::oid as oid,count(*) as rows from public.articles
 union all select 'backups' as t,'public.backups'::regclass::oid as oid,count(*) as rows from public.backups
 union all select 'client_id_map' as t,'public.client_id_map'::regclass::oid as oid,count(*) as rows from public.client_id_map
 union all select 'courses' as t,'public.courses'::regclass::oid as oid,count(*) as rows from public.courses
 union all select 'daily_plans' as t,'public.daily_plans'::regclass::oid as oid,count(*) as rows from public.daily_plans
 union all select 'downloads' as t,'public.downloads'::regclass::oid as oid,count(*) as rows from public.downloads
 union all select 'grammar' as t,'public.grammar'::regclass::oid as oid,count(*) as rows from public.grammar
 union all select 'grammar_examples' as t,'public.grammar_examples'::regclass::oid as oid,count(*) as rows from public.grammar_examples
 union all select 'grammar_relations' as t,'public.grammar_relations'::regclass::oid as oid,count(*) as rows from public.grammar_relations
 union all select 'languages' as t,'public.languages'::regclass::oid as oid,count(*) as rows from public.languages
 union all select 'legacy_ai_conversations' as t,'public.legacy_ai_conversations'::regclass::oid as oid,count(*) as rows from public.legacy_ai_conversations
 union all select 'legacy_grammar' as t,'public.legacy_grammar'::regclass::oid as oid,count(*) as rows from public.legacy_grammar
 union all select 'legacy_profiles' as t,'public.legacy_profiles'::regclass::oid as oid,count(*) as rows from public.legacy_profiles
 union all select 'legacy_reviews' as t,'public.legacy_reviews'::regclass::oid as oid,count(*) as rows from public.legacy_reviews
 union all select 'legacy_study_sessions' as t,'public.legacy_study_sessions'::regclass::oid as oid,count(*) as rows from public.legacy_study_sessions
 union all select 'legacy_vocabulary' as t,'public.legacy_vocabulary'::regclass::oid as oid,count(*) as rows from public.legacy_vocabulary
 union all select 'lessons' as t,'public.lessons'::regclass::oid as oid,count(*) as rows from public.lessons
 union all select 'listening_episodes' as t,'public.listening_episodes'::regclass::oid as oid,count(*) as rows from public.listening_episodes
 union all select 'listening_progress' as t,'public.listening_progress'::regclass::oid as oid,count(*) as rows from public.listening_progress
 union all select 'mistakes' as t,'public.mistakes'::regclass::oid as oid,count(*) as rows from public.mistakes
 union all select 'personal_notes' as t,'public.personal_notes'::regclass::oid as oid,count(*) as rows from public.personal_notes
 union all select 'profiles' as t,'public.profiles'::regclass::oid as oid,count(*) as rows from public.profiles
 union all select 'reading_progress' as t,'public.reading_progress'::regclass::oid as oid,count(*) as rows from public.reading_progress
 union all select 'review_items' as t,'public.review_items'::regclass::oid as oid,count(*) as rows from public.review_items
 union all select 'review_logs' as t,'public.review_logs'::regclass::oid as oid,count(*) as rows from public.review_logs
 union all select 'saved_sentences' as t,'public.saved_sentences'::regclass::oid as oid,count(*) as rows from public.saved_sentences
 union all select 'sentence_grammar' as t,'public.sentence_grammar'::regclass::oid as oid,count(*) as rows from public.sentence_grammar
 union all select 'sentence_vocabulary' as t,'public.sentence_vocabulary'::regclass::oid as oid,count(*) as rows from public.sentence_vocabulary
 union all select 'speaking_sessions' as t,'public.speaking_sessions'::regclass::oid as oid,count(*) as rows from public.speaking_sessions
 union all select 'study_sessions' as t,'public.study_sessions'::regclass::oid as oid,count(*) as rows from public.study_sessions
 union all select 'sync_batches' as t,'public.sync_batches'::regclass::oid as oid,count(*) as rows from public.sync_batches
 union all select 'user_grammar_progress' as t,'public.user_grammar_progress'::regclass::oid as oid,count(*) as rows from public.user_grammar_progress
 union all select 'user_languages' as t,'public.user_languages'::regclass::oid as oid,count(*) as rows from public.user_languages
 union all select 'user_progress' as t,'public.user_progress'::regclass::oid as oid,count(*) as rows from public.user_progress
 union all select 'users' as t,'public.users'::regclass::oid as oid,count(*) as rows from public.users
 union all select 'vocabulary' as t,'public.vocabulary'::regclass::oid as oid,count(*) as rows from public.vocabulary
 union all select 'vocabulary_collocations' as t,'public.vocabulary_collocations'::regclass::oid as oid,count(*) as rows from public.vocabulary_collocations
 union all select 'vocabulary_examples' as t,'public.vocabulary_examples'::regclass::oid as oid,count(*) as rows from public.vocabulary_examples
), content_preservation as (
 select 'grammar' as t,coalesce(jsonb_object_agg(x.id::text,md5(to_jsonb(x)::text)),'{}'::jsonb) as fingerprint from public.grammar x where (select statements[3]::jsonb#>array['content','grammar'] from supabase_migrations.schema_migrations where version='004') ? x.id::text
 union all select 'grammar_relations' as t,coalesce(jsonb_object_agg(x.id::text,md5(to_jsonb(x)::text)),'{}'::jsonb) as fingerprint from public.grammar_relations x where (select statements[3]::jsonb#>array['content','grammar_relations'] from supabase_migrations.schema_migrations where version='004') ? x.id::text
 union all select 'grammar_examples' as t,coalesce(jsonb_object_agg(x.id::text,md5(to_jsonb(x)::text)),'{}'::jsonb) as fingerprint from public.grammar_examples x where (select statements[3]::jsonb#>array['content','grammar_examples'] from supabase_migrations.schema_migrations where version='004') ? x.id::text
 union all select 'articles' as t,coalesce(jsonb_object_agg(x.id::text,md5(to_jsonb(x)::text)),'{}'::jsonb) as fingerprint from public.articles x where (select statements[3]::jsonb#>array['content','articles'] from supabase_migrations.schema_migrations where version='004') ? x.id::text
 union all select 'listening_episodes' as t,coalesce(jsonb_object_agg(x.id::text,md5(to_jsonb(x)::text)),'{}'::jsonb) as fingerprint from public.listening_episodes x where (select statements[3]::jsonb#>array['content','listening_episodes'] from supabase_migrations.schema_migrations where version='004') ? x.id::text
), seed_rows as (select 'grammar' as t,id::text as id,to_jsonb(x) as data from public.grammar x where id::text=any(array['10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003'])
 union all select 'articles' as t,id::text as id,to_jsonb(x) as data from public.articles x where id::text=any(array['20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002'])
 union all select 'listening_episodes' as t,id::text as id,to_jsonb(x) as data from public.listening_episodes x where id::text=any(array['30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002'])), problems(kind,detail) as (
 select 'missing_table',t from tables where oid is null
 union all select 'rls_disabled',t from tables where oid is not null and not relrowsecurity
 union all select 'unexpected_table',c.relname::text from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind in ('r','p') and not exists(select 1 from expected e where e.t=c.relname)
 union all select 'browser_table_privilege',t.t||':'||r.role_name||':'||v.privilege from tables t
  cross join (values('anon'),('authenticated')) r(role_name)
  cross join (values('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) v(privilege)
  where t.oid is not null and has_table_privilege(r.role_name,t.oid,v.privilege)
 union all select 'invalid_claim_function','public.claim_ai_request(uuid)' where not exists(
  select 1 from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
  where p.oid=to_regprocedure('public.claim_ai_request(uuid)') and p.prosecdef and l.lanname='plpgsql'
   and pg_get_userbyid(p.proowner)='postgres' and position('is_private_owner' in p.prosrc)>0
   and position('auth.uid()' in p.prosrc)>0 and position('p_request is null' in p.prosrc)>0
   and exists(select 1 from unnest(p.proconfig) s where split_part(s,'=',1)='search_path' and trim(split_part(s,'=',2),E' \'"')='')
 )
 union all select 'invalid_claim_grant',r.role_name from (values('anon'),('authenticated')) r(role_name)
  where to_regprocedure('public.claim_ai_request(uuid)') is not null
   and has_function_privilege(r.role_name,to_regprocedure('public.claim_ai_request(uuid)'),'EXECUTE') is distinct from (r.role_name='authenticated')
 union all select 'invalid_ai_policy','ai_requests:owner_read' where (select count(*) from pg_catalog.pg_policies where schemaname='public' and tablename='ai_requests')<>1 or not exists(
  select 1 from pg_catalog.pg_policies p where p.schemaname='public' and p.tablename='ai_requests'
   and p.policyname='owner_read' and p.cmd='SELECT' and p.roles=array['authenticated']::name[] and p.with_check is null
   and position('is_private_owner' in p.qual)>0 and position('user_id' in p.qual)>0 and position('auth.uid()' in p.qual)>0
 )
 union all select 'invalid_ai_primary_key','ai_requests(user_id,request_id)' where not exists(
  select 1 from pg_catalog.pg_constraint c where c.conrelid='public.ai_requests'::regclass and c.contype='p' and c.convalidated
   and (select array_agg(a.attname::text order by k.ord) from unnest(c.conkey) with ordinality k(num,ord)
    join pg_catalog.pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.num)=array['user_id','request_id']
 )
 union all select 'invalid_ai_user_fk','ai_requests.user_id -> auth.users.id' where not exists(
  select 1 from pg_catalog.pg_constraint c where c.conrelid='public.ai_requests'::regclass and c.contype='f' and c.convalidated
   and c.confrelid='auth.users'::regclass and c.confdeltype='c'
   and c.conkey=array[(select attnum from pg_catalog.pg_attribute where attrelid=c.conrelid and attname='user_id')]::smallint[]
   and c.confkey=array[(select attnum from pg_catalog.pg_attribute where attrelid=c.confrelid and attname='id')]::smallint[]
 )
 union all select 'invalid_ai_status_constraint','pending / complete / failed' where not exists(
  select 1 from pg_catalog.pg_constraint c where c.conrelid='public.ai_requests'::regclass and c.contype='c' and c.convalidated
   and pg_get_constraintdef(c.oid) like '%status%' and pg_get_constraintdef(c.oid) like '%pending%'
   and pg_get_constraintdef(c.oid) like '%complete%' and pg_get_constraintdef(c.oid) like '%failed%'
 )
 union all select 'invalid_ai_column',x.name from (values('user_id','uuid',true),('request_id','uuid',true),('status','text',true),('response','jsonb',false),('started_at','timestamp with time zone',true),('completed_at','timestamp with time zone',false)) x(name,type,not_null)
  where not exists(select 1 from pg_catalog.pg_attribute a where a.attrelid='public.ai_requests'::regclass and a.attname=x.name and not a.attisdropped and format_type(a.atttypid,a.atttypmod)=x.type and a.attnotnull=x.not_null)
 union all select 'invalid_starter_content',s.t||':'||s.id from seed_rows s where length(coalesce(s.data->>'title',''))=0
  or s.data->>'language_code' not in ('en','ja')
  or (s.t='grammar' and (length(coalesce(s.data->>'structure',''))=0 or length(coalesce(s.data->>'meaning_zh',''))=0))
  or (s.t='articles' and (length(coalesce(s.data->>'content',''))=0 or length(coalesce(s.data->>'translation_zh',''))=0))
  or (s.t='listening_episodes' and (jsonb_typeof(s.data->'transcript') is distinct from 'array'
   or case when jsonb_typeof(s.data->'transcript')='array' then jsonb_array_length(s.data->'transcript')<>5 else true end))
)
select jsonb_build_object(
 'migration_versions',(select jsonb_agg(version order by version) from supabase_migrations.schema_migrations),
 'migration_004_recorded',exists(select 1 from supabase_migrations.schema_migrations where version='004' and name='ai_requests_and_content'),
 'expected_tables',42,'found_tables',(select count(*) from tables where oid is not null),
 'ai_requests_rls',(select relrowsecurity from pg_catalog.pg_class where oid='public.ai_requests'::regclass),
 'browser_ai_table_access',exists(select 1 from (values('anon'),('authenticated')) r(role_name)
  cross join (values('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) v(privilege) where has_table_privilege(r.role_name,'public.ai_requests',v.privilege)),
 'problems',coalesce((select jsonb_agg(jsonb_build_object('check',kind,'detail',detail) order by kind,detail) from problems),'[]'::jsonb),
 'existing_tables_preserved',coalesce((select bool_and(s.oid=(l.snapshot#>>array['tables',s.t,'oid'])::oid
   and s.rows=(l.snapshot#>>array['tables',s.t,'rows'])::bigint+coalesce((l.snapshot#>>array['deltas',s.t])::int,0)) from stored_rows s cross join ledger l),false),
 'existing_content_preserved',coalesce((select bool_and(c.fingerprint=l.snapshot#>array['content',c.t]) from content_preservation c cross join ledger l),false),
 'starter_content_unchanged',coalesce(md5((select jsonb_agg(jsonb_build_object('table',q.t,'data',q.data) order by q.t,q.id) from (select 'grammar' as t,id::text as id,to_jsonb(x) as data from public.grammar x where id::text=any(array['10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003'])
 union all select 'articles' as t,id::text as id,to_jsonb(x) as data from public.articles x where id::text=any(array['20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002'])
 union all select 'listening_episodes' as t,id::text as id,to_jsonb(x) as data from public.listening_episodes x where id::text=any(array['30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002'])) q)::text)=(select hashes->>'starter_content' from ledger),false),
 'starter_grammar',(select count(*) from public.grammar where id::text=any(array['10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003'])),
 'starter_articles',(select count(*) from public.articles where id::text=any(array['20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002'])),
 'starter_listening',(select count(*) from public.listening_episodes where id::text=any(array['30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002'])),
 'starter_relation_present',exists(select 1 from public.grammar_relations where grammar_id='10000000-0000-4000-8000-000000000001' and related_grammar_id='10000000-0000-4000-8000-000000000002' and relation_type='often_confused'),
 'starter_examples_present',(select count(*)=2 from public.grammar_examples where (grammar_id,sentence) in
  (('10000000-0000-4000-8000-000000000001'::uuid,'日本人だからといって、みんな寿司が好きなわけではない。'),('10000000-0000-4000-8000-000000000003'::uuid,'I have lived in Tokyo for three years.'))),
 'prior_policies_unchanged',coalesce(md5((select jsonb_agg(to_jsonb(p) order by p.schemaname,p.tablename,p.policyname) from pg_catalog.pg_policies p where (p.schemaname='public' and p.tablename<>'ai_requests') or (p.schemaname='storage' and p.tablename='objects'))::text)=(select hashes->>'policies' from ledger),false),
 'prior_functions_unchanged',coalesce(md5((select jsonb_agg(to_jsonb(p) order by p.oid) from pg_catalog.pg_proc p where p.oid in (select to_regprocedure(s) from unnest(array['public.create_user_profile()','public.configure_private_owner(text)','public.is_private_owner()','public.consume_ai_request(uuid)','private.guard_owner_signup()','private.touch_updated_at()','public.record_review(uuid,uuid,text,timestamptz,integer)','public.sync_personal_state(bigint,text,jsonb)','public.personal_progress(text)','private.resolve_id(uuid,text,text)','private.validate_review_target()','private.create_review_item()','private.create_grammar_review()','private.project_state(uuid,jsonb)']) s))::text)=(select hashes->>'protected_functions' from ledger),false),
 'claim_function_unchanged',coalesce(md5((select to_jsonb(p) from pg_catalog.pg_proc p where p.oid=to_regprocedure('public.claim_ai_request(uuid)'))::text)=(select hashes->>'claim_function' from ledger),false),
 'claim_policy_unchanged',coalesce(md5((select jsonb_agg(to_jsonb(p) order by p.policyname) from pg_catalog.pg_policies p where p.schemaname='public' and p.tablename='ai_requests')::text)=(select hashes->>'claim_policy' from ledger),false),
 'owner_configured',(select count(*)=1 and bool_and(email='yzh72339@gmail.com') from private.app_owner),
 'owner_table_rls',(select relrowsecurity from pg_catalog.pg_class where oid='private.app_owner'::regclass),
 'browser_private_schema_access',has_schema_privilege('anon','private','USAGE') or has_schema_privilege('authenticated','private','USAGE'),
 'browser_owner_table_access',exists(select 1 from (values('anon'),('authenticated')) r(role_name)
  cross join (values('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) v(privilege) where has_table_privilege(r.role_name,'private.app_owner',v.privilege)),
 'private_buckets',(select count(*) from storage.buckets where id in ('personal-audio','personal-backups','personal-content') and not public),
 'auth_profile_trigger_present',exists(select 1 from pg_catalog.pg_trigger where tgrelid='auth.users'::regclass and tgname='on_auth_user_created' and tgfoid=to_regprocedure('public.create_user_profile()') and tgtype=5 and tgenabled='O'),
 'signup_guard_present',exists(select 1 from pg_catalog.pg_trigger where tgrelid='auth.users'::regclass and tgname='allow_private_owner_only' and tgfoid=to_regprocedure('private.guard_owner_signup()') and tgtype=7 and tgenabled='O'),
 'storage_rls',(select relrowsecurity from pg_catalog.pg_class where oid='storage.objects'::regclass),
 'ledger_rls',(select relrowsecurity from pg_catalog.pg_class where oid='supabase_migrations.schema_migrations'::regclass),
 'browser_ledger_schema_access',has_schema_privilege('anon','supabase_migrations','USAGE') or has_schema_privilege('authenticated','supabase_migrations','USAGE'),
 'rls_helper_unchanged',coalesce((select md5(to_jsonb(p)::text) from pg_catalog.pg_proc p where p.oid=to_regprocedure('public.rls_auto_enable()'))=
  (select substring(statements[2] from 'helper_catalog_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations where version='004'),false),
 'ensure_rls_unchanged',coalesce((select md5(to_jsonb(e)::text) from pg_catalog.pg_event_trigger e where e.evtname='ensure_rls')=
  (select substring(statements[2] from 'ensure_rls_catalog_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations where version='004'),false)
) as migration_004_verification;
