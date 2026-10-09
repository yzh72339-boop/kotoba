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
