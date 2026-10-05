-- Only migration 008. Run the whole file as postgres after 007 verification passes.
-- Binds the owner identity. Does not create an Auth account or rewrite learning data.
begin;
set local lock_timeout='5s';
set local statement_timeout='120s';
do $deploy_008$
declare
 v_sql text:=$migration_008$
-- Phase 1: pin the allowlisted email to one Auth identity and load its account.
-- This is additive; existing learning tables, snapshots and UI are preserved.
alter table private.app_owner add column user_id uuid unique references auth.users(id) on delete set null;
update private.app_owner o set user_id=u.id from auth.users u where lower(u.email)=o.email;

create or replace function public.is_private_owner() returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(
  select 1 from private.app_owner o join auth.users u on u.id=o.user_id
  where o.user_id=auth.uid() and o.email=lower(auth.jwt()->>'email')
   and lower(u.email)=o.email and u.email_confirmed_at is not null
 );
$$;
revoke all on function public.is_private_owner() from public,anon,authenticated;
grant execute on function public.is_private_owner() to authenticated;

create function private.ensure_private_profile(uid uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if uid is null or not exists(select 1 from private.app_owner o join auth.users u on u.id=o.user_id
  where o.user_id=uid and lower(u.email)=o.email) then
  raise exception 'Private owner identity required' using errcode='42501';end if;
 insert into public.users(id) values(uid) on conflict do nothing;
 insert into public.profiles(id,display_name,avatar_url)
 select id,coalesce(raw_user_meta_data->>'name','Learner'),raw_user_meta_data->>'avatar_url'
 from auth.users where id=uid on conflict(id) do nothing;
 insert into public.user_languages(user_id,language_code,current_level,primary_language)
 values(uid,'ja','N3',not exists(select 1 from public.user_languages where user_id=uid and primary_language)),
       (uid,'en','B1',false)
 on conflict(user_id,language_code) do nothing;
end;
$$;

create or replace function public.configure_private_owner(p_email text) returns void
language plpgsql security definer set search_path='' as $$
declare normalized text:=lower(trim(p_email)); existing private.app_owner; uid uuid;
begin
 if normalized is null or normalized !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Invalid owner email';end if;
 -- The same lock also serializes first-account provisioning.
 perform pg_advisory_xact_lock(hashtext('kotoba-private-owner'));
 select * into existing from private.app_owner where singleton for update;
 if existing.user_id is not null and existing.email<>normalized then
  raise exception 'Changing the owner requires an explicit account migration';
 end if;
 select id into uid from auth.users where lower(email)=normalized;
 insert into private.app_owner(singleton,email,user_id) values(true,normalized,uid)
 on conflict(singleton) do update set email=excluded.email,user_id=coalesce(private.app_owner.user_id,excluded.user_id);
 if uid is not null then perform private.ensure_private_profile(uid);end if;
end;
$$;
revoke all on function public.configure_private_owner(text) from public,anon,authenticated;
grant execute on function public.configure_private_owner(text) to service_role;

create or replace function private.guard_owner_signup() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from private.app_owner where email=lower(new.email) and (user_id is null or user_id=new.id)) then
  raise exception 'Private application: registration is closed';
 end if;
 return new;
end;
$$;

create or replace function public.create_user_profile() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtext('kotoba-private-owner'));
 update private.app_owner set user_id=new.id where email=lower(new.email) and (user_id is null or user_id=new.id);
 if not found then raise exception 'Private application: registration is closed';end if;
 perform private.ensure_private_profile(new.id);
 return new;
end;
$$;

alter table public.user_languages add constraint valid_current_language_level check(
 current_level is null or (language_code='en' and current_level in ('A1','A2','B1','B2','C1','C2'))
 or (language_code='ja' and current_level in ('N5','N4','N3','N2','N1'))
);
alter table public.user_languages add constraint valid_target_language_level check(
 target_level is null or (language_code='en' and target_level in ('A1','A2','B1','B2','C1','C2'))
 or (language_code='ja' and target_level in ('N5','N4','N3','N2','N1'))
);
alter table public.profiles add constraint profile_name_length check(length(display_name)<=100);
alter table public.profiles add constraint profile_native_language_length check(length(native_language) between 2 and 32);
alter table public.profiles add constraint profile_timezone_length check(length(timezone) between 1 and 100);

