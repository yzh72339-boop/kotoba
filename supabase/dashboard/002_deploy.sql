-- Only migration 002. Run the WHOLE file once as postgres, after 001 passes.
begin;
set local lock_timeout='5s';
set local statement_timeout='120s';
do $deploy_002$
declare
 migration_sql text:=$migration_002$
-- V2.4: preserve the original prototype tables rather than dropping personal data.
-- For staged Dashboard deployment use 002_deploy.sql after verifying 001.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table private.app_owner(singleton boolean primary key default true check(singleton), email text not null unique check(email=lower(email)));
alter table private.app_owner enable row level security;
revoke all on private.app_owner from public,anon,authenticated;
create or replace function public.configure_private_owner(p_email text) returns void language plpgsql security definer set search_path='' as $$begin
 if p_email is null or p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Invalid owner email'; end if;
 insert into private.app_owner(singleton,email) values(true,lower(trim(p_email))) on conflict(singleton) do update set email=excluded.email;
end;$$;
revoke all on function public.configure_private_owner(text) from public,anon,authenticated;
grant execute on function public.configure_private_owner(text) to service_role;
create or replace function public.is_private_owner() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(
  select 1 from private.app_owner o join auth.users u on u.id=auth.uid()
  where o.email=lower(auth.jwt()->>'email') and o.email=lower(u.email)
   and u.email_confirmed_at is not null
 );
$$;
revoke all on function public.is_private_owner() from public,anon;
grant execute on function public.is_private_owner() to authenticated;
create or replace function private.guard_owner_signup() returns trigger language plpgsql security definer set search_path='' as $$begin
 if not exists(select 1 from private.app_owner where email=lower(new.email)) then raise exception 'Private application: registration is closed'; end if;return new;
end;$$;
create trigger allow_private_owner_only before insert on auth.users for each row execute function private.guard_owner_signup();
-- Auth must also have public signup disabled in supabase/config.toml.
alter table public.profiles rename to legacy_profiles;
alter table public.vocabulary rename to legacy_vocabulary;
alter table public.grammar rename to legacy_grammar;
alter table public.reviews rename to legacy_reviews;
alter table public.study_sessions rename to legacy_study_sessions;
alter table public.ai_conversations rename to legacy_ai_conversations;
-- Renaming a table does not rename its primary-key/unique indexes. Move those
-- names as well before creating replacement tables in the same schema.
do $$declare old_index record; new_name text;begin
 for old_index in
  select i.relname from pg_catalog.pg_index x
  join pg_catalog.pg_class t on t.oid=x.indrelid
  join pg_catalog.pg_namespace n on n.oid=t.relnamespace
  join pg_catalog.pg_class i on i.oid=x.indexrelid
  where n.nspname='public' and t.relname in
   ('legacy_profiles','legacy_vocabulary','legacy_grammar','legacy_reviews','legacy_study_sessions','legacy_ai_conversations')
 loop
  new_name:='legacy_'||old_index.relname;
  if length(new_name)>63 then raise exception 'Legacy index name exceeds PostgreSQL identifier limit';end if;
  execute format('alter index public.%I rename to %I',old_index.relname,new_name);
 end loop;
