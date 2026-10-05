-- Only migration 005. Run this WHOLE file once as postgres, after 004 passes.
-- Replaces two constraints. Does not delete or rewrite learning records.
begin;
set local lock_timeout='5s';
set local statement_timeout='120s';
do $deploy_005$
declare
 v_sql text:=$migration_005$
-- Allow growing personal archives; normalized history tables remain the backup source.
alter table public.user_progress drop constraint user_progress_state_check;
alter table public.user_progress add constraint bounded_personal_snapshot check(octet_length(state::text)<=16777216);
-- Never let client code change scheduled fields behind the scheduler.
revoke insert,update,delete on public.review_items from authenticated;
revoke insert,update,delete on public.sync_batches,public.client_id_map from authenticated;
-- Composite mistake ownership, retaining mistake memory after vocabulary removal.
alter table public.mistakes drop constraint mistakes_vocabulary_id_user_id_fkey;
alter table public.mistakes add constraint mistakes_vocabulary_owner foreign key(vocabulary_id,user_id) references public.vocabulary(id,user_id) on delete set null(vocabulary_id);
-- Stronger state shape guard without changing the public RPC contract.
create or replace function private.validate_personal_snapshot() returns trigger language plpgsql set search_path='' as $$begin
 if jsonb_typeof(new.state) is distinct from 'object' or new.state->>'version' is distinct from '2' or not new.state ?& array['profile','reviews','dictionary','reviewHistory','sentences','sessions','_clock','_deleted'] then raise exception 'Invalid personal snapshot';end if;return new;end;$$;
create trigger validate_personal_snapshot before insert or update of state on public.user_progress for each row execute function private.validate_personal_snapshot();
-- This helper is invoked by its trigger, never directly by a browser.
revoke all on function private.validate_personal_snapshot() from public,anon,authenticated;
-- No Realtime publication: foreground/focus/network events perform versioned sync.
$migration_005$;
 v_tables text[]:=array['ai_conversations','ai_messages','ai_requests','ai_usage','articles','backups','client_id_map','courses','daily_plans','downloads','grammar','grammar_examples','grammar_relations','languages','legacy_ai_conversations','legacy_grammar','legacy_profiles','legacy_reviews','legacy_study_sessions','legacy_vocabulary','lessons','listening_episodes','listening_progress','mistakes','personal_notes','profiles','reading_progress','review_items','review_logs','saved_sentences','sentence_grammar','sentence_vocabulary','speaking_sessions','study_sessions','sync_batches','user_grammar_progress','user_languages','user_progress','users','vocabulary','vocabulary_collocations','vocabulary_examples'];
 v_table text;v_rows bigint;v_digest text;
 v_before jsonb:='{}'::jsonb;v_after jsonb:='{}'::jsonb;
 v_helper jsonb;v_event jsonb;v_functions jsonb;v_policies jsonb;v_triggers jsonb;