-- Existing legacy policies already check owner and auth.uid() row ownership.
-- Preserve their definitions and OIDs; no policy replacement is required.

create function public.get_private_account() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=auth.uid(); result jsonb;
begin
 if public.is_private_owner() is not true then raise exception 'Private owner required' using errcode='42501';end if;
 select jsonb_build_object(
  'profile',to_jsonb(p),
  'languages',coalesce((select jsonb_agg(to_jsonb(l) order by l.language_code) from public.user_languages l where l.user_id=uid),'[]'::jsonb),
  'progress',(select jsonb_build_object('revision',s.revision,'state',s.state) from public.user_progress s where s.user_id=uid)
 ) into result from public.profiles p where p.id=uid;
 if result is null then raise exception 'Private profile is not provisioned';end if;
 return result;
end;
$$;
revoke all on function public.get_private_account() from public,anon,authenticated;
grant execute on function public.get_private_account() to authenticated;

-- Extend the projection, preserving preferences sent by older clients.
alter function private.project_state(uuid,jsonb) rename to project_state_v7;
create function private.project_state(uid uuid,s jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare entry record;
begin
 if uid is null or uid is distinct from auth.uid() or public.is_private_owner() is not true then
  raise exception 'Private owner required' using errcode='42501';end if;
 perform private.project_state_v7(uid,s);
 update public.profiles set
  native_language=coalesce(s#>>'{profile,nativeLanguage}',native_language),
  timezone=coalesce(s#>>'{profile,timezone}',timezone),
  preferred_explanation_level=coalesce(s#>>'{profile,explanationLevel}',preferred_explanation_level)
 where id=uid;
 for entry in select * from jsonb_each(coalesce(s->'languageProfiles','{}')) loop
  if entry.value ? 'targetLevel' then
   update public.user_languages set target_level=nullif(entry.value->>'targetLevel','')
   where user_id=uid and language_code=entry.key;
  end if;
 end loop;
end;
$$;

-- Explicit ACLs for new private functions and existing Auth trigger helpers.
revoke all on function private.ensure_private_profile(uuid) from public,anon,authenticated;
revoke all on function private.project_state_v7(uuid,jsonb) from public,anon,authenticated;
revoke all on function private.project_state(uuid,jsonb) from public,anon,authenticated;
revoke all on function private.guard_owner_signup() from public,anon,authenticated;
revoke all on function public.create_user_profile() from public,anon,authenticated;
$migration_008$;
 v_tables text[]:=array['ai_conversations','ai_messages','ai_requests','ai_usage','articles','backups','client_id_map','courses','daily_plans','downloads','grammar','grammar_examples','grammar_relations','languages','legacy_ai_conversations','legacy_grammar','legacy_profiles','legacy_reviews','legacy_study_sessions','legacy_vocabulary','lessons','listening_episodes','listening_progress','mistakes','personal_audio_files','personal_notes','profiles','reading_progress','review_items','review_logs','saved_sentences','sentence_grammar','sentence_vocabulary','speaking_sessions','study_sessions','sync_batches','user_grammar_progress','user_languages','user_progress','users','vocabulary','vocabulary_collocations','vocabulary_examples'];
 v_table text;v_count bigint;v_digest text;v_rows jsonb:='{}';v_before jsonb;
 v_helper jsonb;v_event jsonb;v_functions jsonb;v_policies jsonb;v_triggers jsonb;v_constraints jsonb;v_columns jsonb;v_owner jsonb;
begin
 perform pg_advisory_xact_lock(hashtext('kotoba-dashboard-migrations'));
 if current_user<>'postgres' then raise exception 'Use postgres in SQL Editor';end if;
 if (select array_agg(m.version order by m.version) from supabase_migrations.schema_migrations m) is distinct from array['001','002','003','004','005','006','007']
  or not exists(select 1 from supabase_migrations.schema_migrations m where m.version='007' and m.name='audio_position_identity') then raise exception 'Expected only verified migrations 001 through 007';end if;
 if (select array_agg(c.relname::text order by c.relname::text) from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p')) is distinct from v_tables then raise exception 'Public table inventory differs from verified 007';end if;
 if (select count(*) from private.app_owner)<>1 or not exists(select 1 from private.app_owner o where o.email='yzh72339@gmail.com') then raise exception 'Private owner differs';end if;
 if to_regprocedure('private.project_state_v7(uuid,jsonb)') is not null or to_regprocedure('private.ensure_private_profile(uuid)') is not null or to_regprocedure('public.get_private_account()') is not null
  or exists(select 1 from pg_catalog.pg_attribute a where a.attrelid='private.app_owner'::regclass and a.attname='user_id' and not a.attisdropped)
  or exists(select 1 from pg_catalog.pg_constraint c where c.conrelid in ('public.profiles'::regclass,'public.user_languages'::regclass) and c.conname=any(array['valid_current_language_level','valid_target_language_level','profile_name_length','profile_native_language_length','profile_timezone_length'])) then raise exception 'An 008 object already exists; stop instead of overwriting';end if;
 lock table auth.users in share row exclusive mode;
 lock table public.ai_conversations,public.ai_messages,public.ai_requests,public.ai_usage,public.articles,public.backups,public.client_id_map,public.courses,public.daily_plans,public.downloads,public.grammar,public.grammar_examples,public.grammar_relations,public.languages,public.legacy_ai_conversations,public.legacy_grammar,public.legacy_profiles,public.legacy_reviews,public.legacy_study_sessions,public.legacy_vocabulary,public.lessons,public.listening_episodes,public.listening_progress,public.mistakes,public.personal_audio_files,public.personal_notes,public.profiles,public.reading_progress,public.review_items,public.review_logs,public.saved_sentences,public.sentence_grammar,public.sentence_vocabulary,public.speaking_sessions,public.study_sessions,public.sync_batches,public.user_grammar_progress,public.user_languages,public.user_progress,public.users,public.vocabulary,public.vocabulary_collocations,public.vocabulary_examples,private.app_owner in share row exclusive mode;
 if (select count(*) from auth.users u where lower(u.email)='yzh72339@gmail.com')>1 then raise exception 'Owner email maps to multiple Auth identities';end if;
 if exists(select 1 from public.user_languages l where (l.current_level is not null and not ((l.language_code='en' and l.current_level in ('A1','A2','B1','B2','C1','C2')) or (l.language_code='ja' and l.current_level in ('N5','N4','N3','N2','N1')))) or (l.target_level is not null and not ((l.language_code='en' and l.target_level in ('A1','A2','B1','B2','C1','C2')) or (l.language_code='ja' and l.target_level in ('N5','N4','N3','N2','N1')))))
  or exists(select 1 from public.profiles p where length(p.display_name)>100 or length(p.native_language) not between 2 and 32 or length(p.timezone) not between 1 and 100) then raise exception 'Existing profiles do not satisfy new bounds; stop without rewriting data';end if;
 if exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where ((n.nspname='public' and c.relkind in ('r','p')) or c.oid in ('private.app_owner'::regclass,'storage.objects'::regclass,'supabase_migrations.schema_migrations'::regclass)) and not c.relrowsecurity) then raise exception 'RLS checkpoint changed';end if;
 if exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace cross join (values('anon'),('authenticated')) r(role_name) cross join (values('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) p(privilege) where ((n.nspname='public' and c.relkind in ('r','p')) or c.oid='private.app_owner'::regclass) and has_table_privilege(r.role_name,c.oid,p.privilege)) then raise exception 'Browser table privileges changed';end if;
 if exists(select 1 from (values('anon'),('authenticated')) r(role_name) cross join (values('private'),('supabase_migrations')) n(schema_name) where has_schema_privilege(r.role_name,n.schema_name,'USAGE')) then raise exception 'Private schema privileges changed';end if;
 if (select count(*) from storage.buckets b where b.id in ('personal-audio','personal-backups','personal-content') and not b.public)<>3 then raise exception 'Managed buckets must stay private';end if;
 select to_jsonb(p) into v_helper from pg_catalog.pg_proc p where p.oid=to_regprocedure('public.rls_auto_enable()');
 select to_jsonb(e) into v_event from pg_catalog.pg_event_trigger e where e.evtname='ensure_rls';
 if v_helper is null or v_event is null
  or md5(v_helper::text) is distinct from (select substring(m.statements[2] from 'helper_catalog_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations m where m.version='007')
  or md5(v_event::text) is distinct from (select substring(m.statements[2] from 'ensure_rls_catalog_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations m where m.version='007') then raise exception 'RLS helper differs from verified 007';end if;
 if md5((select jsonb_agg(to_jsonb(p)||jsonb_build_object('proname',case when p.oid=to_regprocedure('private.project_state_v6(uuid,jsonb)') then 'project_state' else p.proname end) order by p.oid) from pg_catalog.pg_proc p where p.oid in (select to_regprocedure(s) from unnest(array['public.create_user_profile()','public.configure_private_owner(text)','public.is_private_owner()','public.consume_ai_request(uuid)','private.guard_owner_signup()','private.touch_updated_at()','public.record_review(uuid,uuid,text,timestamptz,integer)','public.sync_personal_state(bigint,text,jsonb)','public.personal_progress(text)','private.resolve_id(uuid,text,text)','private.validate_review_target()','private.create_review_item()','private.create_grammar_review()','private.project_learning_state(uuid,jsonb)','public.claim_ai_request(uuid)','private.validate_personal_snapshot()','private.project_state_v6(uuid,jsonb)','public.due_review_counts(text)','public.export_personal_archive()']) s))::text) is distinct from (select m.statements[4]::jsonb->>'functions' from supabase_migrations.schema_migrations m where m.version='007')
  or md5((select jsonb_agg(to_jsonb(p) order by p.schemaname,p.tablename,p.policyname) from pg_catalog.pg_policies p where p.schemaname='public' or (p.schemaname='storage' and p.tablename='objects'))::text) is distinct from (select m.statements[4]::jsonb->>'policies' from supabase_migrations.schema_migrations m where m.version='007')
  or md5((select jsonb_agg(to_jsonb(g) order by g.oid) from pg_catalog.pg_trigger g join pg_catalog.pg_class c on c.oid=g.tgrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace where not g.tgisinternal and (n.nspname='public' or g.tgrelid='auth.users'::regclass))::text) is distinct from (select m.statements[4]::jsonb->>'triggers' from supabase_migrations.schema_migrations m where m.version='007')
  or md5((select jsonb_agg(to_jsonb(c) order by c.oid) from pg_catalog.pg_constraint c join pg_catalog.pg_class r on r.oid=c.conrelid join pg_catalog.pg_namespace n on n.oid=r.relnamespace where n.nspname='public')::text) is distinct from (select m.statements[4]::jsonb->>'constraints' from supabase_migrations.schema_migrations m where m.version='007')
  or md5((select jsonb_agg(to_jsonb(a) order by a.attrelid,a.attnum) from pg_catalog.pg_attribute a join pg_catalog.pg_class c on c.oid=a.attrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and a.attnum>0 and not a.attisdropped and not ((c.relname='personal_audio_files' and a.attname='source_updated_at') or (c.relname='listening_progress' and a.attname='media_id')))::text) is distinct from (select m.statements[4]::jsonb->>'columns' from supabase_migrations.schema_migrations m where m.version='007')
  or md5((select jsonb_agg(to_jsonb(a) order by a.attrelid,a.attnum) from pg_catalog.pg_attribute a where (a.attrelid='public.personal_audio_files'::regclass and a.attname='source_updated_at') or (a.attrelid='public.listening_progress'::regclass and a.attname='media_id'))::text) is distinct from (select m.statements[4]::jsonb->>'new_columns' from supabase_migrations.schema_migrations m where m.version='007')
  or md5((select to_jsonb(p) from pg_catalog.pg_proc p where p.oid=to_regprocedure('private.project_state(uuid,jsonb)'))::text) is distinct from (select m.statements[4]::jsonb->>'installed_function' from supabase_migrations.schema_migrations m where m.version='007') then raise exception 'Objects differ from verified 007';end if;
 select (select jsonb_agg(to_jsonb(p) order by p.oid) from pg_catalog.pg_proc p where p.oid in (select to_regprocedure(s) from unnest(array['public.consume_ai_request(uuid)','private.touch_updated_at()','public.record_review(uuid,uuid,text,timestamptz,integer)','public.sync_personal_state(bigint,text,jsonb)','public.personal_progress(text)','private.resolve_id(uuid,text,text)','private.validate_review_target()','private.create_review_item()','private.create_grammar_review()','private.project_learning_state(uuid,jsonb)','public.claim_ai_request(uuid)','private.validate_personal_snapshot()','private.project_state_v6(uuid,jsonb)','public.due_review_counts(text)','public.export_personal_archive()','private.project_state(uuid,jsonb)']) s)),(select jsonb_agg(to_jsonb(p) order by p.schemaname,p.tablename,p.policyname) from pg_catalog.pg_policies p where p.schemaname='public' or (p.schemaname='storage' and p.tablename='objects')),(select jsonb_agg(to_jsonb(g) order by g.oid) from pg_catalog.pg_trigger g join pg_catalog.pg_class c on c.oid=g.tgrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace where not g.tgisinternal and (n.nspname='public' or g.tgrelid='auth.users'::regclass)),(select jsonb_agg(to_jsonb(c) order by c.oid) from pg_catalog.pg_constraint c join pg_catalog.pg_class r on r.oid=c.conrelid join pg_catalog.pg_namespace n on n.oid=r.relnamespace where n.nspname='public' and not ((r.relname='user_languages' and c.conname in ('valid_current_language_level','valid_target_language_level')) or (r.relname='profiles' and c.conname in ('profile_name_length','profile_native_language_length','profile_timezone_length')))),(select jsonb_agg(to_jsonb(a) order by a.attrelid,a.attnum) from pg_catalog.pg_attribute a join pg_catalog.pg_class c on c.oid=a.attrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and a.attnum>0 and not a.attisdropped),(select to_jsonb(o) from private.app_owner o) into v_functions,v_policies,v_triggers,v_constraints,v_columns,v_owner;
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
 if v_functions is distinct from (select jsonb_agg(to_jsonb(p)||jsonb_build_object('proname',case when p.oid=to_regprocedure('private.project_state_v7(uuid,jsonb)') then 'project_state' else p.proname end) order by p.oid) from pg_catalog.pg_proc p where p.oid in (select to_regprocedure(s) from unnest(array['public.consume_ai_request(uuid)','private.touch_updated_at()','public.record_review(uuid,uuid,text,timestamptz,integer)','public.sync_personal_state(bigint,text,jsonb)','public.personal_progress(text)','private.resolve_id(uuid,text,text)','private.validate_review_target()','private.create_review_item()','private.create_grammar_review()','private.project_learning_state(uuid,jsonb)','public.claim_ai_request(uuid)','private.validate_personal_snapshot()','private.project_state_v6(uuid,jsonb)','public.due_review_counts(text)','public.export_personal_archive()','private.project_state_v7(uuid,jsonb)']) s)) or v_policies is distinct from (select jsonb_agg(to_jsonb(p) order by p.schemaname,p.tablename,p.policyname) from pg_catalog.pg_policies p where p.schemaname='public' or (p.schemaname='storage' and p.tablename='objects')) or v_triggers is distinct from (select jsonb_agg(to_jsonb(g) order by g.oid) from pg_catalog.pg_trigger g join pg_catalog.pg_class c on c.oid=g.tgrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace where not g.tgisinternal and (n.nspname='public' or g.tgrelid='auth.users'::regclass)) or v_constraints is distinct from (select jsonb_agg(to_jsonb(c) order by c.oid) from pg_catalog.pg_constraint c join pg_catalog.pg_class r on r.oid=c.conrelid join pg_catalog.pg_namespace n on n.oid=r.relnamespace where n.nspname='public' and not ((r.relname='user_languages' and c.conname in ('valid_current_language_level','valid_target_language_level')) or (r.relname='profiles' and c.conname in ('profile_name_length','profile_native_language_length','profile_timezone_length')))) or v_columns is distinct from (select jsonb_agg(to_jsonb(a) order by a.attrelid,a.attnum) from pg_catalog.pg_attribute a join pg_catalog.pg_class c on c.oid=a.attrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and a.attnum>0 and not a.attisdropped) then raise exception 'Prior learning functions, RLS or schema changed unexpectedly; rollback';end if;
 if v_owner is distinct from (select to_jsonb(o)-'user_id' from private.app_owner o) or not ((select count(*) from auth.users u where lower(u.email)='yzh72339@gmail.com')<=1 and exists(select 1 from private.app_owner o where o.email='yzh72339@gmail.com' and ((o.user_id is null and not exists(select 1 from auth.users u where lower(u.email)=o.email)) or exists(select 1 from auth.users u where u.id=o.user_id and lower(u.email)=o.email)))) then raise exception 'Owner identity binding is inconsistent';end if;
 if v_helper is distinct from (select to_jsonb(p) from pg_catalog.pg_proc p where p.oid=to_regprocedure('public.rls_auto_enable()')) or v_event is distinct from (select to_jsonb(e) from pg_catalog.pg_event_trigger e where e.evtname='ensure_rls') then raise exception 'RLS helper changed; rollback';end if;
 if exists(select 1 from (values('anon'),('authenticated')) r(role_name) cross join unnest(array['private.ensure_private_profile(uuid)','private.project_state(uuid,jsonb)','private.project_state_v7(uuid,jsonb)','private.guard_owner_signup()','public.create_user_profile()','public.configure_private_owner(text)']) s where has_function_privilege(r.role_name,s,'EXECUTE'))
  or exists(select 1 from unnest(array['public.is_private_owner()','public.get_private_account()']) s where has_function_privilege('anon',s,'EXECUTE') or not has_function_privilege('authenticated',s,'EXECUTE')) then raise exception 'Auth function permissions are incorrect';end if;
 insert into supabase_migrations.schema_migrations(version,name,statements) values('008','phase_one_private_account',array[
  v_sql,format(E'-- helper_catalog_md5=%s; ensure_rls_catalog_md5=%s\n',md5(v_helper::text),md5(v_event::text)),v_before::text,
  jsonb_build_object('functions',md5(v_functions::text),'policies',md5(v_policies::text),'triggers',md5(v_triggers::text),'constraints',md5(v_constraints::text),'columns',md5(v_columns::text),'installed_functions',md5((select jsonb_agg(to_jsonb(p) order by p.oid) from pg_catalog.pg_proc p where p.oid in (select to_regprocedure(s) from unnest(array['public.is_private_owner()','public.configure_private_owner(text)','private.guard_owner_signup()','public.create_user_profile()','private.ensure_private_profile(uuid)','public.get_private_account()','private.project_state(uuid,jsonb)']) s))::text),'new_constraints',md5((select jsonb_agg(to_jsonb(c) order by c.oid) from pg_catalog.pg_constraint c where (c.conrelid='public.user_languages'::regclass and c.conname in ('valid_current_language_level','valid_target_language_level')) or (c.conrelid='public.profiles'::regclass and c.conname in ('profile_name_length','profile_native_language_length','profile_timezone_length')) or (c.conrelid='private.app_owner'::regclass and c.conname in ('app_owner_user_id_key','app_owner_user_id_fkey')))::text),'owner_column',md5((select to_jsonb(a) from pg_catalog.pg_attribute a where a.attrelid='private.app_owner'::regclass and a.attname='user_id' and not a.attisdropped)::text),'owner_base',md5(v_owner::text))::text
 ]);
end;
$deploy_008$;
commit;
select version,name from supabase_migrations.schema_migrations order by version;