end;$$;
create table public.profiles(
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text,avatar_url text,native_language text not null default 'zh-CN',timezone text not null default 'Etc/UTC',
 daily_goal_minutes integer not null default 20 check(daily_goal_minutes>0 and daily_goal_minutes<=240),
 preferred_explanation_level text not null default 'normal' check(preferred_explanation_level in ('simple','normal','detailed','immersion')),
 theme text not null default 'system' check(theme in ('light','dark','system')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.user_languages(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,
 language_code text not null check(language_code in ('en','ja')),current_level text,target_level text,primary_language boolean not null default false,learning_goal text,interests text[] not null default '{}',
 started_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(user_id,language_code));
create unique index only_one_primary_language on public.user_languages(user_id) where primary_language;
create table public.vocabulary(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,
 language_code text not null check(language_code in ('en','ja')),term text not null check(length(trim(term))>0 and length(term)<=300),reading text,pronunciation text,part_of_speech text,meaning_zh text,meaning_target text,definition text,notes text,
 frequency_rank integer check(frequency_rank>0),difficulty_level text,source_type text,source_id uuid,source_label text,tags text[] not null default '{}',
 status text not null default 'learning' check(status in ('new','learning','familiar','strong','mastered')),
 memory_strength numeric not null default 0 check(memory_strength between 0 and 100),
 first_seen_at timestamptz not null default now(),last_seen_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(user_id,language_code,term),unique(id,user_id));
create table public.vocabulary_examples(id uuid primary key default gen_random_uuid(),vocabulary_id uuid not null references public.vocabulary on delete cascade,sentence text not null,translation_zh text,source text,is_ai_generated boolean not null default false,created_at timestamptz not null default now(),unique(vocabulary_id,sentence));
create table public.vocabulary_collocations(id uuid primary key default gen_random_uuid(),vocabulary_id uuid not null references public.vocabulary on delete cascade,collocation text not null,meaning_zh text,example text,created_at timestamptz not null default now(),unique(vocabulary_id,collocation));
create table public.grammar(id uuid primary key default gen_random_uuid(),language_code text not null check(language_code in ('en','ja')),title text not null,level text,meaning_zh text,structure text,explanation text,usage_notes text,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(language_code,title));
create table public.user_grammar_progress(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,grammar_id uuid not null references public.grammar on delete cascade,status text not null default 'learning' check(status in ('new','learning','familiar','strong','mastered')),mastery_score numeric not null default 0 check(mastery_score between 0 and 100),review_count integer not null default 0 check(review_count>=0),mistake_count integer not null default 0 check(mistake_count>=0),first_seen_at timestamptz not null default now(),last_reviewed_at timestamptz,next_review_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(user_id,grammar_id));
create table public.grammar_relations(id uuid primary key default gen_random_uuid(),grammar_id uuid not null references public.grammar on delete cascade,related_grammar_id uuid not null references public.grammar on delete cascade,relation_type text not null check(relation_type in ('prerequisite','related','similar','often_confused','advanced')),check(grammar_id<>related_grammar_id),unique(grammar_id,related_grammar_id,relation_type));
create table public.grammar_examples(id uuid primary key default gen_random_uuid(),grammar_id uuid not null references public.grammar on delete cascade,sentence text not null,reading text,translation_zh text,explanation text,difficulty text,created_at timestamptz not null default now());
create table public.articles(id uuid primary key default gen_random_uuid(),language_code text not null check(language_code in ('en','ja')),title text not null,content text not null,translation_zh text,level text,estimated_minutes integer check(estimated_minutes>0),source_type text check(source_type in ('manual','ai','web','lesson')),source_url text,audio_url text,is_ai_generated boolean not null default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.reading_progress(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,article_id uuid not null references public.articles on delete cascade,progress numeric not null default 0 check(progress between 0 and 100),scroll_position numeric not null default 0 check(scroll_position>=0),completed boolean not null default false,started_at timestamptz not null default now(),last_read_at timestamptz not null default now(),completed_at timestamptz,updated_at timestamptz not null default now(),unique(user_id,article_id));
create table public.saved_sentences(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,language_code text not null check(language_code in ('en','ja')),sentence text not null check(length(trim(sentence))>0),reading text,translation_zh text,notes text,source_type text check(source_type in ('reading','listening','speaking','ai','manual')),source_id uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(user_id,language_code,sentence),unique(id,user_id));
create table public.sentence_vocabulary(sentence_id uuid not null references public.saved_sentences on delete cascade,vocabulary_id uuid not null references public.vocabulary on delete cascade,primary key(sentence_id,vocabulary_id));
create table public.sentence_grammar(sentence_id uuid not null references public.saved_sentences on delete cascade,grammar_id uuid not null references public.grammar on delete cascade,primary key(sentence_id,grammar_id));
create table public.review_items(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,item_type text not null check(item_type in ('vocabulary','grammar','sentence')),item_id uuid not null,state text not null default 'new' check(state in ('new','learning','review','relearning','suspended')),stability numeric not null default 0 check(stability>=0),difficulty numeric not null default 5 check(difficulty between 1 and 10),due_at timestamptz not null default now(),last_reviewed_at timestamptz,review_count integer not null default 0 check(review_count>=0),lapse_count integer not null default 0 check(lapse_count>=0),interval_days integer not null default 0 check(interval_days>=0),ease_factor numeric not null default 2.5 check(ease_factor>=1.3),repetitions integer not null default 0 check(repetitions>=0),scheduler_version text not null default 'sm2-v1',created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(user_id,item_type,item_id),unique(id,user_id));
create index review_due_queue on public.review_items(user_id,due_at) where state<>'suspended';
create table public.review_logs(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,review_item_id uuid not null,client_event_id uuid not null,rating text not null check(rating in ('again','hard','good','easy')),reviewed_at timestamptz not null,elapsed_ms integer not null default 0 check(elapsed_ms between 0 and 86400000),previous_state jsonb,scheduled_state jsonb,created_at timestamptz not null default now(),foreign key(review_item_id,user_id) references public.review_items(id,user_id) on delete cascade,unique(user_id,client_event_id));
create index review_history_lookup on public.review_logs(user_id,reviewed_at desc);
create table public.listening_episodes(id uuid primary key default gen_random_uuid(),language_code text not null check(language_code in ('en','ja')),title text not null,level text,audio_path text,duration_seconds numeric check(duration_seconds>=0),transcript jsonb not null default '[]',metadata jsonb not null default '{}',created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.listening_progress(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,episode_id uuid not null references public.listening_episodes on delete cascade,position_seconds numeric not null default 0 check(position_seconds>=0),sentence_index integer not null default 0 check(sentence_index>=0),completed boolean not null default false,playback_rate numeric not null default 1 check(playback_rate between 0.5 and 2),updated_at timestamptz not null default now(),unique(user_id,episode_id));
create table public.speaking_sessions(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,language_code text not null check(language_code in ('en','ja')),mode text not null default 'role_play',topic text,transcript text,feedback jsonb not null default '{}',audio_path text,duration_seconds numeric check(duration_seconds>=0),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.mistakes(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,language_code text not null check(language_code in ('en','ja')),area text not null check(area in ('vocabulary','grammar','reading','listening','speaking','ai_chat')),pattern text not null,original_text text,corrected_text text,explanation text,source_type text,source_id uuid,grammar_id uuid references public.grammar on delete set null,vocabulary_id uuid,client_event_id uuid not null default gen_random_uuid(),resolved boolean not null default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),foreign key(vocabulary_id,user_id) references public.vocabulary(id,user_id),unique(user_id,client_event_id));
create index mistakes_patterns on public.mistakes(user_id,language_code,pattern,created_at desc) where not resolved;
create table public.ai_conversations(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,language_code text not null check(language_code in ('en','ja')),title text,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(id,user_id));
create table public.ai_messages(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,conversation_id uuid not null,role text not null check(role in ('user','assistant')),content text not null check(length(content)<=32000),client_event_id uuid not null default gen_random_uuid(),metadata jsonb not null default '{}',created_at timestamptz not null default now(),foreign key(conversation_id,user_id) references public.ai_conversations(id,user_id) on delete cascade,unique(user_id,client_event_id));
create table public.daily_plans(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,language_code text not null check(language_code in ('en','ja')),plan_date date not null,available_minutes integer not null default 20 check(available_minutes>0),generated_by text not null default 'rules' check(generated_by in ('rules','ai')),content jsonb not null default '{}',context_version bigint not null default 0,completed boolean not null default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(user_id,language_code,plan_date));
create table public.study_sessions(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,language_code text not null check(language_code in ('en','ja')),activity_type text not null,started_at timestamptz not null default now(),completed_at timestamptz,duration_seconds integer not null default 0 check(duration_seconds>=0),item_count integer not null default 0 check(item_count>=0),client_event_id uuid not null default gen_random_uuid(),created_at timestamptz not null default now(),unique(user_id,client_event_id));
create table public.personal_notes(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,language_code text check(language_code in ('en','ja')),target_type text not null check(target_type in ('vocabulary','grammar','reading','manual','question')),target_id uuid,title text,content text not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.backups(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,storage_path text not null,format text not null default 'json' check(format in ('json','csv','markdown')),schema_version integer not null default 2,byte_count bigint not null check(byte_count>=0),checksum text,created_at timestamptz not null default now());
create table public.downloads(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,content_type text not null check(content_type in ('article','lesson','audio','vocabulary')),content_id uuid,device_id uuid not null,byte_count bigint not null default 0 check(byte_count>=0),downloaded_at timestamptz not null default now(),unique(user_id,device_id,content_type,content_id));
create table public.sync_batches(user_id uuid not null references auth.users on delete cascade,batch_id text not null,revision bigint not null,created_at timestamptz not null default now(),primary key(user_id,batch_id));
create table public.client_id_map(user_id uuid not null references auth.users on delete cascade,entity_type text not null,client_id text not null,entity_id uuid not null,primary key(user_id,entity_type,client_id));
alter table public.user_progress add column revision bigint not null default 0;
-- All mutable records receive server timestamps.
create or replace function private.touch_updated_at() returns trigger language plpgsql set search_path='' as $$begin new.updated_at=now();return new;end;$$;
do $$declare t text;begin foreach t in array array['profiles','user_languages','vocabulary','grammar','user_grammar_progress','articles','reading_progress','saved_sentences','review_items','listening_episodes','listening_progress','speaking_sessions','mistakes','ai_conversations','daily_plans','personal_notes'] loop execute format('create trigger touch_updated_at before update on public.%I for each row execute function private.touch_updated_at()',t);end loop;end;$$;
-- Personal parent tables: no anonymous access and no access for any other authenticated user.
do $$declare t text;begin foreach t in array array['user_languages','vocabulary','user_grammar_progress','reading_progress','saved_sentences','review_items','listening_progress','speaking_sessions','mistakes','ai_conversations','ai_messages','daily_plans','study_sessions','personal_notes','backups','downloads'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('create policy owner_only on public.%I for all to authenticated using (public.is_private_owner() and auth.uid()=user_id) with check (public.is_private_owner() and auth.uid()=user_id)',t);
 execute format('create index on public.%I(user_id)',t);
end loop;end;$$;
alter table public.profiles enable row level security;
create policy owner_only on public.profiles for all to authenticated using(public.is_private_owner() and auth.uid()=id) with check(public.is_private_owner() and auth.uid()=id);
-- Shared seed content is still private to this personal application.
do $$declare t text;begin foreach t in array array['grammar','grammar_relations','grammar_examples','articles','listening_episodes'] loop execute format('alter table public.%I enable row level security',t);execute format('create policy private_content on public.%I for all to authenticated using(public.is_private_owner()) with check(public.is_private_owner())',t);end loop;end;$$;
alter table public.vocabulary_examples enable row level security;
create policy parent_owned on public.vocabulary_examples for all to authenticated using(public.is_private_owner() and exists(select 1 from public.vocabulary v where v.id=vocabulary_id and v.user_id=auth.uid())) with check(public.is_private_owner() and exists(select 1 from public.vocabulary v where v.id=vocabulary_id and v.user_id=auth.uid()));
alter table public.vocabulary_collocations enable row level security;
create policy parent_owned on public.vocabulary_collocations for all to authenticated using(public.is_private_owner() and exists(select 1 from public.vocabulary v where v.id=vocabulary_id and v.user_id=auth.uid())) with check(public.is_private_owner() and exists(select 1 from public.vocabulary v where v.id=vocabulary_id and v.user_id=auth.uid()));
alter table public.sentence_vocabulary enable row level security;
create policy both_owned on public.sentence_vocabulary for all to authenticated using(public.is_private_owner() and exists(select 1 from public.saved_sentences s join public.vocabulary v on v.id=vocabulary_id where s.id=sentence_id and s.user_id=auth.uid() and v.user_id=auth.uid())) with check(public.is_private_owner() and exists(select 1 from public.saved_sentences s join public.vocabulary v on v.id=vocabulary_id where s.id=sentence_id and s.user_id=auth.uid() and v.user_id=auth.uid()));
alter table public.sentence_grammar enable row level security;
create policy sentence_owned on public.sentence_grammar for all to authenticated using(public.is_private_owner() and exists(select 1 from public.saved_sentences s where s.id=sentence_id and s.user_id=auth.uid())) with check(public.is_private_owner() and exists(select 1 from public.saved_sentences s where s.id=sentence_id and s.user_id=auth.uid()));
alter table public.review_logs enable row level security;
create policy own_review_history on public.review_logs for select to authenticated using(public.is_private_owner() and user_id=auth.uid());
-- Immutable review events can only be appended through the scheduler RPC.
revoke insert,update,delete on public.review_logs from authenticated;
do $$declare t text;begin foreach t in array array['sync_batches','client_id_map'] loop execute format('alter table public.%I enable row level security',t);execute format('create policy own_read on public.%I for select to authenticated using(public.is_private_owner() and user_id=auth.uid())',t);end loop;end;$$;
-- Close permissive policies inherited from the prototype, retaining old data.
do $$declare r record;t text;begin foreach t in array array['users','legacy_profiles','legacy_vocabulary','legacy_grammar','legacy_reviews','legacy_study_sessions','legacy_ai_conversations','user_progress','languages','courses','lessons'] loop
 for r in select policyname from pg_policies where schemaname='public' and tablename=t loop execute format('drop policy %I on public.%I',r.policyname,t);end loop;
 if t='user_progress' then execute 'create policy owner_only on public.user_progress for select to authenticated using(public.is_private_owner() and user_id=auth.uid())';
 elsif t='users' then execute 'create policy owner_only on public.users for select to authenticated using(public.is_private_owner() and id=auth.uid())';
 elsif t in ('legacy_profiles','legacy_reviews','legacy_study_sessions','legacy_ai_conversations') then
  execute format('create policy private_legacy on public.%I for select to authenticated using(public.is_private_owner() and user_id=auth.uid())',t);
 else execute format('create policy private_legacy on public.%I for select to authenticated using(public.is_private_owner())',t);end if;
end loop;end;$$;
-- New accounts only receive private profile and independent language profiles.
create or replace function public.create_user_profile() returns trigger language plpgsql security definer set search_path='' as $$begin
 insert into public.users(id) values(new.id) on conflict do nothing;
 insert into public.profiles(id,display_name,avatar_url) values(new.id,coalesce(new.raw_user_meta_data->>'name','Learner'),new.raw_user_meta_data->>'avatar_url') on conflict do nothing;
 insert into public.user_languages(user_id,language_code,current_level,primary_language) values(new.id,'ja','N3',true),(new.id,'en','B1',false) on conflict do nothing;return new;
end;$$;
insert into public.profiles(id,display_name,daily_goal_minutes) select user_id,name,daily_goal from public.legacy_profiles on conflict do nothing;
-- Supabase Storage: every object is private, scoped to the authenticated owner UUID.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('personal-audio','personal-audio',false,52428800,array['audio/mpeg','audio/wav','audio/webm','audio/mp4','audio/ogg']),
 ('personal-backups','personal-backups',false,104857600,array['application/json','application/zip','text/csv','text/markdown']),
 ('personal-content','personal-content',false,52428800,array['application/json','text/plain','image/png','image/jpeg'])
 on conflict(id) do update set public=false;
create policy private_storage_read on storage.objects for select to authenticated using(bucket_id in ('personal-audio','personal-backups','personal-content') and public.is_private_owner() and (storage.foldername(name))[1]=auth.uid()::text);
create policy private_storage_insert on storage.objects for insert to authenticated with check(bucket_id in ('personal-audio','personal-backups','personal-content') and public.is_private_owner() and (storage.foldername(name))[1]=auth.uid()::text);
create policy private_storage_update on storage.objects for update to authenticated using(bucket_id in ('personal-audio','personal-backups','personal-content') and public.is_private_owner() and (storage.foldername(name))[1]=auth.uid()::text) with check(bucket_id in ('personal-audio','personal-backups','personal-content') and public.is_private_owner() and (storage.foldername(name))[1]=auth.uid()::text);
create policy private_storage_delete on storage.objects for delete to authenticated using(bucket_id in ('personal-audio','personal-backups','personal-content') and public.is_private_owner() and (storage.foldername(name))[1]=auth.uid()::text);
-- Restrictive fences keep managed buckets private even if other permissive
-- Storage policies exist. Unrelated buckets retain their existing behavior.
create policy stage_002_storage_owner_fence on storage.objects as restrictive for all to authenticated
 using(bucket_id not in ('personal-audio','personal-backups','personal-content') or
  (public.is_private_owner() and (storage.foldername(name))[1]=auth.uid()::text))
 with check(bucket_id not in ('personal-audio','personal-backups','personal-content') or
  (public.is_private_owner() and (storage.foldername(name))[1]=auth.uid()::text));
create policy stage_002_storage_anon_fence on storage.objects as restrictive for all to anon
 using(bucket_id not in ('personal-audio','personal-backups','personal-content'))
 with check(bucket_id not in ('personal-audio','personal-backups','personal-content'));
-- Keep direct browser learning-data access closed at this deployment checkpoint.
-- Later migrations provision the pinned identity and explicitly grant the
-- final minimum privileges. RLS alone cannot restrict TRUNCATE.
do $$declare t text;begin
 foreach t in array array[
  'ai_conversations','ai_messages','ai_usage','articles','backups','client_id_map',
  'courses','daily_plans','downloads','grammar','grammar_examples','grammar_relations',
  'languages','legacy_ai_conversations','legacy_grammar','legacy_profiles',
  'legacy_reviews','legacy_study_sessions','legacy_vocabulary','lessons',
  'listening_episodes','listening_progress','mistakes','personal_notes','profiles',
  'reading_progress','review_items','review_logs','saved_sentences','sentence_grammar',
  'sentence_vocabulary','speaking_sessions','study_sessions','sync_batches',
  'user_grammar_progress','user_languages','user_progress','users','vocabulary',
  'vocabulary_collocations','vocabulary_examples'
 ] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
 end loop;
end;$$;
revoke all on function public.create_user_profile() from public,anon,authenticated;
revoke all on function private.guard_owner_signup() from public,anon,authenticated;
revoke all on function private.touch_updated_at() from public,anon,authenticated;
$migration_002$;
 expected_before text[]:=array['ai_conversations','ai_usage','courses','grammar','languages','lessons','profiles','reviews','study_sessions','user_progress','users','vocabulary'];
 expected_after text[]:=array['ai_conversations','ai_messages','ai_usage','articles','backups','client_id_map','courses','daily_plans','downloads','grammar','grammar_examples','grammar_relations','languages','legacy_ai_conversations','legacy_grammar','legacy_profiles','legacy_reviews','legacy_study_sessions','legacy_vocabulary','lessons','listening_episodes','listening_progress','mistakes','personal_notes','profiles','reading_progress','review_items','review_logs','saved_sentences','sentence_grammar','sentence_vocabulary','speaking_sessions','study_sessions','sync_batches','user_grammar_progress','user_languages','user_progress','users','vocabulary','vocabulary_collocations','vocabulary_examples'];
 helper_oid oid;
 helper_before jsonb;
 event_before jsonb;
 legacy_before jsonb:='{}'::jsonb;
 legacy_after jsonb:='{}'::jsonb;
 t text;
 table_oid oid;
 row_count bigint;
begin
 perform pg_advisory_xact_lock(hashtext('kotoba-dashboard-migrations'));
 if current_user<>'postgres' then raise exception 'Use postgres in SQL Editor';end if;
 if current_setting('server_version_num')::integer<150000 then raise exception 'PostgreSQL 15+ required';end if;
 if to_regclass('supabase_migrations.schema_migrations') is null then
  raise exception 'Migration ledger is missing; stop and recheck';
 end if;
 if (select array_agg(version order by version) from supabase_migrations.schema_migrations) is distinct from array['001']
  or not exists(select 1 from supabase_migrations.schema_migrations where version='001' and name='kotoba') then
  raise exception 'Expected only verified migration 001; do not repeat or skip migrations';
 end if;
 if to_regnamespace('private') is not null then raise exception 'Unexpected private schema; stop and recheck';end if;
 if exists(select 1 from storage.buckets where id in ('personal-audio','personal-backups','personal-content')) then
  raise exception 'Managed bucket already exists; stop and recheck';
 end if;
 if not coalesce((select relrowsecurity from pg_catalog.pg_class where oid='storage.objects'::regclass),false) then
  raise exception 'Storage objects must already have RLS enabled';
 end if;
 if (select array_agg(c.relname::text order by c.relname::text) from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p')) is distinct from expected_before then
  raise exception 'Public table inventory differs from verified 001';
 end if;
 -- Freeze Auth writes and the original tables while preserving their identity.
 lock table auth.users in share row exclusive mode;
 lock table public.ai_conversations,public.ai_usage,public.courses,public.grammar,
  public.languages,public.lessons,public.profiles,public.reviews,public.study_sessions,
  public.user_progress,public.users,public.vocabulary in access exclusive mode;
 if exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind in ('r','p') and not c.relrowsecurity)
  or exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
   cross join (values('anon'),('authenticated')) r(role_name)
   cross join (values('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) p(privilege)
   where n.nspname='public' and c.relkind in ('r','p') and has_table_privilege(r.role_name,c.oid,p.privilege)) then
  raise exception 'Checkpoint 001 RLS or closed table privileges have changed';
 end if;
 if exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind in ('r','p') and not exists(
   select 1 from pg_catalog.pg_policies p where p.schemaname='public' and p.tablename=c.relname
    and p.policyname='stage_001_closed' and p.permissive='RESTRICTIVE' and p.cmd='ALL'
    and p.qual='false' and p.with_check='false' and 'anon'=any(p.roles) and 'authenticated'=any(p.roles))) then
  raise exception 'Checkpoint 001 closed policies have changed';
 end if;
 if (select count(*) from pg_catalog.pg_trigger where tgrelid='auth.users'::regclass and not tgisinternal)<>1
  or not exists(select 1 from pg_catalog.pg_trigger where tgrelid='auth.users'::regclass
   and tgname='on_auth_user_created' and tgfoid=to_regprocedure('public.create_user_profile()') and tgtype=5 and tgenabled='O') then
  raise exception 'Auth trigger inventory differs from verified 001';
 end if;
 helper_oid:=to_regprocedure('public.rls_auto_enable()');
 select to_jsonb(p) into helper_before from pg_catalog.pg_proc p where p.oid=helper_oid;
 select to_jsonb(e) into event_before from pg_catalog.pg_event_trigger e where e.evtname='ensure_rls';
 if helper_before is null or event_before is null
  or md5(helper_before::text) is distinct from (select substring(statements[2] from 'helper_catalog_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations where version='001')
  or md5(event_before::text) is distinct from (select substring(statements[2] from 'ensure_rls_catalog_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations where version='001') then
  raise exception 'Existing RLS helper differs from verified 001';
 end if;
 foreach t in array array['profiles','vocabulary','grammar','reviews','study_sessions','ai_conversations'] loop
  table_oid:=to_regclass(format('public.%I',t))::oid;
  execute format('select count(*) from public.%I',t) into row_count;
  legacy_before:=legacy_before||jsonb_build_object('legacy_'||t,jsonb_build_object('oid',table_oid,'rows',row_count));
 end loop;

 execute migration_sql;
 perform public.configure_private_owner('yzh72339@gmail.com');

 foreach t in array array['profiles','vocabulary','grammar','reviews','study_sessions','ai_conversations'] loop
  table_oid:=to_regclass(format('public.%I','legacy_'||t))::oid;
  execute format('select count(*) from public.%I','legacy_'||t) into row_count;
  legacy_after:=legacy_after||jsonb_build_object('legacy_'||t,jsonb_build_object('oid',table_oid,'rows',row_count));
 end loop;
 if legacy_before is distinct from legacy_after then raise exception 'Legacy table identity or row count changed; rollback';end if;
 if (select array_agg(c.relname::text order by c.relname::text) from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p')) is distinct from expected_after then
  raise exception 'Unexpected table inventory after 002; rollback';
 end if;
 if exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind in ('r','p') and not c.relrowsecurity)
  or not (select relrowsecurity from pg_catalog.pg_class where oid='private.app_owner'::regclass) then
  raise exception 'A private application table lacks RLS; rollback';
 end if;
 if exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  cross join (values('anon'),('authenticated')) r(role_name)
  cross join (values('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) p(privilege)
  where ((n.nspname='public' and c.relkind in ('r','p')) or c.oid='private.app_owner'::regclass)
   and has_table_privilege(r.role_name,c.oid,p.privilege)) then
  raise exception 'Browser table privileges are not closed at checkpoint 002; rollback';
 end if;
 if exists(select 1 from storage.buckets where id in ('personal-audio','personal-backups','personal-content') and public)
  or (select count(*) from storage.buckets where id in ('personal-audio','personal-backups','personal-content'))<>3 then
  raise exception 'Managed buckets are missing or public; rollback';
 end if;
 if helper_before is distinct from (select to_jsonb(p) from pg_catalog.pg_proc p where p.oid=helper_oid)
  or event_before is distinct from (select to_jsonb(e) from pg_catalog.pg_event_trigger e where e.evtname='ensure_rls') then
  raise exception 'Existing RLS helper changed; rollback';
 end if;
 insert into supabase_migrations.schema_migrations(version,name,statements)
 values('002','personal_backend',array[
  migration_sql,
  format(E'-- helper_catalog_md5=%s; ensure_rls_catalog_md5=%s\n',md5(helper_before::text),md5(event_before::text)),
  format(E'-- legacy_oid_and_rows=%s\n',legacy_before::text),
  format(E'select public.configure_private_owner(%L);\n','yzh72339@gmail.com')
 ]);
end;
$deploy_002$;
commit;
select version,name from supabase_migrations.schema_migrations order by version;
