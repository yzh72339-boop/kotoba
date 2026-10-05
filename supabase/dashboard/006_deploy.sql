-- Only migration 006. Run the whole file as postgres after 005 verification passes.
-- Installs backend objects; does not call sync/export or change learning records.
begin;
set local lock_timeout='5s';
set local statement_timeout='120s';
do $deploy_006$
declare
 v_sql text:=$migration_006$
create table public.personal_audio_files(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,
 client_id text not null,language_code text not null check(language_code in ('en','ja')),
 title text not null,storage_path text not null,mime_type text not null,
 byte_count bigint not null check(byte_count between 0 and 52428800),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(user_id,client_id),check(storage_path like user_id::text||'/%')
);
alter table public.personal_audio_files enable row level security;
-- Keep browser table access closed until the final permissions migration.
revoke all on table public.personal_audio_files from public,anon,authenticated;
create policy owner_only on public.personal_audio_files for all to authenticated
 using(public.is_private_owner() and user_id=auth.uid()) with check(public.is_private_owner() and user_id=auth.uid());
create trigger touch_updated_at before update on public.personal_audio_files for each row execute function private.touch_updated_at();
-- Extend projection without duplicating the existing learning engine.
alter function private.project_state(uuid,jsonb) rename to project_learning_state;
create function private.project_state(uid uuid,s jsonb) returns void language plpgsql security definer set search_path='' as $$
declare e record;entity uuid;lang text;
begin
 if uid is null or uid is distinct from auth.uid() or public.is_private_owner() is not true then
  raise exception 'Private owner required' using errcode='42501';end if;
 perform private.project_learning_state(uid,s);
 for e in select * from jsonb_each(coalesce(s->'audioFiles','{}')) loop
 if split_part(e.value->>'storagePath','/',1) is distinct from uid::text then raise exception 'Private audio ownership mismatch';end if;
 insert into public.personal_audio_files(user_id,client_id,language_code,title,storage_path,mime_type,byte_count)
 values(uid,e.key,e.value->>'language',e.value->>'title',e.value->>'storagePath',e.value->>'mimeType',(e.value->>'size')::bigint)
 on conflict(user_id,client_id) do update set language_code=excluded.language_code,title=excluded.title,storage_path=excluded.storage_path,mime_type=excluded.mime_type,byte_count=excluded.byte_count;
 entity:=private.resolve_id(uid,'episode',e.key);lang:=e.value->>'language';
 insert into public.listening_episodes(id,language_code,title,audio_path,metadata)
 values(entity,lang,e.value->>'title',e.value->>'storagePath',jsonb_build_object('personal',true,'clientId',e.key))
 on conflict(id) do update set language_code=excluded.language_code,title=excluded.title,audio_path=excluded.audio_path,metadata=excluded.metadata;
 end loop;
 if s#>>'{activeSession,done}'='true' then update public.daily_plans set completed=true where user_id=uid and language_code=s#>>'{activeSession,language}' and plan_date=to_timestamp((s#>>'{activeSession,startedAt}')::numeric/1000)::date;end if;
 -- Keep notes linked to their vocabulary, grammar or article; never rewrite their text with AI.
 update public.personal_notes n set target_id=m.entity_id,target_type='vocabulary',language_code=v.language_code
 from public.client_id_map m join public.vocabulary v on v.id=m.entity_id
 where n.user_id=uid and m.user_id=uid and m.entity_type='vocabulary' and n.title=m.client_id;
 update public.personal_notes set target_id=case when title='grammar-ja' then '10000000-0000-4000-8000-000000000001'::uuid else '10000000-0000-4000-8000-000000000003'::uuid end,
 language_code=case when title='grammar-ja' then 'ja' else 'en' end
 where user_id=uid and title in ('grammar-ja','grammar-en');
 update public.personal_notes set target_id=case when title='article-ja' then '20000000-0000-4000-8000-000000000001'::uuid else '20000000-0000-4000-8000-000000000002'::uuid end,
 language_code=case when title='article-ja' then 'ja' else 'en' end
 where user_id=uid and title in ('article-ja','article-en');
