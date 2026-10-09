-- Only migration 003: install existing SRS/sync functions, without running them.
-- Scheduler remains sm2-v1; this migration does not introduce FSRS.
create or replace function private.resolve_id(p_user uuid,p_type text,p_client text) returns uuid language plpgsql security definer set search_path='' as $$declare found uuid;begin
 insert into public.client_id_map(user_id,entity_type,client_id,entity_id) values(p_user,p_type,p_client,gen_random_uuid()) on conflict do nothing;
 select entity_id into found from public.client_id_map where user_id=p_user and entity_type=p_type and client_id=p_client;return found;end;$$;
-- Polymorphic SRS references are validated instead of accepting orphan item IDs.
create or replace function private.validate_review_target() returns trigger language plpgsql set search_path='' as $$begin
 if new.item_type='vocabulary' and not exists(select 1 from public.vocabulary where id=new.item_id and user_id=new.user_id) then raise exception 'Vocabulary ownership mismatch';
 elsif new.item_type='sentence' and not exists(select 1 from public.saved_sentences where id=new.item_id and user_id=new.user_id) then raise exception 'Sentence ownership mismatch';
 elsif new.item_type='grammar' and not exists(select 1 from public.grammar where id=new.item_id) then raise exception 'Unknown grammar';end if;return new;end;$$;
create trigger validate_review_target before insert or update of item_id,item_type,user_id on public.review_items for each row execute function private.validate_review_target();
create or replace function private.create_review_item() returns trigger language plpgsql security definer set search_path='' as $$begin
 insert into public.review_items(user_id,item_type,item_id) values(new.user_id,case tg_table_name when 'vocabulary' then 'vocabulary' when 'saved_sentences' then 'sentence' else 'grammar' end,new.id) on conflict do nothing;return new;end;$$;
create trigger vocabulary_enters_srs after insert on public.vocabulary for each row execute function private.create_review_item();
create trigger sentences_enter_srs after insert on public.saved_sentences for each row execute function private.create_review_item();
create or replace function private.create_grammar_review() returns trigger language plpgsql security definer set search_path='' as $$begin insert into public.review_items(user_id,item_type,item_id) values(new.user_id,'grammar',new.grammar_id) on conflict do nothing;return new;end;$$;
create trigger grammar_enters_srs after insert on public.user_grammar_progress for each row execute function private.create_grammar_review();
-- Store events once; replay by event time to handle offline events arriving out of order.
create or replace function public.record_review(p_review_item uuid,p_client_event uuid,p_rating text,p_reviewed_at timestamptz,p_elapsed_ms integer default 0) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();item public.review_items;prior_event public.review_logs;event record;v_interval integer:=0;v_ease numeric:=2.5;v_reps integer:=0;v_lapses integer:=0;v_total integer:=0;v_due timestamptz;v_reviewed timestamptz;event_state text:='new';outcome jsonb;first_success timestamptz;
begin
 if not public.is_private_owner() then raise exception 'Private owner required' using errcode='42501';end if;
 if p_review_item is null or p_client_event is null or p_rating is null or p_reviewed_at is null or p_elapsed_ms is null
  or p_rating not in ('again','hard','good','easy') or p_reviewed_at>now()+interval '5 minutes'
  or p_reviewed_at<'2000-01-01'::timestamptz or p_elapsed_ms not between 0 and 86400000 then
  raise exception 'Invalid review event' using errcode='22023';end if;
 -- Use the same user lock as sync to serialize direct reviews and snapshot replay.
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 select * into item from public.review_items where id=p_review_item and user_id=uid for update;if not found then raise exception 'Review item not found';end if;
 select * into prior_event from public.review_logs where user_id=uid and client_event_id=p_client_event;
 if found then
  if prior_event.review_item_id is distinct from item.id or prior_event.rating is distinct from p_rating
   or prior_event.reviewed_at is distinct from p_reviewed_at then
   raise exception 'Review event ID reused with a different payload' using errcode='22023';
  end if;
  -- Snapshot replay omits elapsed_ms; keep the first recorded duration on retry.
  return to_jsonb(item);
 end if;
 insert into public.review_logs(user_id,review_item_id,client_event_id,rating,reviewed_at,elapsed_ms,previous_state) values(uid,item.id,p_client_event,p_rating,p_reviewed_at,p_elapsed_ms,to_jsonb(item));
 for event in select * from public.review_logs where user_id=uid and review_item_id=item.id order by reviewed_at,client_event_id loop
 v_total:=v_total+1;v_reviewed:=event.reviewed_at;
 if event.rating='again' then v_interval:=0;v_ease:=greatest(1.3,v_ease-0.2);v_reps:=0;v_lapses:=v_lapses+1;v_due:=v_reviewed+interval '1 minute';event_state:='relearning';
 else
 if event.rating='hard' then v_interval:=greatest(1,round(v_interval*1.2)::int);v_ease:=greatest(1.3,v_ease-0.15);
 elsif event.rating='easy' then v_interval:=greatest(4,round(v_interval*v_ease*1.3)::int);v_ease:=v_ease+0.15;
 else v_interval:=case when v_reps=0 then 1 when v_reps=1 then 3 else greatest(1,round(v_interval*v_ease)::int) end;end if;
 v_interval:=least(36500,v_interval);v_reps:=v_reps+1;v_due:=v_reviewed+make_interval(days=>v_interval);event_state:='review';first_success:=coalesce(first_success,v_reviewed);end if;
 update public.review_logs set scheduled_state=jsonb_build_object('interval',v_interval,'ease',v_ease,'repetitions',v_reps,'lapses',v_lapses,'due',v_due) where id=event.id;
 end loop;
 update public.review_items set interval_days=v_interval,ease_factor=v_ease,repetitions=v_reps,lapse_count=v_lapses,review_count=v_total,last_reviewed_at=v_reviewed,due_at=v_due,state=event_state,stability=v_interval,difficulty=least(10,greatest(1,11-v_ease*2)) where id=item.id returning to_jsonb(review_items) into outcome;
 if item.item_type='vocabulary' then update public.vocabulary set memory_strength=least(100,case when v_reps=0 then 0 else 30+v_reps*12 end),status=case when v_reps=0 then 'learning' when v_reps>=6 then 'mastered' when v_reps>=4 then 'strong' when v_reps>=2 then 'familiar' else 'learning' end,last_seen_at=v_reviewed where id=item.item_id and user_id=uid;
 elsif item.item_type='grammar' then update public.user_grammar_progress set review_count=v_total,mistake_count=v_lapses,mastery_score=least(100,v_reps*20),last_reviewed_at=v_reviewed,next_review_at=v_due where user_id=uid and grammar_id=item.item_id;end if;
 return outcome;
