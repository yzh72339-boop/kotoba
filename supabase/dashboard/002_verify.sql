-- Read-only verification AFTER 002_deploy.sql succeeds, as postgres.
-- Checks this database checkpoint; not Google login, sync, or SRS acceptance.
with expected(t) as (select unnest(array[
 'ai_conversations','ai_messages','ai_usage','articles','backups','client_id_map',
 'courses','daily_plans','downloads','grammar','grammar_examples','grammar_relations',
 'languages','legacy_ai_conversations','legacy_grammar','legacy_profiles',
 'legacy_reviews','legacy_study_sessions','legacy_vocabulary','lessons',
 'listening_episodes','listening_progress','mistakes','personal_notes','profiles',
 'reading_progress','review_items','review_logs','saved_sentences','sentence_grammar',
 'sentence_vocabulary','speaking_sessions','study_sessions','sync_batches',
 'user_grammar_progress','user_languages','user_progress','users','vocabulary',
 'vocabulary_collocations','vocabulary_examples'
])), tables as (
 select e.t,c.oid,c.relrowsecurity from expected e
 left join pg_catalog.pg_namespace n on n.nspname='public'
 left join pg_catalog.pg_class c on c.relnamespace=n.oid and c.relname=e.t and c.relkind='r'
), policy_expected(t,policy,command,owner_column,kind) as (values
 ('profiles','owner_only','ALL','id','owner'),
 ('user_languages','owner_only','ALL','user_id','owner'),
 ('vocabulary','owner_only','ALL','user_id','owner'),
 ('user_grammar_progress','owner_only','ALL','user_id','owner'),
 ('reading_progress','owner_only','ALL','user_id','owner'),
 ('saved_sentences','owner_only','ALL','user_id','owner'),
 ('review_items','owner_only','ALL','user_id','owner'),
 ('listening_progress','owner_only','ALL','user_id','owner'),
 ('speaking_sessions','owner_only','ALL','user_id','owner'),
 ('mistakes','owner_only','ALL','user_id','owner'),
 ('ai_conversations','owner_only','ALL','user_id','owner'),
 ('ai_messages','owner_only','ALL','user_id','owner'),
 ('daily_plans','owner_only','ALL','user_id','owner'),
 ('study_sessions','owner_only','ALL','user_id','owner'),
 ('personal_notes','owner_only','ALL','user_id','owner'),
 ('backups','owner_only','ALL','user_id','owner'),
 ('downloads','owner_only','ALL','user_id','owner'),
 ('users','owner_only','SELECT','id','owner'),
 ('user_progress','owner_only','SELECT','user_id','owner'),
 ('legacy_profiles','private_legacy','SELECT','user_id','owner'),
 ('legacy_reviews','private_legacy','SELECT','user_id','owner'),
 ('legacy_study_sessions','private_legacy','SELECT','user_id','owner'),
 ('legacy_ai_conversations','private_legacy','SELECT','user_id','owner'),
 ('review_logs','own_review_history','SELECT','user_id','owner'),
 ('sync_batches','own_read','SELECT','user_id','owner'),
 ('client_id_map','own_read','SELECT','user_id','owner'),
 ('languages','private_legacy','SELECT',null,'content'),
 ('courses','private_legacy','SELECT',null,'content'),
 ('lessons','private_legacy','SELECT',null,'content'),
 ('legacy_vocabulary','private_legacy','SELECT',null,'content'),
 ('legacy_grammar','private_legacy','SELECT',null,'content'),
 ('grammar','private_content','ALL',null,'content'),
 ('grammar_relations','private_content','ALL',null,'content'),
 ('grammar_examples','private_content','ALL',null,'content'),
 ('articles','private_content','ALL',null,'content'),
 ('listening_episodes','private_content','ALL',null,'content'),
 ('vocabulary_examples','parent_owned','ALL',null,'child'),
 ('vocabulary_collocations','parent_owned','ALL',null,'child'),
 ('sentence_vocabulary','both_owned','ALL',null,'child'),
 ('sentence_grammar','sentence_owned','ALL',null,'child')
), policies as (
 select x.*,p.policyname,p.permissive,p.cmd,p.roles,
  regexp_replace(coalesce(p.qual,''),'[[:space:]()]','','g') q,
  regexp_replace(coalesce(p.with_check,''),'[[:space:]()]','','g') w
 from policy_expected x left join pg_catalog.pg_policies p
 on p.schemaname='public' and p.tablename=x.t and p.policyname=x.policy
), child_fragments(t,fragment) as (values
 ('vocabulary_examples','v.user_id=auth.uid'),
 ('vocabulary_collocations','v.user_id=auth.uid'),
 ('sentence_vocabulary','s.user_id=auth.uid'),
 ('sentence_vocabulary','v.user_id=auth.uid'),
 ('sentence_grammar','s.user_id=auth.uid')
), parent_fk(t,columns,parent,referenced_columns) as (values
 ('vocabulary_examples',array['vocabulary_id'],'vocabulary',array['id']),
 ('vocabulary_collocations',array['vocabulary_id'],'vocabulary',array['id']),
 ('sentence_vocabulary',array['sentence_id'],'saved_sentences',array['id']),
 ('sentence_vocabulary',array['vocabulary_id'],'vocabulary',array['id']),
 ('sentence_grammar',array['sentence_id'],'saved_sentences',array['id']),
 ('sentence_grammar',array['grammar_id'],'grammar',array['id']),
 ('review_logs',array['review_item_id','user_id'],'review_items',array['id','user_id']),
 ('ai_messages',array['conversation_id','user_id'],'ai_conversations',array['id','user_id']),
 ('mistakes',array['vocabulary_id','user_id'],'vocabulary',array['id','user_id'])
), touch(t) as (select unnest(array[
 'profiles','user_languages','vocabulary','grammar','user_grammar_progress','articles',
 'reading_progress','saved_sentences','review_items','listening_episodes',
 'listening_progress','speaking_sessions','mistakes','ai_conversations','daily_plans','personal_notes'
])), storage_expected(policy,command,mode,role_name) as (values
 ('private_storage_read','SELECT','PERMISSIVE','authenticated'),
 ('private_storage_insert','INSERT','PERMISSIVE','authenticated'),
 ('private_storage_update','UPDATE','PERMISSIVE','authenticated'),
 ('private_storage_delete','DELETE','PERMISSIVE','authenticated'),
 ('stage_002_storage_owner_fence','ALL','RESTRICTIVE','authenticated'),
 ('stage_002_storage_anon_fence','ALL','RESTRICTIVE','anon')
), legacy(t,oid,rows) as (
 select 'legacy_profiles','public.legacy_profiles'::regclass::oid,count(*) from public.legacy_profiles
 union all select 'legacy_vocabulary','public.legacy_vocabulary'::regclass::oid,count(*) from public.legacy_vocabulary
 union all select 'legacy_grammar','public.legacy_grammar'::regclass::oid,count(*) from public.legacy_grammar
 union all select 'legacy_reviews','public.legacy_reviews'::regclass::oid,count(*) from public.legacy_reviews
 union all select 'legacy_study_sessions','public.legacy_study_sessions'::regclass::oid,count(*) from public.legacy_study_sessions
 union all select 'legacy_ai_conversations','public.legacy_ai_conversations'::regclass::oid,count(*) from public.legacy_ai_conversations
), problems(kind,detail) as (
 select 'missing_table',t from tables where oid is null
 union all select 'rls_disabled',t from tables where oid is not null and not relrowsecurity
 union all select 'unexpected_table',c.relname::text from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public'
   and c.relkind in ('r','p') and not exists(select 1 from expected e where e.t=c.relname)
 union all select 'browser_privilege',t.t||':'||r.role_name||':'||v.privilege
  from tables t cross join (values('anon'),('authenticated')) r(role_name)
  cross join (values('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) v(privilege)
  where t.oid is not null and has_table_privilege(r.role_name,t.oid,v.privilege)
 union all select 'invalid_policy',t from policies
  where policyname is null or permissive is distinct from 'PERMISSIVE' or cmd is distinct from command
   or roles is distinct from array['authenticated']::name[] or position('is_private_owner'in q)=0
   or (command='ALL' and position('is_private_owner'in w)=0)
 union all select 'invalid_row_ownership',t from policies where kind='owner' and (
  not (position('auth.uid='||owner_column in q)>0 or position(owner_column||'=auth.uid'in q)>0)
  or (command='ALL' and not (position('auth.uid='||owner_column in w)>0 or position(owner_column||'=auth.uid'in w)>0)))
 union all select 'invalid_parent_ownership',x.t||':'||x.fragment from child_fragments x
  join policies p on p.t=x.t where position(x.fragment in p.q)=0 or position(x.fragment in p.w)=0
 union all select 'unexpected_policy',p.tablename||':'||p.policyname from pg_catalog.pg_policies p
  join expected e on e.t=p.tablename where p.schemaname='public'
   and not exists(select 1 from policy_expected x where x.t=p.tablename and x.policy=p.policyname)
   and not (p.tablename='ai_usage' and p.policyname='stage_001_closed'
    and p.permissive='RESTRICTIVE' and p.cmd='ALL' and p.qual='false' and p.with_check='false')
 union all select 'unconditional_policy',p.tablename||':'||p.policyname from pg_catalog.pg_policies p
  join expected e on e.t=p.tablename where p.schemaname='public'
   and (p.qual ~* '(^|[^a-z_])true([^a-z_]|$)' or p.with_check ~* '(^|[^a-z_])true([^a-z_]|$)')
 union all select 'missing_owner_fk',x.t from policy_expected x where x.kind='owner' and not exists(
  select 1 from pg_catalog.pg_constraint c where c.contype='f' and c.convalidated
   and c.conrelid=to_regclass('public.'||x.t) and c.confrelid in ('auth.users'::regclass,'public.users'::regclass)
   and (select array_agg(a.attname::text order by k.ord) from unnest(c.conkey) with ordinality k(num,ord)
    join pg_catalog.pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.num)=array[x.owner_column]
   and (select array_agg(a.attname::text order by k.ord) from unnest(c.confkey) with ordinality k(num,ord)
    join pg_catalog.pg_attribute a on a.attrelid=c.confrelid and a.attnum=k.num)=array['id']
 )
 union all select 'missing_parent_fk',x.t||':'||array_to_string(x.columns,',') from parent_fk x where not exists(
  select 1 from pg_catalog.pg_constraint c where c.contype='f' and c.convalidated
   and c.conrelid=to_regclass('public.'||x.t) and c.confrelid=to_regclass('public.'||x.parent)
   and (select array_agg(a.attname::text order by k.ord) from unnest(c.conkey) with ordinality k(num,ord)
    join pg_catalog.pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.num)=x.columns
   and (select array_agg(a.attname::text order by k.ord) from unnest(c.confkey) with ordinality k(num,ord)
    join pg_catalog.pg_attribute a on a.attrelid=c.confrelid and a.attnum=k.num)=x.referenced_columns
 )
 union all select 'missing_timestamp_trigger',t from touch x where not exists(
  select 1 from pg_catalog.pg_trigger g where g.tgrelid=to_regclass('public.'||x.t)
   and g.tgname='touch_updated_at' and g.tgfoid=to_regprocedure('private.touch_updated_at()')
   and g.tgtype=19 and g.tgenabled='O'
 )
 union all select 'invalid_storage_policy',x.policy from storage_expected x
  left join pg_catalog.pg_policies p on p.schemaname='storage' and p.tablename='objects' and p.policyname=x.policy
  where p.cmd is distinct from x.command or p.permissive is distinct from x.mode
   or p.roles is distinct from array[x.role_name]::name[]
   or (x.command in ('SELECT','UPDATE','DELETE','ALL') and p.qual is null)
   or (x.command in ('INSERT','UPDATE','ALL') and p.with_check is null)
   or (x.role_name='authenticated' and position('is_private_owner'in coalesce(p.qual,p.with_check,''))=0)
 union all select 'browser_rpc_execute',r.role_name||':'||f.signature
  from (values('anon'),('authenticated')) r(role_name)
  cross join (values('public.configure_private_owner(text)'),('public.create_user_profile()'),
   ('public.consume_ai_request(uuid)'),('private.guard_owner_signup()'),('private.touch_updated_at()')) f(signature)
  where has_function_privilege(r.role_name,f.signature,'EXECUTE')
 union all select 'legacy_index_name_conflict',t.relname||':'||i.relname from pg_catalog.pg_index x
  join pg_catalog.pg_class t on t.oid=x.indrelid join pg_catalog.pg_namespace n on n.oid=t.relnamespace
  join pg_catalog.pg_class i on i.oid=x.indexrelid where n.nspname='public'
   and t.relname in ('legacy_profiles','legacy_vocabulary','legacy_grammar','legacy_reviews','legacy_study_sessions','legacy_ai_conversations')
   and left(i.relname,7)<>'legacy_'
)
select jsonb_build_object(
 'migration_versions',(select jsonb_agg(version order by version) from supabase_migrations.schema_migrations),
 'migration_002_recorded',exists(select 1 from supabase_migrations.schema_migrations where version='002' and name='personal_backend'),
 'expected_tables',41,
 'found_tables',(select count(*) from tables where oid is not null),
 'problems',coalesce((select jsonb_agg(jsonb_build_object('check',kind,'detail',detail) order by kind,detail) from problems),'[]'::jsonb),
 'owner_configured',(select count(*)=1 and bool_and(email='yzh72339@gmail.com') from private.app_owner),
 'owner_table_rls',(select relrowsecurity from pg_catalog.pg_class where oid='private.app_owner'::regclass),
 'browser_private_schema_access',has_schema_privilege('anon','private','USAGE') or has_schema_privilege('authenticated','private','USAGE'),
 'browser_owner_table_access',exists(select 1 from (values('anon'),('authenticated')) r(role_name)
  cross join (values('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) p(privilege)
  where has_table_privilege(r.role_name,'private.app_owner',p.privilege)),
 'private_buckets',(select count(*) from storage.buckets where id in ('personal-audio','personal-backups','personal-content') and not public),
 'storage_rls',(select relrowsecurity from pg_catalog.pg_class where oid='storage.objects'::regclass),
 'auth_profile_trigger_present',exists(select 1 from pg_catalog.pg_trigger where tgrelid='auth.users'::regclass
  and tgname='on_auth_user_created' and tgfoid=to_regprocedure('public.create_user_profile()') and tgtype=5 and tgenabled='O'),
 'signup_guard_present',exists(select 1 from pg_catalog.pg_trigger where tgrelid='auth.users'::regclass
  and tgname='allow_private_owner_only' and tgfoid=to_regprocedure('private.guard_owner_signup()') and tgtype=7 and tgenabled='O'),
 'profiles_backfilled',not exists(select 1 from public.legacy_profiles l left join public.profiles p on p.id=l.user_id
  where p.id is null or p.display_name is distinct from l.name or p.daily_goal_minutes is distinct from l.daily_goal),
 'legacy_tables_preserved',coalesce(
  (select jsonb_object_agg(t,jsonb_build_object('oid',oid,'rows',rows)) from legacy)=
  (select substring(statements[3] from 'legacy_oid_and_rows=([^\n]+)')::jsonb from supabase_migrations.schema_migrations where version='002'),false),
 'progress_revision_ready',exists(select 1 from pg_catalog.pg_attribute
  where attrelid='public.user_progress'::regclass and attname='revision' and atttypid='bigint'::regtype and attnotnull and not attisdropped),
 'owner_function_live_auth_check',exists(select 1 from pg_catalog.pg_proc where oid=to_regprocedure('public.is_private_owner()')
  and prosecdef and pg_get_userbyid(proowner)='postgres' and position('auth.users'in prosrc)>0
  and position('auth.uid()'in prosrc)>0 and position('auth.jwt()'in prosrc)>0 and position('email_confirmed_at'in prosrc)>0),
 'owner_function_browser_permissions',has_function_privilege('authenticated','public.is_private_owner()','EXECUTE')
  and not has_function_privilege('anon','public.is_private_owner()','EXECUTE'),
 'ledger_rls',(select relrowsecurity from pg_catalog.pg_class where oid='supabase_migrations.schema_migrations'::regclass),
 'browser_ledger_schema_access',has_schema_privilege('anon','supabase_migrations','USAGE') or has_schema_privilege('authenticated','supabase_migrations','USAGE'),
 'rls_helper_unchanged',coalesce(
  (select md5(to_jsonb(p)::text) from pg_catalog.pg_proc p where p.oid=to_regprocedure('public.rls_auto_enable()'))=
  (select substring(statements[2] from 'helper_catalog_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations where version='002'),false),
 'ensure_rls_unchanged',coalesce(
  (select md5(to_jsonb(t)::text) from pg_catalog.pg_event_trigger t where t.evtname='ensure_rls')=
  (select substring(statements[2] from 'ensure_rls_catalog_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations where version='002'),false)
) as migration_002_verification;
