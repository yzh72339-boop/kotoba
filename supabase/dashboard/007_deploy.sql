-- Only migration 007. Run the whole file as postgres after 006 verification passes.
-- Adds two nullable columns; does not call sync or backfill learning records.
begin;
set local lock_timeout='5s';
set local statement_timeout='120s';
do $deploy_007$
declare
 v_sql text:=$migration_007$
-- Keep the original file-selection time separate from the server update time.
alter table public.personal_audio_files add column source_updated_at timestamptz;
alter table public.listening_progress add column media_id text;

alter function private.project_state(uuid,jsonb) rename to project_state_v6;
create function private.project_state(uid uuid,s jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare e record;
begin
 if uid is null or uid is distinct from auth.uid() or public.is_private_owner() is not true then
  raise exception 'Private owner required' using errcode='42501';end if;
 perform private.project_state_v6(uid,s);
 for e in select * from jsonb_each(coalesce(s->'audioFiles','{}')) loop
  update public.personal_audio_files set source_updated_at=to_timestamp((e.value->>'updatedAt')::numeric/1000)
  where user_id=uid and client_id=e.key;
 end loop;
 for e in select * from jsonb_each(coalesce(s->'listeningPositions','{}')) loop
  update public.listening_progress p set media_id=e.value->>'mediaId'
  from public.client_id_map m
  where p.user_id=uid and m.user_id=uid and m.entity_type='episode'
   and m.client_id=e.key and p.episode_id=m.entity_id;
 end loop;
end;$$;

-- New private helpers must not inherit PUBLIC EXECUTE.
revoke all on function private.project_state_v6(uuid,jsonb) from public,anon,authenticated;
revoke all on function private.project_state(uuid,jsonb) from public,anon,authenticated;
$migration_007$;
 v_tables text[]:=array['ai_conversations','ai_messages','ai_requests','ai_usage','articles','backups','client_id_map','courses','daily_plans','downloads','grammar','grammar_examples','grammar_relations','languages','legacy_ai_conversations','legacy_grammar','legacy_profiles','legacy_reviews','legacy_study_sessions','legacy_vocabulary','lessons','listening_episodes','listening_progress','mistakes','personal_audio_files','personal_notes','profiles','reading_progress','review_items','review_logs','saved_sentences','sentence_grammar','sentence_vocabulary','speaking_sessions','study_sessions','sync_batches','user_grammar_progress','user_languages','user_progress','users','vocabulary','vocabulary_collocations','vocabulary_examples'];
 v_table text;v_omit text;v_count bigint;v_digest text;v_rows jsonb:='{}';v_before jsonb;
 v_helper jsonb;v_event jsonb;v_functions jsonb;v_policies jsonb;v_triggers jsonb;v_constraints jsonb;v_columns jsonb;
begin
 perform pg_advisory_xact_lock(hashtext('kotoba-dashboard-migrations'));
 if current_user<>'postgres' then raise exception 'Use postgres in SQL Editor';end if;
 if (select array_agg(m.version order by m.version) from supabase_migrations.schema_migrations m) is distinct from array['001','002','003','004','005','006']
  or not exists(select 1 from supabase_migrations.schema_migrations m where m.version='006' and m.name='personal_audio_and_memory') then raise exception 'Expected only verified migrations 001 through 006';end if;
 if (select array_agg(c.relname::text order by c.relname::text) from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p')) is distinct from v_tables then raise exception 'Public table inventory differs from verified 006';end if;
 if (select count(*) from private.app_owner)<>1 or not exists(select 1 from private.app_owner o where o.email='owner@example.com') then raise exception 'Private owner differs';end if;
 if to_regprocedure('private.project_state_v6(uuid,jsonb)') is not null
  or exists(select 1 from pg_catalog.pg_attribute a where not a.attisdropped and ((a.attrelid='public.personal_audio_files'::regclass and a.attname='source_updated_at') or (a.attrelid='public.listening_progress'::regclass and a.attname='media_id'))) then raise exception 'A 007 object already exists; stop instead of overwriting';end if;
 lock table auth.users in share row exclusive mode;
 lock table public.ai_conversations,public.ai_messages,public.ai_requests,public.ai_usage,public.articles,public.backups,public.client_id_map,public.courses,public.daily_plans,public.downloads,public.grammar,public.grammar_examples,public.grammar_relations,public.languages,public.legacy_ai_conversations,public.legacy_grammar,public.legacy_profiles,public.legacy_reviews,public.legacy_study_sessions,public.legacy_vocabulary,public.lessons,public.listening_episodes,public.listening_progress,public.mistakes,public.personal_audio_files,public.personal_notes,public.profiles,public.reading_progress,public.review_items,public.review_logs,public.saved_sentences,public.sentence_grammar,public.sentence_vocabulary,public.speaking_sessions,public.study_sessions,public.sync_batches,public.user_grammar_progress,public.user_languages,public.user_progress,public.users,public.vocabulary,public.vocabulary_collocations,public.vocabulary_examples,private.app_owner in share row exclusive mode;
 if exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where ((n.nspname='public' and c.relkind in ('r','p')) or c.oid in ('private.app_owner'::regclass,'storage.objects'::regclass,'supabase_migrations.schema_migrations'::regclass)) and not c.relrowsecurity) then raise exception 'RLS checkpoint changed';end if;
 if exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace cross join (values('anon'),('authenticated')) r(role_name) cross join (values('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) p(privilege)
  where ((n.nspname='public' and c.relkind in ('r','p')) or c.oid='private.app_owner'::regclass) and has_table_privilege(r.role_name,c.oid,p.privilege)) then raise exception 'Browser table privileges changed';end if;
 if exists(select 1 from (values('anon'),('authenticated')) r(role_name) cross join (values('private'),('supabase_migrations')) n(schema_name) where has_schema_privilege(r.role_name,n.schema_name,'USAGE')) then raise exception 'Private schema privileges changed';end if;
 if (select count(*) from storage.buckets b where b.id in ('personal-audio','personal-backups','personal-content') and not b.public)<>3 then raise exception 'Managed buckets must stay private';end if;
 select to_jsonb(p) into v_helper from pg_catalog.pg_proc p where p.oid=to_regprocedure('public.rls_auto_enable()');
 select to_jsonb(e) into v_event from pg_catalog.pg_event_trigger e where e.evtname='ensure_rls';
 if v_helper is null or v_event is null
  or md5(v_helper::text) is distinct from (select substring(m.statements[2] from 'helper_catalog_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations m where m.version='006')
  or md5(v_event::text) is distinct from (select substring(m.statements[2] from 'ensure_rls_catalog_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations m where m.version='006') then raise exception 'RLS helper differs from verified 006';end if;
 if md5((select jsonb_agg(to_jsonb(p)||jsonb_build_object('proname',case when p.oid=to_regprocedure('private.project_learning_state(uuid,jsonb)') then 'project_state' else p.proname end) order by p.oid) from pg_catalog.pg_proc p where p.oid in (select to_regprocedure(s) from unnest(array['public.create_user_profile()','public.configure_private_owner(text)','public.is_private_owner()','public.consume_ai_request(uuid)','private.guard_owner_signup()','private.touch_updated_at()','public.record_review(uuid,uuid,text,timestamptz,integer)','public.sync_personal_state(bigint,text,jsonb)','public.personal_progress(text)','private.resolve_id(uuid,text,text)','private.validate_review_target()','private.create_review_item()','private.create_grammar_review()','private.project_learning_state(uuid,jsonb)','public.claim_ai_request(uuid)']) s))::text) is distinct from (select m.statements[4]::jsonb->>'functions' from supabase_migrations.schema_migrations m where m.version='006')
  or md5((select jsonb_agg(to_jsonb(p) order by p.schemaname,p.tablename,p.policyname) from pg_catalog.pg_policies p where (p.schemaname='public' and p.tablename<>'personal_audio_files') or (p.schemaname='storage' and p.tablename='objects'))::text) is distinct from (select m.statements[4]::jsonb->>'policies' from supabase_migrations.schema_migrations m where m.version='006')
  or md5((select jsonb_agg(to_jsonb(g) order by g.oid) from pg_catalog.pg_trigger g join pg_catalog.pg_class c on c.oid=g.tgrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace where not g.tgisinternal and (n.nspname='public' or g.tgrelid='auth.users'::regclass) and c.relname<>'personal_audio_files' and not (g.tgrelid='public.user_progress'::regclass and g.tgname='validate_personal_snapshot'))::text) is distinct from (select m.statements[4]::jsonb->>'triggers' from supabase_migrations.schema_migrations m where m.version='006')
  or md5((select to_jsonb(p) from pg_catalog.pg_proc p where p.oid=to_regprocedure('private.validate_personal_snapshot()'))::text) is distinct from (select m.statements[4]::jsonb->>'validator' from supabase_migrations.schema_migrations m where m.version='006')
  or md5((select to_jsonb(g) from pg_catalog.pg_trigger g where g.tgrelid='public.user_progress'::regclass and g.tgname='validate_personal_snapshot')::text) is distinct from (select m.statements[4]::jsonb->>'validator_trigger' from supabase_migrations.schema_migrations m where m.version='006')
  or md5((select jsonb_agg(to_jsonb(c) order by c.oid) from pg_catalog.pg_constraint c where (c.conrelid='public.user_progress'::regclass and c.conname='bounded_personal_snapshot') or (c.conrelid='public.mistakes'::regclass and c.conname='mistakes_vocabulary_owner'))::text) is distinct from (select m.statements[4]::jsonb->>'constraints' from supabase_migrations.schema_migrations m where m.version='006')
  or md5((select jsonb_agg(to_jsonb(p) order by p.oid) from pg_catalog.pg_proc p where p.oid in (select to_regprocedure(s) from unnest(array['private.project_state(uuid,jsonb)','public.due_review_counts(text)','public.export_personal_archive()']) s))::text) is distinct from (select m.statements[4]::jsonb->>'installed_functions' from supabase_migrations.schema_migrations m where m.version='006')
  or md5((select jsonb_build_object('table',(select to_jsonb(c) from pg_catalog.pg_class c where c.oid='public.personal_audio_files'::regclass)-array['relpages','reltuples','relallvisible','relallfrozen'], 'columns',(select jsonb_agg(to_jsonb(a) order by a.attnum) from pg_catalog.pg_attribute a where a.attrelid='public.personal_audio_files'::regclass and a.attnum>0 and not a.attisdropped), 'constraints',(select jsonb_agg(to_jsonb(c) order by c.oid) from pg_catalog.pg_constraint c where c.conrelid='public.personal_audio_files'::regclass), 'policies',(select jsonb_agg(to_jsonb(p) order by p.policyname) from pg_catalog.pg_policies p where p.schemaname='public' and p.tablename='personal_audio_files'), 'triggers',(select jsonb_agg(to_jsonb(g) order by g.oid) from pg_catalog.pg_trigger g where g.tgrelid='public.personal_audio_files'::regclass and not g.tgisinternal)))::text) is distinct from (select m.statements[4]::jsonb->>'audio_shape' from supabase_migrations.schema_migrations m where m.version='006') then raise exception 'Objects differ from verified 006';end if;
 select (select jsonb_agg(to_jsonb(p) order by p.oid) from pg_catalog.pg_proc p where p.oid in (select to_regprocedure(s) from unnest(array['public.create_user_profile()','public.configure_private_owner(text)','public.is_private_owner()','public.consume_ai_request(uuid)','private.guard_owner_signup()','private.touch_updated_at()','public.record_review(uuid,uuid,text,timestamptz,integer)','public.sync_personal_state(bigint,text,jsonb)','public.personal_progress(text)','private.resolve_id(uuid,text,text)','private.validate_review_target()','private.create_review_item()','private.create_grammar_review()','private.project_learning_state(uuid,jsonb)','public.claim_ai_request(uuid)','private.validate_personal_snapshot()','private.project_state(uuid,jsonb)','public.due_review_counts(text)','public.export_personal_archive()']) s)),(select jsonb_agg(to_jsonb(p) order by p.schemaname,p.tablename,p.policyname) from pg_catalog.pg_policies p where p.schemaname='public' or (p.schemaname='storage' and p.tablename='objects')),(select jsonb_agg(to_jsonb(g) order by g.oid) from pg_catalog.pg_trigger g join pg_catalog.pg_class c on c.oid=g.tgrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace where not g.tgisinternal and (n.nspname='public' or g.tgrelid='auth.users'::regclass)),(select jsonb_agg(to_jsonb(c) order by c.oid) from pg_catalog.pg_constraint c join pg_catalog.pg_class r on r.oid=c.conrelid join pg_catalog.pg_namespace n on n.oid=r.relnamespace where n.nspname='public'),(select jsonb_agg(to_jsonb(a) order by a.attrelid,a.attnum) from pg_catalog.pg_attribute a join pg_catalog.pg_class c on c.oid=a.attrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and a.attnum>0 and not a.attisdropped and not ((c.relname='personal_audio_files' and a.attname='source_updated_at') or (c.relname='listening_progress' and a.attname='media_id'))) into v_functions,v_policies,v_triggers,v_constraints,v_columns;
 foreach v_table in array v_tables loop
  v_omit:=case v_table when 'personal_audio_files' then 'source_updated_at' when 'listening_progress' then 'media_id' else '__kotoba_007_no_column__' end;
  execute format('select count(*),md5(coalesce(jsonb_agg(to_jsonb(x)-%L order by (to_jsonb(x)-%L)::text),''[]''::jsonb)::text) from public.%I x',v_omit,v_omit,v_table) into v_count,v_digest;
  v_rows:=v_rows||jsonb_build_object(v_table,jsonb_build_object('oid',to_regclass(format('public.%I',v_table))::oid,'rows',v_count,'content_md5',v_digest));
 end loop;
 v_before:=v_rows;

 execute v_sql;

 v_rows:='{}';
 foreach v_table in array v_tables loop
  v_omit:=case v_table when 'personal_audio_files' then 'source_updated_at' when 'listening_progress' then 'media_id' else '__kotoba_007_no_column__' end;
  execute format('select count(*),md5(coalesce(jsonb_agg(to_jsonb(x)-%L order by (to_jsonb(x)-%L)::text),''[]''::jsonb)::text) from public.%I x',v_omit,v_omit,v_table) into v_count,v_digest;
  v_rows:=v_rows||jsonb_build_object(v_table,jsonb_build_object('oid',to_regclass(format('public.%I',v_table))::oid,'rows',v_count,'content_md5',v_digest));
 end loop;
 if v_before is distinct from v_rows then raise exception 'Existing tables or learning records changed; rollback';end if;
 if v_functions is distinct from (select jsonb_agg(to_jsonb(p)||jsonb_build_object('proname',case when p.oid=to_regprocedure('private.project_state_v6(uuid,jsonb)') then 'project_state' else p.proname end) order by p.oid) from pg_catalog.pg_proc p where p.oid in (select to_regprocedure(s) from unnest(array['public.create_user_profile()','public.configure_private_owner(text)','public.is_private_owner()','public.consume_ai_request(uuid)','private.guard_owner_signup()','private.touch_updated_at()','public.record_review(uuid,uuid,text,timestamptz,integer)','public.sync_personal_state(bigint,text,jsonb)','public.personal_progress(text)','private.resolve_id(uuid,text,text)','private.validate_review_target()','private.create_review_item()','private.create_grammar_review()','private.project_learning_state(uuid,jsonb)','public.claim_ai_request(uuid)','private.validate_personal_snapshot()','private.project_state_v6(uuid,jsonb)','public.due_review_counts(text)','public.export_personal_archive()']) s)) or v_policies is distinct from (select jsonb_agg(to_jsonb(p) order by p.schemaname,p.tablename,p.policyname) from pg_catalog.pg_policies p where p.schemaname='public' or (p.schemaname='storage' and p.tablename='objects')) or v_triggers is distinct from (select jsonb_agg(to_jsonb(g) order by g.oid) from pg_catalog.pg_trigger g join pg_catalog.pg_class c on c.oid=g.tgrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace where not g.tgisinternal and (n.nspname='public' or g.tgrelid='auth.users'::regclass)) or v_constraints is distinct from (select jsonb_agg(to_jsonb(c) order by c.oid) from pg_catalog.pg_constraint c join pg_catalog.pg_class r on r.oid=c.conrelid join pg_catalog.pg_namespace n on n.oid=r.relnamespace where n.nspname='public') or v_columns is distinct from (select jsonb_agg(to_jsonb(a) order by a.attrelid,a.attnum) from pg_catalog.pg_attribute a join pg_catalog.pg_class c on c.oid=a.attrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and a.attnum>0 and not a.attisdropped and not ((c.relname='personal_audio_files' and a.attname='source_updated_at') or (c.relname='listening_progress' and a.attname='media_id'))) then raise exception 'Prior functions, RLS or schema changed unexpectedly; rollback';end if;
 if exists(select 1 from public.personal_audio_files a where a.source_updated_at is not null) or exists(select 1 from public.listening_progress p where p.media_id is not null) then raise exception 'New columns were unexpectedly backfilled';end if;
 if v_helper is distinct from (select to_jsonb(p) from pg_catalog.pg_proc p where p.oid=to_regprocedure('public.rls_auto_enable()'))
  or v_event is distinct from (select to_jsonb(e) from pg_catalog.pg_event_trigger e where e.evtname='ensure_rls') then raise exception 'RLS helper changed; rollback';end if;
 if exists(select 1 from (values('anon'),('authenticated')) r(role_name) cross join unnest(array['private.project_state(uuid,jsonb)','private.project_state_v6(uuid,jsonb)','private.project_learning_state(uuid,jsonb)']) s where has_function_privilege(r.role_name,s,'EXECUTE')) then raise exception 'Private projection is executable by a browser role';end if;
 insert into supabase_migrations.schema_migrations(version,name,statements) values('007','audio_position_identity',array[
  v_sql,format(E'-- helper_catalog_md5=%s; ensure_rls_catalog_md5=%s\n',md5(v_helper::text),md5(v_event::text)),v_before::text,
  jsonb_build_object('functions',md5(v_functions::text),'policies',md5(v_policies::text),'triggers',md5(v_triggers::text),'constraints',md5(v_constraints::text),'columns',md5(v_columns::text),'new_columns',md5((select jsonb_agg(to_jsonb(a) order by a.attrelid,a.attnum) from pg_catalog.pg_attribute a where (a.attrelid='public.personal_audio_files'::regclass and a.attname='source_updated_at') or (a.attrelid='public.listening_progress'::regclass and a.attname='media_id'))::text),'installed_function',md5((select to_jsonb(p) from pg_catalog.pg_proc p where p.oid=to_regprocedure('private.project_state(uuid,jsonb)'))::text))::text
 ]);
end;
$deploy_007$;
commit;
select version,name from supabase_migrations.schema_migrations order by version;