end;$$;
revoke all on function public.record_review(uuid,uuid,text,timestamptz,integer) from public,anon;
grant execute on function public.record_review(uuid,uuid,text,timestamptz,integer) to authenticated;
-- Project local-first state into queryable relational tables within the same sync transaction.
create or replace function private.project_state(uid uuid,s jsonb) returns void language plpgsql security definer set search_path='' as $$
declare e record;j jsonb;lang text;entity uuid;target uuid;review_id uuid;parent uuid;client text;kind text;event_id uuid;
begin
 insert into public.profiles(id,display_name,daily_goal_minutes,theme) values(uid,s#>>'{profile,name}',coalesce((s#>>'{profile,dailyGoal}')::int,20),coalesce(s->>'theme','light')) on conflict(id) do update set display_name=excluded.display_name,daily_goal_minutes=excluded.daily_goal_minutes,theme=excluded.theme;
 -- Clear primary flag before setting the one selected language.
 update public.user_languages set primary_language=false where user_id=uid;
 for e in select * from jsonb_each(coalesce(s->'languageProfiles','{}')) loop
 insert into public.user_languages(user_id,language_code,current_level,learning_goal,primary_language,interests) values(uid,e.key,e.value->>'level',e.value->>'goal',e.key=s#>>'{profile,language}',array(select jsonb_array_elements_text(coalesce(e.value->'interests','[]')))) on conflict(user_id,language_code) do update set current_level=excluded.current_level,learning_goal=excluded.learning_goal,primary_language=excluded.primary_language,interests=excluded.interests;end loop;
 for e in select * from jsonb_each(coalesce(s->'dictionary','{}')) loop
 j:=e.value;entity:=private.resolve_id(uid,'vocabulary',e.key);
 -- Canonical uniqueness prevents repeated capture from creating duplicate words.
 select id into target from public.vocabulary where user_id=uid and language_code=j->>'language' and term=j->>'word';
 if target is not null and target<>entity then entity:=target;update public.client_id_map set entity_id=target where user_id=uid and entity_type='vocabulary' and client_id=e.key;end if;
 insert into public.vocabulary(id,user_id,language_code,term,reading,pronunciation,meaning_zh,notes,difficulty_level,source_type,source_label,source_id,tags,first_seen_at)
 values(entity,uid,j->>'language',j->>'word',j->>'pronunciation',j->>'pronunciation',j->>'meaning',s#>>array['notes',e.key],j->>'tag',case when j->>'source' ilike 'reading:%' then 'reading' when j->>'source' ilike 'listening%' then 'listening' when j->>'source' ilike 'speaking%' then 'speaking' else 'manual' end,j->>'source',case when j->>'source' ilike 'reading:%' then case when j->>'language'='ja' then '20000000-0000-4000-8000-000000000001'::uuid else '20000000-0000-4000-8000-000000000002'::uuid end else null end,array(select jsonb_array_elements_text(coalesce(j->'tags','[]'))),coalesce(to_timestamp((j->>'firstSeen')::numeric/1000),now()))
 on conflict(id) do update set meaning_zh=excluded.meaning_zh,reading=excluded.reading,pronunciation=excluded.pronunciation,notes=excluded.notes,last_seen_at=now();
 if length(coalesce(j->>'example',''))>0 then insert into public.vocabulary_examples(vocabulary_id,sentence,translation_zh,source) values(entity,j->>'example',j->>'translation',j->>'source') on conflict(vocabulary_id,sentence) do nothing;end if;
 if length(coalesce(j->>'related',''))>0 then insert into public.vocabulary_collocations(vocabulary_id,collocation) select entity,trim(x) from unnest(string_to_array(j->>'related',' / ')) x on conflict do nothing;end if;
 end loop;
 for j in select * from jsonb_array_elements(coalesce(s->'sentences','[]')) loop
 entity:=private.resolve_id(uid,'sentence',j->>'id');
 insert into public.saved_sentences(id,user_id,language_code,sentence,translation_zh,notes,source_type,source_id,created_at) values(entity,uid,j->>'language',j->>'sentence',j->>'translation',j->>'notes',case when j->>'source' ilike 'reading:%' then 'reading' when j->>'source' ilike 'listening%' then 'listening' when j->>'source' ilike 'speaking%' then 'speaking' else 'manual' end,case when j->>'source' ilike 'reading:%' then case when j->>'language'='ja' then '20000000-0000-4000-8000-000000000001'::uuid else '20000000-0000-4000-8000-000000000002'::uuid end else null end,coalesce(to_timestamp((j->>'date')::numeric/1000),now())) on conflict(user_id,language_code,sentence) do update set translation_zh=excluded.translation_zh,notes=excluded.notes returning id into entity;
 update public.client_id_map set entity_id=entity where user_id=uid and entity_type='sentence' and client_id=j->>'id';
 for client in select jsonb_array_elements_text(coalesce(j->'vocabulary','[]')) loop select entity_id into target from public.client_id_map where user_id=uid and entity_type='vocabulary' and client_id=client;if target is not null then insert into public.sentence_vocabulary values(entity,target) on conflict do nothing;end if;end loop;
 for client in select jsonb_array_elements_text(coalesce(j->'grammar','[]')) loop select entity_id into target from public.client_id_map where user_id=uid and entity_type='grammar' and client_id=client;if target is not null then insert into public.sentence_grammar values(entity,target) on conflict do nothing;end if;end loop;
 end loop;
 for client in select jsonb_array_elements_text(coalesce(s->'completed','[]')) loop
 if client like '%:Grammar' then target:=case when client like 'ja:%' then '10000000-0000-4000-8000-000000000001'::uuid else '10000000-0000-4000-8000-000000000003'::uuid end;insert into public.user_grammar_progress(user_id,grammar_id,status,mastery_score) values(uid,target,'familiar',60) on conflict(user_id,grammar_id) do nothing;end if;end loop;
 for e in select * from jsonb_each(coalesce(s->'readingPositions','{}')) loop
 lang:=case when e.key like '%ja%' then 'ja' else 'en' end;entity:=case when lang='ja' then '20000000-0000-4000-8000-000000000001'::uuid else '20000000-0000-4000-8000-000000000002'::uuid end;insert into public.client_id_map values(uid,'article',e.key,entity) on conflict do nothing;
 insert into public.articles(id,language_code,title,content,source_type) values(entity,lang,e.key,'','manual') on conflict do nothing;
 insert into public.reading_progress(user_id,article_id,progress,scroll_position,completed,last_read_at,completed_at) values(uid,entity,(e.value->>'progress')::numeric,coalesce((e.value->>'offset')::numeric,0),(e.value->>'progress')::numeric>=100,to_timestamp((e.value->>'updatedAt')::numeric/1000),case when (e.value->>'progress')::numeric>=100 then now() else null end) on conflict(user_id,article_id) do update set progress=excluded.progress,scroll_position=excluded.scroll_position,completed=excluded.completed,last_read_at=excluded.last_read_at,completed_at=excluded.completed_at;end loop;
 for e in select * from jsonb_each(coalesce(s->'listeningPositions','{}')) loop
 lang:=case when e.key like '%ja%' then 'ja' else 'en' end;entity:=case when e.key like 'audio-%' then private.resolve_id(uid,'episode',e.key) when lang='ja' then '30000000-0000-4000-8000-000000000001'::uuid else '30000000-0000-4000-8000-000000000002'::uuid end;insert into public.client_id_map values(uid,'episode',e.key,entity) on conflict do nothing;
 insert into public.listening_episodes(id,language_code,title) values(entity,lang,e.key) on conflict do nothing;
 insert into public.listening_progress(user_id,episode_id,position_seconds,sentence_index,completed) values(uid,entity,coalesce((e.value->>'offset')::numeric,0),coalesce((e.value->>'index')::int,0),(e.value->>'progress')::numeric>=100) on conflict(user_id,episode_id) do update set position_seconds=excluded.position_seconds,sentence_index=excluded.sentence_index,completed=excluded.completed;end loop;
 for j in select * from jsonb_array_elements(coalesce(s->'mistakes','[]')) loop
 entity:=private.resolve_id(uid,'mistake',j->>'id');event_id:=(j->>'id')::uuid;
 insert into public.mistakes(id,user_id,language_code,area,pattern,original_text,corrected_text,source_type,client_event_id,resolved,created_at) values(entity,uid,j->>'language',case lower(j->>'area') when 'ai tutor' then 'ai_chat' when 'ai chat' then 'ai_chat' else lower(j->>'area') end,j->>'pattern',j->>'original',j->>'correction',j->>'source',event_id,coalesce((j->>'resolved')::boolean,false),to_timestamp((j->>'at')::numeric/1000)) on conflict(user_id,client_event_id) do update set resolved=excluded.resolved;end loop;
 for j in select * from jsonb_array_elements(coalesce(s->'speakingHistory','[]')) loop
 entity:=private.resolve_id(uid,'speaking',j->>'id');insert into public.speaking_sessions(id,user_id,language_code,transcript,feedback,created_at) values(entity,uid,j->>'language',j->>'text',jsonb_build_object('text',j->>'feedback'),to_timestamp((j->>'at')::numeric/1000)) on conflict(id) do nothing;end loop;
 for j in select * from jsonb_array_elements(coalesce(s->'sessions','[]')) loop
 entity:=private.resolve_id(uid,'study_session',j->>'id');insert into public.study_sessions(id,user_id,language_code,activity_type,started_at,duration_seconds,item_count,client_event_id) values(entity,uid,coalesce(j->>'language',s#>>'{profile,language}'),j->>'type',coalesce(to_timestamp((j->>'at')::numeric/1000),(j->>'day')::timestamptz),round((j->>'minutes')::numeric*60)::int,(j->>'count')::int,(j->>'id')::uuid) on conflict(user_id,client_event_id) do nothing;end loop;
 for e in select * from jsonb_each(coalesce(s->'dailyPlans','{}')) loop j:=e.value;insert into public.daily_plans(user_id,language_code,plan_date,available_minutes,generated_by,content) values(uid,j->>'language',(j->>'day')::date,(j->>'minutes')::int,j->>'generatedBy',j) on conflict(user_id,language_code,plan_date) do update set content=excluded.content,available_minutes=excluded.available_minutes,generated_by=excluded.generated_by;end loop;
 for e in select * from jsonb_each(coalesce(s->'notes','{}')) loop entity:=private.resolve_id(uid,'note',e.key);insert into public.personal_notes(id,user_id,target_type,title,content) values(entity,uid,case when e.key like 'grammar-%' then 'grammar' when e.key like 'article-%' then 'reading' else 'manual' end,e.key,e.value#>>'{}') on conflict(id) do update set content=excluded.content;end loop;
 for j in select * from jsonb_array_elements(coalesce(s->'conversations','[]')) loop
 lang:=coalesce(j->>'language','ja');parent:=private.resolve_id(uid,'conversation',lang);
 insert into public.ai_conversations(id,user_id,language_code,title) values(parent,uid,lang,'Personal learning') on conflict(id) do nothing;
 entity:=private.resolve_id(uid,'message',j->>'id');
 insert into public.ai_messages(id,user_id,conversation_id,role,content,client_event_id,created_at) values(entity,uid,parent,j->>'role',j->>'text',case when j->>'id' ~ '^[0-9a-f-]{36}$' then (j->>'id')::uuid else entity end,coalesce(to_timestamp((j->>'at')::numeric/1000),now())) on conflict(user_id,client_event_id) do nothing;
 end loop;
 for j in select * from jsonb_array_elements(coalesce(s->'reviewHistory','[]')) loop
 client:=j->>'cardId';kind:=case when client like 'grammar-%' then 'grammar' when client like 'sentence-%' then 'sentence' else 'vocabulary' end;
 select entity_id into target from public.client_id_map where user_id=uid and entity_type=kind and client_id=client;
 if target is null and kind='grammar' then target:=case when j->>'language'='ja' then '10000000-0000-4000-8000-000000000001'::uuid else '10000000-0000-4000-8000-000000000003'::uuid end;insert into public.client_id_map values(uid,'grammar',client,target) on conflict do nothing;end if;
 if target is null then continue;end if;
 if kind='grammar' then insert into public.user_grammar_progress(user_id,grammar_id) values(uid,target) on conflict do nothing;end if;
 select id into review_id from public.review_items where user_id=uid and item_type=kind and item_id=target;
 if review_id is not null then perform public.record_review(review_id,(j->>'id')::uuid,lower(j->>'rating'),to_timestamp((j->>'at')::numeric/1000));end if;
 end loop;
end;$$;
-- Compare-and-swap protects cross-device updates; an idempotency key protects retries.
create or replace function public.sync_personal_state(expected_revision bigint,batch_id text,p_state jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();v_progress public.user_progress;new_revision bigint;
begin
 if not public.is_private_owner() then raise exception 'Private owner required' using errcode='42501';end if;
 if expected_revision is null or expected_revision<0 or batch_id is null or length(trim(batch_id))=0 or length(batch_id)>5000
  or p_state is null or jsonb_typeof(p_state) is distinct from 'object' or p_state->>'version' is distinct from '2'
  or octet_length(p_state::text)>16777216
  or not p_state ?& array['profile','reviews','dictionary','reviewHistory','sentences','sessions','_clock','_deleted'] then
  raise exception 'Invalid state' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 select * into v_progress from public.user_progress where user_id=uid for update;
 if exists(select 1 from public.sync_batches b where b.user_id=uid and b.batch_id=sync_personal_state.batch_id) then return jsonb_build_object('applied',true,'revision',coalesce(v_progress.revision,0),'state',v_progress.state);end if;
 if coalesce(v_progress.revision,0)<>expected_revision then return jsonb_build_object('applied',false,'revision',coalesce(v_progress.revision,0),'state',v_progress.state);end if;
 perform private.project_state(uid,p_state);
 new_revision:=coalesce(v_progress.revision,0)+1;
 insert into public.user_progress(user_id,state,revision,updated_at) values(uid,p_state,new_revision,now()) on conflict(user_id) do update set state=excluded.state,revision=excluded.revision,updated_at=excluded.updated_at;
 insert into public.sync_batches(user_id,batch_id,revision) values(uid,batch_id,new_revision);
 return jsonb_build_object('applied',true,'revision',new_revision);
end;$$;
revoke all on function public.sync_personal_state(bigint,text,jsonb) from public,anon;
grant execute on function public.sync_personal_state(bigint,text,jsonb) to authenticated;
-- Progress queries always filter by auth.uid(); no business analytics or public comparisons.
create or replace function public.personal_progress(p_language text default null) returns jsonb language plpgsql stable security invoker set search_path='' as $$
begin
 if not public.is_private_owner() then raise exception 'Private owner required' using errcode='42501';end if;
 if p_language is not null and p_language not in ('en','ja') then raise exception 'Invalid language' using errcode='22023';end if;
 return (select jsonb_build_object('study_seconds',coalesce((select sum(duration_seconds) from public.study_sessions where user_id=auth.uid() and (p_language is null or language_code=p_language)),0),'vocabulary',(select count(*) from public.vocabulary where user_id=auth.uid() and (p_language is null or language_code=p_language)),'due_reviews',(select count(*) from public.review_items where user_id=auth.uid() and due_at<=now() and state<>'suspended'),'recent_mistakes',(select count(*) from public.mistakes where user_id=auth.uid() and not resolved and created_at>now()-interval '30 days' and (p_language is null or language_code=p_language))));
end;
$$;
revoke all on function public.personal_progress(text) from public,anon;
grant execute on function public.personal_progress(text) to authenticated;
-- Private helpers are reached by triggers / guarded RPCs, never directly by a browser.
revoke all on function private.resolve_id(uuid,text,text) from public,anon,authenticated;
revoke all on function private.validate_review_target() from public,anon,authenticated;
revoke all on function private.create_review_item() from public,anon,authenticated;
revoke all on function private.create_grammar_review() from public,anon,authenticated;
revoke all on function private.project_state(uuid,jsonb) from public,anon,authenticated;
