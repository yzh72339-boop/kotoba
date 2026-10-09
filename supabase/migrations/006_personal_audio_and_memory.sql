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
