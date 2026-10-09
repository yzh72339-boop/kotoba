-- Adds V3 content identities. Never changes 001–009, RLS policies or the scheduler.
-- Run once, in a transaction, after 009. No production data is deleted.
create function private.prepare_library_projection(p_uid uuid,p_state jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare entry record;card jsonb;client text;entity uuid;existing uuid;filtered jsonb;
begin
 if p_uid is null or p_uid is distinct from auth.uid() or public.is_private_owner() is not true then
  raise exception 'Private owner required' using errcode='42501';
 end if;
 for entry in select * from jsonb_each(coalesce(p_state->'notes','{}'))
  where key like 'library-card-grammar-%' loop
  card:=(entry.value#>>'{}')::jsonb;client:=card->>'id';
  if entry.key is distinct from 'library-card-'||client
   or client !~ '^grammar-(ja|en)-[a-z0-9-]+$'
   or card->>'language' not in ('ja','en')
   or client not like 'grammar-'||(card->>'language')||'-%'
   or coalesce(length(trim(card->>'word')),0)=0
   or not coalesce(p_state->'completed','[]'::jsonb) ? client then
   raise exception 'Invalid library grammar card' using errcode='22023';
  end if;
  select id into entity from public.grammar
   where language_code=card->>'language' and title=card->>'word';
  if entity is null then
   insert into public.grammar(language_code,title,level,meaning_zh,structure,explanation)
   values(card->>'language',card->>'word',split_part(card->>'tag',' ',1),card->>'meaning',card->>'related',coalesce(card->>'note',card->>'example'))
   returning id into entity;
  end if;
  select entity_id into existing from public.client_id_map
   where user_id=p_uid and entity_type='grammar' and client_id=client;
  if existing is not null and existing is distinct from entity then
   raise exception 'Existing library grammar identity conflict; no records were changed';
  end if;
  insert into public.client_id_map(user_id,entity_type,client_id,entity_id)
   values(p_uid,'grammar',client,entity) on conflict do nothing;
  insert into public.user_grammar_progress(user_id,grammar_id)
   values(p_uid,entity) on conflict do nothing;
 end loop;
 -- Remove only the new library reading positions from the legacy projection input.
 -- The original complete snapshot is still retained by sync_personal_state.
 select coalesce(jsonb_object_agg(key,value),'{}'::jsonb) into filtered
  from jsonb_each(coalesce(p_state->'readingPositions','{}'))
  where key !~ '^article-(ja|en)-[a-z0-9-]+$';
 return jsonb_set(p_state,'{readingPositions}',filtered);
end;
$$;

create function private.finish_library_projection(p_uid uuid,p_state jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare entry record;metadata jsonb;entity uuid;client text;lang text;read_at timestamptz;
begin
 if p_uid is null or p_uid is distinct from auth.uid() or public.is_private_owner() is not true then
  raise exception 'Private owner required' using errcode='42501';
 end if;
 for entry in select * from jsonb_each(coalesce(p_state->'readingPositions','{}'))
  where key ~ '^article-(ja|en)-[a-z0-9-]+$' loop
  client:=entry.key;lang:=split_part(client,'-',2);
  metadata:=(p_state#>>array['notes','library-reading-meta-'||client])::jsonb;
  -- A restored older library snapshot without metadata must not hit legacy articles.
  if metadata is null then continue;end if;
  if metadata->>'id' is distinct from client or metadata->>'language' is distinct from lang
   or coalesce(length(trim(metadata->>'title')),0)=0
   or coalesce(length(trim(metadata->>'content')),0)=0 then
   raise exception 'Invalid library article metadata' using errcode='22023';
  end if;
  entity:=private.resolve_id(p_uid,'article',client);
  if exists(select 1 from public.articles where id=entity and title is distinct from metadata->>'title') then
   raise exception 'Existing library article identity conflict; no records were changed';
  end if;
  insert into public.articles(id,language_code,title,content,translation_zh,level,estimated_minutes,source_type)
   values(entity,lang,metadata->>'title',metadata->>'content',metadata->>'translation',metadata->>'level',(metadata->>'minutes')::integer,'lesson')
   on conflict(id) do nothing;
  read_at:=to_timestamp((entry.value->>'updatedAt')::numeric/1000);
  insert into public.reading_progress(user_id,article_id,progress,scroll_position,completed,last_read_at,completed_at)
   values(p_uid,entity,(entry.value->>'progress')::numeric,coalesce((entry.value->>'offset')::numeric,0),
    (entry.value->>'progress')::numeric>=100,read_at,case when (entry.value->>'progress')::numeric>=100 then read_at else null end)
   on conflict(user_id,article_id) do update set
    progress=excluded.progress,scroll_position=excluded.scroll_position,completed=excluded.completed,
    last_read_at=excluded.last_read_at,completed_at=excluded.completed_at
   where excluded.last_read_at>=public.reading_progress.last_read_at;
  update public.personal_notes set target_id=entity,language_code=lang
   where user_id=p_uid and title=client;
 end loop;
 -- Bind grammar notes to the newly resolved, independent grammar identities.
 update public.personal_notes n set target_id=m.entity_id,language_code=g.language_code
  from public.client_id_map m join public.grammar g on g.id=m.entity_id
  where n.user_id=p_uid and m.user_id=p_uid and m.entity_type='grammar' and n.title=m.client_id;
end;
$$;

-- Preserve the installed projection as a delegate; all existing audio/session behavior stays.
alter function private.project_state(uuid,jsonb) rename to project_pre_library_state;
create function private.project_state(uid uuid,s jsonb)
returns void language plpgsql security definer set search_path='' as $$
begin
 if uid is null or uid is distinct from auth.uid() or public.is_private_owner() is not true then
  raise exception 'Private owner required' using errcode='42501';
 end if;
 perform private.project_pre_library_state(uid,private.prepare_library_projection(uid,s));
 perform private.finish_library_projection(uid,s);
end;
$$;
revoke all on function private.prepare_library_projection(uuid,jsonb),
 private.finish_library_projection(uuid,jsonb),private.project_pre_library_state(uuid,jsonb),
 private.project_state(uuid,jsonb) from public,anon,authenticated;

-- Compatibility capability only. This is not an authorization replacement.
create function public.content_library_ready() returns boolean
language plpgsql stable security invoker set search_path='' as $$
begin
 if public.is_private_owner() is not true then
  raise exception 'Private owner required' using errcode='42501';
 end if;
 return true;
end;
$$;
revoke all on function public.content_library_ready() from public,anon,authenticated;
grant execute on function public.content_library_ready() to authenticated;