end;$$;
-- Bounded counts instead of shipping the entire review queue to the AI provider.
create function public.due_review_counts(p_language text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if public.is_private_owner() is not true or p_language is null or p_language not in ('en','ja') then raise exception 'Private owner and valid language required' using errcode='42501';end if;
 select jsonb_build_object('vocabulary',count(*) filter(where r.item_type='vocabulary'),'grammar',count(*) filter(where r.item_type='grammar'),'sentences',count(*) filter(where r.item_type='sentence')) into result
 from public.review_items r
 left join public.vocabulary v on r.item_type='vocabulary' and v.id=r.item_id
 left join public.grammar g on r.item_type='grammar' and g.id=r.item_id
 left join public.saved_sentences s on r.item_type='sentence' and s.id=r.item_id
 where r.user_id=auth.uid() and r.due_at<=now() and r.state<>'suspended'
 and coalesce(v.language_code,g.language_code,s.language_code)=p_language;
 return result;
end;$$;
revoke all on function public.due_review_counts(text) from public,anon,authenticated;
grant execute on function public.due_review_counts(text) to authenticated;
-- STABLE keeps all reads on the calling statement snapshot. RLS remains active.
create function public.export_personal_archive() returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare table_name text;rows jsonb;result jsonb:='{}';
begin
 if public.is_private_owner() is not true then raise exception 'Private owner required' using errcode='42501';end if;
 foreach table_name in array array['profiles','user_languages','vocabulary','vocabulary_examples','vocabulary_collocations','grammar','user_grammar_progress','grammar_relations','grammar_examples','articles','reading_progress','saved_sentences','sentence_vocabulary','sentence_grammar','review_items','review_logs','listening_episodes','listening_progress','speaking_sessions','mistakes','ai_conversations','ai_messages','daily_plans','study_sessions','personal_notes','user_progress','personal_audio_files'] loop
 execute format('select coalesce(jsonb_agg(to_jsonb(t)),''[]''::jsonb) from public.%I t',table_name) into rows;
 result:=result||jsonb_build_object(table_name,rows);
 end loop;
 return result;
end;$$;
revoke all on function public.export_personal_archive() from public,anon,authenticated;
grant execute on function public.export_personal_archive() to authenticated;

-- Renaming retains old ACLs; new private functions must not inherit PUBLIC EXECUTE.
revoke all on function private.project_learning_state(uuid,jsonb) from public,anon,authenticated;
revoke all on function private.project_state(uuid,jsonb) from public,anon,authenticated;
$migration_006$;
 v_tables text[]:=array['ai_conversations','ai_messages','ai_requests','ai_usage','articles','backups','client_id_map','courses','daily_plans','downloads','grammar','grammar_examples','grammar_relations','languages','legacy_ai_conversations','legacy_grammar','legacy_profiles','legacy_reviews','legacy_study_sessions','legacy_vocabulary','lessons','listening_episodes','listening_progress','mistakes','personal_notes','profiles','reading_progress','review_items','review_logs','saved_sentences','sentence_grammar','sentence_vocabulary','speaking_sessions','study_sessions','sync_batches','user_grammar_progress','user_languages','user_progress','users','vocabulary','vocabulary_collocations','vocabulary_examples'];
 v_table text;v_count bigint;v_digest text;v_rows jsonb:='{}';v_before jsonb;
 v_helper jsonb;v_event jsonb;v_functions jsonb;v_policies jsonb;v_triggers jsonb;
 v_validator jsonb;v_validator_trigger jsonb;v_constraints jsonb;
begin
 perform pg_advisory_xact_lock(hashtext('kotoba-dashboard-migrations'));
 if current_user<>'postgres' then raise exception 'Use postgres in SQL Editor';end if;
 if (select array_agg(m.version order by m.version) from supabase_migrations.schema_migrations m) is distinct from array['001','002','003','004','005']
  or not exists(select 1 from supabase_migrations.schema_migrations m where m.version='005' and m.name='hardening_and_projection') then
  raise exception 'Expected only verified migrations 001 through 005';end if;
 if (select array_agg(c.relname::text order by c.relname::text) from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p')) is distinct from v_tables then
  raise exception 'Public table inventory differs from verified 005';end if;
 if (select count(*) from private.app_owner)<>1 or not exists(select 1 from private.app_owner o where o.email='yzh72339@gmail.com') then raise exception 'Private owner differs';end if;
 if to_regprocedure('private.project_learning_state(uuid,jsonb)') is not null
  or to_regprocedure('public.due_review_counts(text)') is not null
  or to_regprocedure('public.export_personal_archive()') is not null then raise exception 'A 006 object already exists; stop instead of overwriting';end if;
 lock table auth.users in share row exclusive mode;
 lock table public.ai_conversations,public.ai_messages,public.ai_requests,public.ai_usage,public.articles,public.backups,public.client_id_map,public.courses,public.daily_plans,public.downloads,public.grammar,public.grammar_examples,public.grammar_relations,public.languages,public.legacy_ai_conversations,public.legacy_grammar,public.legacy_profiles,public.legacy_reviews,public.legacy_study_sessions,public.legacy_vocabulary,public.lessons,public.listening_episodes,public.listening_progress,public.mistakes,public.personal_notes,public.profiles,public.reading_progress,public.review_items,public.review_logs,public.saved_sentences,public.sentence_grammar,public.sentence_vocabulary,public.speaking_sessions,public.study_sessions,public.sync_batches,public.user_grammar_progress,public.user_languages,public.user_progress,public.users,public.vocabulary,public.vocabulary_collocations,public.vocabulary_examples,private.app_owner in share row exclusive mode;
 if exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where ((n.nspname='public' and c.relkind in ('r','p')) or c.oid in ('private.app_owner'::regclass,'storage.objects'::regclass,'supabase_migrations.schema_migrations'::regclass)) and not c.relrowsecurity) then raise exception 'RLS checkpoint changed';end if;
 if exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace cross join (values('anon'),('authenticated')) r(role_name) cross join (values('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) p(privilege)
  where ((n.nspname='public' and c.relkind in ('r','p')) or c.oid='private.app_owner'::regclass) and has_table_privilege(r.role_name,c.oid,p.privilege)) then raise exception 'Browser table privileges changed';end if;
 if exists(select 1 from (values('anon'),('authenticated')) r(role_name) cross join (values('private'),('supabase_migrations')) n(schema_name) where has_schema_privilege(r.role_name,n.schema_name,'USAGE')) then raise exception 'Private schema privileges changed';end if;
 if (select count(*) from storage.buckets b where b.id in ('personal-audio','personal-backups','personal-content') and not b.public)<>3 then raise exception 'Managed buckets must stay private';end if;
 select to_jsonb(p) into v_helper from pg_catalog.pg_proc p where p.oid=to_regprocedure('public.rls_auto_enable()');
 select to_jsonb(e) into v_event from pg_catalog.pg_event_trigger e where e.evtname='ensure_rls';
 if v_helper is null or v_event is null
  or md5(v_helper::text) is distinct from (select substring(m.statements[2] from 'helper_catalog_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations m where m.version='005')
  or md5(v_event::text) is distinct from (select substring(m.statements[2] from 'ensure_rls_catalog_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations m where m.version='005') then raise exception 'RLS helper differs from verified 005';end if;
 if md5((select jsonb_agg(to_jsonb(p) order by p.oid) from pg_catalog.pg_proc p where p.oid in (select to_regprocedure(s) from unnest(array['public.create_user_profile()','public.configure_private_owner(text)','public.is_private_owner()','public.consume_ai_request(uuid)','private.guard_owner_signup()','private.touch_updated_at()','public.record_review(uuid,uuid,text,timestamptz,integer)','public.sync_personal_state(bigint,text,jsonb)','public.personal_progress(text)','private.resolve_id(uuid,text,text)','private.validate_review_target()','private.create_review_item()','private.create_grammar_review()','private.project_state(uuid,jsonb)','public.claim_ai_request(uuid)']) s))::text) is distinct from (select m.statements[4]::jsonb->>'functions' from supabase_migrations.schema_migrations m where m.version='005')
  or md5((select jsonb_agg(to_jsonb(p) order by p.schemaname,p.tablename,p.policyname) from pg_catalog.pg_policies p where (p.schemaname='public' and p.tablename<>'personal_audio_files') or (p.schemaname='storage' and p.tablename='objects'))::text) is distinct from (select m.statements[4]::jsonb->>'policies' from supabase_migrations.schema_migrations m where m.version='005')
  or md5((select jsonb_agg(to_jsonb(g) order by g.oid) from pg_catalog.pg_trigger g join pg_catalog.pg_class c on c.oid=g.tgrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace where not g.tgisinternal and (n.nspname='public' or g.tgrelid='auth.users'::regclass) and c.relname<>'personal_audio_files' and not (g.tgrelid='public.user_progress'::regclass and g.tgname='validate_personal_snapshot'))::text) is distinct from (select m.statements[4]::jsonb->>'triggers' from supabase_migrations.schema_migrations m where m.version='005')
  or md5((select to_jsonb(p) from pg_catalog.pg_proc p where p.oid=to_regprocedure('private.validate_personal_snapshot()'))::text) is distinct from (select m.statements[4]::jsonb->>'validator' from supabase_migrations.schema_migrations m where m.version='005')
  or md5((select jsonb_agg(to_jsonb(c) order by c.oid) from pg_catalog.pg_constraint c where (c.conrelid='public.user_progress'::regclass and c.conname='bounded_personal_snapshot') or (c.conrelid='public.mistakes'::regclass and c.conname='mistakes_vocabulary_owner'))::text) is distinct from (select m.statements[4]::jsonb->>'constraints' from supabase_migrations.schema_migrations m where m.version='005') then raise exception 'Functions, policies, triggers or constraints differ from verified 005';end if;
 select (select jsonb_agg(to_jsonb(p) order by p.oid) from pg_catalog.pg_proc p where p.oid in (select to_regprocedure(s) from unnest(array['public.create_user_profile()','public.configure_private_owner(text)','public.is_private_owner()','public.consume_ai_request(uuid)','private.guard_owner_signup()','private.touch_updated_at()','public.record_review(uuid,uuid,text,timestamptz,integer)','public.sync_personal_state(bigint,text,jsonb)','public.personal_progress(text)','private.resolve_id(uuid,text,text)','private.validate_review_target()','private.create_review_item()','private.create_grammar_review()','private.project_state(uuid,jsonb)','public.claim_ai_request(uuid)']) s)),(select jsonb_agg(to_jsonb(p) order by p.schemaname,p.tablename,p.policyname) from pg_catalog.pg_policies p where (p.schemaname='public' and p.tablename<>'personal_audio_files') or (p.schemaname='storage' and p.tablename='objects')),(select jsonb_agg(to_jsonb(g) order by g.oid) from pg_catalog.pg_trigger g join pg_catalog.pg_class c on c.oid=g.tgrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace where not g.tgisinternal and (n.nspname='public' or g.tgrelid='auth.users'::regclass) and c.relname<>'personal_audio_files' and not (g.tgrelid='public.user_progress'::regclass and g.tgname='validate_personal_snapshot')),(select to_jsonb(p) from pg_catalog.pg_proc p where p.oid=to_regprocedure('private.validate_personal_snapshot()')),(select to_jsonb(g) from pg_catalog.pg_trigger g where g.tgrelid='public.user_progress'::regclass and g.tgname='validate_personal_snapshot'),(select jsonb_agg(to_jsonb(c) order by c.oid) from pg_catalog.pg_constraint c where (c.conrelid='public.user_progress'::regclass and c.conname='bounded_personal_snapshot') or (c.conrelid='public.mistakes'::regclass and c.conname='mistakes_vocabulary_owner')) into v_functions,v_policies,v_triggers,v_validator,v_validator_trigger,v_constraints;
 foreach v_table in array v_tables loop
  execute format('select count(*),md5(coalesce(jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text),''[]''::jsonb)::text) from public.%I x',v_table) into v_count,v_digest;
  v_rows:=v_rows||jsonb_build_object(v_table,jsonb_build_object('oid',to_regclass(format('public.%I',v_table))::oid,'rows',v_count,'content_md5',v_digest));
 end loop;
 v_before:=v_rows;

 execute v_sql;

 v_rows:='{}';
 foreach v_table in array v_tables loop
  execute format('select count(*),md5(coalesce(jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text),''[]''::jsonb)::text) from public.%I x',v_table) into v_count,v_digest;
  v_rows:=v_rows||jsonb_build_object(v_table,jsonb_build_object('oid',to_regclass(format('public.%I',v_table))::oid,'rows',v_count,'content_md5',v_digest));
 end loop;
 if v_before is distinct from v_rows then raise exception 'Existing tables or learning records changed; rollback';end if;
 if v_functions is distinct from (select jsonb_agg(to_jsonb(p)||jsonb_build_object('proname',case when p.oid=to_regprocedure('private.project_learning_state(uuid,jsonb)') then 'project_state' else p.proname end) order by p.oid) from pg_catalog.pg_proc p where p.oid in (select to_regprocedure(s) from unnest(array['public.create_user_profile()','public.configure_private_owner(text)','public.is_private_owner()','public.consume_ai_request(uuid)','private.guard_owner_signup()','private.touch_updated_at()','public.record_review(uuid,uuid,text,timestamptz,integer)','public.sync_personal_state(bigint,text,jsonb)','public.personal_progress(text)','private.resolve_id(uuid,text,text)','private.validate_review_target()','private.create_review_item()','private.create_grammar_review()','private.project_learning_state(uuid,jsonb)','public.claim_ai_request(uuid)']) s)) or v_policies is distinct from (select jsonb_agg(to_jsonb(p) order by p.schemaname,p.tablename,p.policyname) from pg_catalog.pg_policies p where (p.schemaname='public' and p.tablename<>'personal_audio_files') or (p.schemaname='storage' and p.tablename='objects')) or v_triggers is distinct from (select jsonb_agg(to_jsonb(g) order by g.oid) from pg_catalog.pg_trigger g join pg_catalog.pg_class c on c.oid=g.tgrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace where not g.tgisinternal and (n.nspname='public' or g.tgrelid='auth.users'::regclass) and c.relname<>'personal_audio_files' and not (g.tgrelid='public.user_progress'::regclass and g.tgname='validate_personal_snapshot'))
  or v_validator is distinct from (select to_jsonb(p) from pg_catalog.pg_proc p where p.oid=to_regprocedure('private.validate_personal_snapshot()')) or v_validator_trigger is distinct from (select to_jsonb(g) from pg_catalog.pg_trigger g where g.tgrelid='public.user_progress'::regclass and g.tgname='validate_personal_snapshot') or v_constraints is distinct from (select jsonb_agg(to_jsonb(c) order by c.oid) from pg_catalog.pg_constraint c where (c.conrelid='public.user_progress'::regclass and c.conname='bounded_personal_snapshot') or (c.conrelid='public.mistakes'::regclass and c.conname='mistakes_vocabulary_owner')) then raise exception 'Prior protections or function bodies changed; rollback';end if;
 if v_helper is distinct from (select to_jsonb(p) from pg_catalog.pg_proc p where p.oid=to_regprocedure('public.rls_auto_enable()'))
  or v_event is distinct from (select to_jsonb(e) from pg_catalog.pg_event_trigger e where e.evtname='ensure_rls') then raise exception 'RLS helper changed; rollback';end if;
 if not (select c.relrowsecurity from pg_catalog.pg_class c where c.oid='public.personal_audio_files'::regclass)
  or exists(select 1 from (values('anon'),('authenticated')) r(role_name) cross join (values('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) p(privilege) where has_table_privilege(r.role_name,'public.personal_audio_files',p.privilege)) then raise exception 'New audio table privileges are unsafe';end if;
 if exists(select 1 from (values('anon'),('authenticated')) r(role_name) cross join unnest(array['private.project_state(uuid,jsonb)','private.project_learning_state(uuid,jsonb)']) s where has_function_privilege(r.role_name,s,'EXECUTE'))
  or exists(select 1 from unnest(array['public.due_review_counts(text)','public.export_personal_archive()']) s where has_function_privilege('anon',s,'EXECUTE') or not has_function_privilege('authenticated',s,'EXECUTE')) then raise exception 'New function permissions are incorrect';end if;
 if (select count(*) from public.personal_audio_files)<>0 then raise exception 'Migration unexpectedly created audio records';end if;
 insert into supabase_migrations.schema_migrations(version,name,statements) values('006','personal_audio_and_memory',array[
  v_sql,format(E'-- helper_catalog_md5=%s; ensure_rls_catalog_md5=%s\n',md5(v_helper::text),md5(v_event::text)),v_before::text,
  jsonb_build_object('functions',md5(v_functions::text),'policies',md5(v_policies::text),'triggers',md5(v_triggers::text),'validator',md5(v_validator::text),'validator_trigger',md5(v_validator_trigger::text),'constraints',md5(v_constraints::text),
   'installed_functions',md5((select jsonb_agg(to_jsonb(p) order by p.oid) from pg_catalog.pg_proc p where p.oid in (select to_regprocedure(s) from unnest(array['private.project_state(uuid,jsonb)','public.due_review_counts(text)','public.export_personal_archive()']) s))::text),'audio_shape',md5((select jsonb_build_object('table',(select to_jsonb(c) from pg_catalog.pg_class c where c.oid='public.personal_audio_files'::regclass)-array['relpages','reltuples','relallvisible','relallfrozen'], 'columns',(select jsonb_agg(to_jsonb(a) order by a.attnum) from pg_catalog.pg_attribute a where a.attrelid='public.personal_audio_files'::regclass and a.attnum>0 and not a.attisdropped), 'constraints',(select jsonb_agg(to_jsonb(c) order by c.oid) from pg_catalog.pg_constraint c where c.conrelid='public.personal_audio_files'::regclass), 'policies',(select jsonb_agg(to_jsonb(p) order by p.policyname) from pg_catalog.pg_policies p where p.schemaname='public' and p.tablename='personal_audio_files'), 'triggers',(select jsonb_agg(to_jsonb(g) order by g.oid) from pg_catalog.pg_trigger g where g.tgrelid='public.personal_audio_files'::regclass and not g.tgisinternal)))::text))::text
 ]);
end;
$deploy_006$;
commit;
select version,name from supabase_migrations.schema_migrations order by version;
