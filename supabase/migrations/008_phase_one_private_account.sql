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
