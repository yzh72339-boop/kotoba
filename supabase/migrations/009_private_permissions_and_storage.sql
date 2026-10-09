-- Restrict privileges independently of Supabase's project default grants.
-- RLS does not protect TRUNCATE, so the browser must never receive it.
alter table private.app_owner enable row level security;
revoke all on private.app_owner from public,anon,authenticated;

do $$declare t text; owned_column text;begin
 foreach t in array array[
  'users','profiles','user_languages','vocabulary','vocabulary_examples','vocabulary_collocations',
  'grammar','grammar_relations','grammar_examples','user_grammar_progress','articles','reading_progress',
  'saved_sentences','sentence_vocabulary','sentence_grammar','review_items','review_logs',
  'listening_episodes','listening_progress','speaking_sessions','mistakes','ai_conversations','ai_messages',
  'daily_plans','study_sessions','personal_notes','backups','downloads','sync_batches','client_id_map',
  'user_progress','ai_requests','ai_usage','personal_audio_files','languages','courses','lessons',
  'legacy_profiles','legacy_vocabulary','legacy_grammar','legacy_reviews','legacy_study_sessions','legacy_ai_conversations'
 ] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  if t='ai_usage' then continue;end if;
  if t in ('users','user_progress','review_items','review_logs','sync_batches','client_id_map','ai_requests',
           'languages','courses','lessons','legacy_profiles','legacy_vocabulary','legacy_grammar',
           'legacy_reviews','legacy_study_sessions','legacy_ai_conversations') then
   execute format('grant select on public.%I to authenticated',t);
  else
   execute format('grant select,insert,update,delete on public.%I to authenticated',t);
  end if;
  -- Restrictive policies combine with the existing ownership/parent policies
  -- using AND. Another permissive policy cannot reopen this private app.
  select a.attname into owned_column from pg_catalog.pg_attribute a
   where a.attrelid=format('public.%I',t)::regclass and a.attname='user_id' and not a.attisdropped;
  if t in ('profiles','users') then owned_column:='id';end if;
  if owned_column is not null then
   execute format('create policy private_owner_fence on public.%I as restrictive for all to authenticated using(public.is_private_owner() and %I=auth.uid()) with check(public.is_private_owner() and %I=auth.uid())',t,owned_column,owned_column);
  else
   execute format('create policy private_owner_fence on public.%I as restrictive for all to authenticated using(public.is_private_owner()) with check(public.is_private_owner())',t);
  end if;
 end loop;
end;$$;

-- Preserve existing objects while making matching buckets private too.
update storage.buckets set public=false
 where id in ('personal-audio','personal-backups','personal-content') and public is distinct from false;
-- Only these three buckets are fenced; unrelated project buckets are untouched.
create policy managed_storage_owner_fence on storage.objects as restrictive for all to authenticated
 using(bucket_id not in ('personal-audio','personal-backups','personal-content') or
  (public.is_private_owner() and (storage.foldername(name))[1]=auth.uid()::text))
 with check(bucket_id not in ('personal-audio','personal-backups','personal-content') or
  (public.is_private_owner() and (storage.foldername(name))[1]=auth.uid()::text));
create policy managed_storage_anon_fence on storage.objects as restrictive for all to anon
 using(bucket_id not in ('personal-audio','personal-backups','personal-content'))
 with check(bucket_id not in ('personal-audio','personal-backups','personal-content'));
revoke all on function public.create_user_profile() from public,anon,authenticated;