begin
 perform pg_advisory_xact_lock(hashtext('kotoba-dashboard-migrations'));
 if current_user<>'postgres' then raise exception 'Use postgres in SQL Editor';end if;
 if (select array_agg(m.version order by m.version) from supabase_migrations.schema_migrations m) is distinct from array['001','002','003','004']
  or not exists(select 1 from supabase_migrations.schema_migrations m where m.version='004' and m.name='ai_requests_and_content') then
  raise exception 'Expected only verified migrations 001 through 004';end if;
 if (select array_agg(c.relname::text order by c.relname::text) from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind in ('r','p')) is distinct from v_tables then
  raise exception 'Public table inventory differs from verified 004';end if;
 if (select count(*) from private.app_owner)<>1 or not exists(select 1 from private.app_owner o where o.email='yzh72339@gmail.com') then
  raise exception 'Private owner configuration differs';end if;
 if current_setting('server_version_num')::int<150000 then raise exception 'This foreign-key action requires PostgreSQL 15 or newer';end if;
 lock table auth.users in share row exclusive mode;
 lock table public.ai_conversations,public.ai_messages,public.ai_requests,public.ai_usage,public.articles,public.backups,public.client_id_map,public.courses,public.daily_plans,public.downloads,public.grammar,public.grammar_examples,public.grammar_relations,public.languages,public.legacy_ai_conversations,public.legacy_grammar,public.legacy_profiles,public.legacy_reviews,public.legacy_study_sessions,public.legacy_vocabulary,public.lessons,public.listening_episodes,public.listening_progress,public.mistakes,public.personal_notes,public.profiles,public.reading_progress,public.review_items,public.review_logs,public.saved_sentences,public.sentence_grammar,public.sentence_vocabulary,public.speaking_sessions,public.study_sessions,public.sync_batches,public.user_grammar_progress,public.user_languages,public.user_progress,public.users,public.vocabulary,public.vocabulary_collocations,public.vocabulary_examples,private.app_owner in share row exclusive mode;
 if exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  where ((n.nspname='public' and c.relkind in ('r','p')) or c.oid='private.app_owner'::regclass) and not c.relrowsecurity)
  or exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
   cross join (values('anon'),('authenticated')) r(role_name)
   cross join (values('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) p(privilege)
   where ((n.nspname='public' and c.relkind in ('r','p')) or c.oid='private.app_owner'::regclass) and has_table_privilege(r.role_name,c.oid,p.privilege)) then
  raise exception 'Checkpoint 004 RLS or closed table privileges changed';end if;
 if has_schema_privilege('anon','private','USAGE') or has_schema_privilege('authenticated','private','USAGE') then raise exception 'Private schema is open to a browser role';end if;
 if (select count(*) from storage.buckets b where b.id in ('personal-audio','personal-backups','personal-content') and not b.public)<>3 then raise exception 'Managed buckets must stay private';end if;
 select to_jsonb(p) into v_helper from pg_catalog.pg_proc p where p.oid=to_regprocedure('public.rls_auto_enable()');
 select to_jsonb(e) into v_event from pg_catalog.pg_event_trigger e where e.evtname='ensure_rls';
 if v_helper is null or v_event is null
  or md5(v_helper::text) is distinct from (select substring(m.statements[2] from 'helper_catalog_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations m where m.version='004')
  or md5(v_event::text) is distinct from (select substring(m.statements[2] from 'ensure_rls_catalog_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations m where m.version='004') then
  raise exception 'RLS helper differs from verified 004';end if;
 if md5((select jsonb_agg(to_jsonb(p) order by p.oid) from pg_catalog.pg_proc p where p.oid in (select to_regprocedure(s) from unnest(array['public.create_user_profile()','public.configure_private_owner(text)','public.is_private_owner()','public.consume_ai_request(uuid)','private.guard_owner_signup()','private.touch_updated_at()','public.record_review(uuid,uuid,text,timestamptz,integer)','public.sync_personal_state(bigint,text,jsonb)','public.personal_progress(text)','private.resolve_id(uuid,text,text)','private.validate_review_target()','private.create_review_item()','private.create_grammar_review()','private.project_state(uuid,jsonb)']) s))::text) is distinct from (select m.statements[4]::jsonb->>'protected_functions' from supabase_migrations.schema_migrations m where m.version='004')
  or md5((select to_jsonb(p) from pg_catalog.pg_proc p where p.oid=to_regprocedure('public.claim_ai_request(uuid)'))::text) is distinct from (select m.statements[4]::jsonb->>'claim_function' from supabase_migrations.schema_migrations m where m.version='004')
  or md5((select jsonb_agg(to_jsonb(p) order by p.schemaname,p.tablename,p.policyname) from pg_catalog.pg_policies p where (p.schemaname='public' and p.tablename<>'ai_requests') or (p.schemaname='storage' and p.tablename='objects'))::text) is distinct from (select m.statements[4]::jsonb->>'policies' from supabase_migrations.schema_migrations m where m.version='004')
  or md5((select jsonb_agg(to_jsonb(p) order by p.policyname) from pg_catalog.pg_policies p where p.schemaname='public' and p.tablename='ai_requests')::text) is distinct from (select m.statements[4]::jsonb->>'claim_policy' from supabase_migrations.schema_migrations m where m.version='004') then
  raise exception 'Existing functions or RLS policies differ from verified 004';end if;
 if not exists(select 1 from pg_catalog.pg_constraint c where c.conrelid='public.user_progress'::regclass and c.conname='user_progress_state_check'
  and c.contype='c' and c.convalidated and position('octet_length' in pg_get_constraintdef(c.oid))>0 and position('2097152' in pg_get_constraintdef(c.oid))>0)
  or not exists(select 1 from pg_catalog.pg_constraint c where c.conrelid='public.mistakes'::regclass and c.conname='mistakes_vocabulary_id_user_id_fkey' and c.contype='f' and c.convalidated and c.confrelid='public.vocabulary'::regclass and (select array_agg(a.attname::text order by k.ord) from unnest(c.conkey) with ordinality k(num,ord) join pg_catalog.pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.num)=array['vocabulary_id','user_id'] and (select array_agg(a.attname::text order by k.ord) from unnest(c.confkey) with ordinality k(num,ord) join pg_catalog.pg_attribute a on a.attrelid=c.confrelid and a.attnum=k.num)=array['id','user_id'] and c.confdeltype='a') then
  raise exception 'Old snapshot or ownership constraint differs; stop and inspect';end if;
 if exists(select 1 from pg_catalog.pg_constraint c where (c.conrelid='public.user_progress'::regclass and c.conname='bounded_personal_snapshot') or (c.conrelid='public.mistakes'::regclass and c.conname='mistakes_vocabulary_owner'))
  or to_regprocedure('private.validate_personal_snapshot()') is not null
  or exists(select 1 from pg_catalog.pg_trigger g where g.tgrelid='public.user_progress'::regclass and g.tgname='validate_personal_snapshot') then
  raise exception 'A 005 object already exists; do not overwrite or repeat';end if;
 if exists(select 1 from public.user_progress u where jsonb_typeof(u.state) is distinct from 'object' or u.state->>'version' is distinct from '2'
  or not u.state ?& array['profile','reviews','dictionary','reviewHistory','sentences','sessions','_clock','_deleted']) then
  raise exception 'Existing snapshots do not match v2; stop and inspect without rewriting data';end if;
 select (select jsonb_agg(to_jsonb(p) order by p.oid) from pg_catalog.pg_proc p where p.oid in (select to_regprocedure(s) from unnest(array['public.create_user_profile()','public.configure_private_owner(text)','public.is_private_owner()','public.consume_ai_request(uuid)','private.guard_owner_signup()','private.touch_updated_at()','public.record_review(uuid,uuid,text,timestamptz,integer)','public.sync_personal_state(bigint,text,jsonb)','public.personal_progress(text)','private.resolve_id(uuid,text,text)','private.validate_review_target()','private.create_review_item()','private.create_grammar_review()','private.project_state(uuid,jsonb)','public.claim_ai_request(uuid)']) s)) into v_functions;
 select (select jsonb_agg(to_jsonb(p) order by p.schemaname,p.tablename,p.policyname) from pg_catalog.pg_policies p where p.schemaname='public' or (p.schemaname='storage' and p.tablename='objects')) into v_policies;
 select (select jsonb_agg(to_jsonb(g) order by g.oid) from pg_catalog.pg_trigger g join pg_catalog.pg_class c on c.oid=g.tgrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace where not g.tgisinternal and (n.nspname='public' or g.tgrelid='auth.users'::regclass) and not (g.tgrelid='public.user_progress'::regclass and g.tgname='validate_personal_snapshot')) into v_triggers;
 foreach v_table in array v_tables loop
  execute format('select count(*),md5(coalesce(jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text),''[]''::jsonb)::text) from public.%I x',v_table) into v_rows,v_digest;
  v_before:=v_before||jsonb_build_object(v_table,jsonb_build_object('oid',to_regclass(format('public.%I',v_table))::oid,'rows',v_rows,'content_md5',v_digest));
 end loop;

 execute v_sql;

 foreach v_table in array v_tables loop
  execute format('select count(*),md5(coalesce(jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text),''[]''::jsonb)::text) from public.%I x',v_table) into v_rows,v_digest;
  v_after:=v_after||jsonb_build_object(v_table,jsonb_build_object('oid',to_regclass(format('public.%I',v_table))::oid,'rows',v_rows,'content_md5',v_digest));
 end loop;
 if v_before is distinct from v_after then raise exception 'Existing table identity or learning data changed; rollback';end if;
 if v_functions is distinct from (select jsonb_agg(to_jsonb(p) order by p.oid) from pg_catalog.pg_proc p where p.oid in (select to_regprocedure(s) from unnest(array['public.create_user_profile()','public.configure_private_owner(text)','public.is_private_owner()','public.consume_ai_request(uuid)','private.guard_owner_signup()','private.touch_updated_at()','public.record_review(uuid,uuid,text,timestamptz,integer)','public.sync_personal_state(bigint,text,jsonb)','public.personal_progress(text)','private.resolve_id(uuid,text,text)','private.validate_review_target()','private.create_review_item()','private.create_grammar_review()','private.project_state(uuid,jsonb)','public.claim_ai_request(uuid)']) s)) or v_policies is distinct from (select jsonb_agg(to_jsonb(p) order by p.schemaname,p.tablename,p.policyname) from pg_catalog.pg_policies p where p.schemaname='public' or (p.schemaname='storage' and p.tablename='objects')) or v_triggers is distinct from (select jsonb_agg(to_jsonb(g) order by g.oid) from pg_catalog.pg_trigger g join pg_catalog.pg_class c on c.oid=g.tgrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace where not g.tgisinternal and (n.nspname='public' or g.tgrelid='auth.users'::regclass) and not (g.tgrelid='public.user_progress'::regclass and g.tgname='validate_personal_snapshot')) then
  raise exception 'Existing functions, policies or app triggers changed; rollback';end if;
 if v_helper is distinct from (select to_jsonb(p) from pg_catalog.pg_proc p where p.oid=to_regprocedure('public.rls_auto_enable()'))
  or v_event is distinct from (select to_jsonb(e) from pg_catalog.pg_event_trigger e where e.evtname='ensure_rls') then raise exception 'RLS helper changed; rollback';end if;
 if not exists(select 1 from pg_catalog.pg_constraint c where c.conrelid='public.mistakes'::regclass and c.conname='mistakes_vocabulary_owner' and c.contype='f' and c.convalidated and c.confrelid='public.vocabulary'::regclass and (select array_agg(a.attname::text order by k.ord) from unnest(c.conkey) with ordinality k(num,ord) join pg_catalog.pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.num)=array['vocabulary_id','user_id'] and (select array_agg(a.attname::text order by k.ord) from unnest(c.confkey) with ordinality k(num,ord) join pg_catalog.pg_attribute a on a.attrelid=c.confrelid and a.attnum=k.num)=array['id','user_id']
  and c.confdeltype='n' and c.confdelsetcols=array[(select a.attnum from pg_catalog.pg_attribute a where a.attrelid=c.conrelid and a.attname='vocabulary_id')]::smallint[]) then
  raise exception 'New foreign key does not preserve user ownership';end if;
 if exists(select 1 from (values('anon'),('authenticated')) r(role_name) where has_function_privilege(r.role_name,'private.validate_personal_snapshot()','EXECUTE')) then
  raise exception 'Private validator is executable by a browser role';end if;
 insert into supabase_migrations.schema_migrations(version,name,statements) values('005','hardening_and_projection',array[
  v_sql,
  format(E'-- helper_catalog_md5=%s; ensure_rls_catalog_md5=%s\n',md5(v_helper::text),md5(v_event::text)),
  v_before::text,
  jsonb_build_object('functions',md5(v_functions::text),'policies',md5(v_policies::text),'triggers',md5(v_triggers::text),
   'validator',md5((select to_jsonb(p) from pg_catalog.pg_proc p where p.oid=to_regprocedure('private.validate_personal_snapshot()'))::text),'constraints',md5((select jsonb_agg(to_jsonb(c) order by c.oid) from pg_catalog.pg_constraint c where (c.conrelid='public.user_progress'::regclass and c.conname='bounded_personal_snapshot') or (c.conrelid='public.mistakes'::regclass and c.conname='mistakes_vocabulary_owner'))::text))::text
 ]);
end;
$deploy_005$;
commit;
select version,name from supabase_migrations.schema_migrations order by version;
