-- One reviewed migration only. Does not enable public registration.
begin;
lock table auth.users in share row exclusive mode;
do $deploy_013$
declare v_sql text:=$migration_013$-- Additive 2.9.1 upgrade. Apply through 013_deploy.sql; never rerun 001–012.
-- A finite seat ledger, not a drifting counter. Ordinary Auth INSERT and seat
-- assignment commit/rollback together. The advisory Auth Hook never reserves.
lock table auth.users in share row exclusive mode;
do $$begin
 if (select count(*) from private.app_owner o join auth.users u on u.id=o.user_id
     where o.singleton and u.email_confirmed_at is not null)<>1 then
  raise exception 'A confirmed, UUID-bound original administrator is required';
 end if;
 if (select count(*) from auth.users where id<>(select user_id from private.app_owner where singleton))>10 then
  raise exception 'More than ten existing ordinary accounts: review manually; no accounts were deleted';
 end if;
end $$;

create table private.beta_config(
 singleton boolean primary key default true check(singleton),
 admin_user_id uuid not null unique references auth.users(id),
 capacity integer not null default 10 check(capacity between 1 and 10),
 enabled boolean not null default false,registration_open boolean not null default false,
 admission_epoch bigint not null default 0,check(not registration_open or enabled)
);
insert into private.beta_config(singleton,admin_user_id) select true,user_id from private.app_owner where singleton;
create table private.beta_members(
 user_id uuid primary key references auth.users(id) on delete cascade deferrable initially deferred,
 seat integer not null unique check(seat between 1 and 10),created_at timestamptz not null default now()
);
insert into private.beta_members(user_id,seat)
 select id,row_number() over(order by id)::integer from auth.users
 where id<>(select admin_user_id from private.beta_config);
-- Flush valid backfill FK events before configuring RLS on this new table.
set constraints all immediate;
create table private.beta_upgrade_backup(kind text not null,identity text not null,definition text not null,primary key(kind,identity));
alter table private.beta_config enable row level security;
alter table private.beta_members enable row level security;
alter table private.beta_upgrade_backup enable row level security;
revoke all on private.beta_config,private.beta_members,private.beta_upgrade_backup from public,anon,authenticated,service_role;

-- Keep the original identity separate from learning authorization. A metadata
-- role, email supplied by a caller, or seat never makes someone administrator.
insert into private.beta_upgrade_backup values('function','public.is_private_owner()',pg_get_functiondef('public.is_private_owner()'::regprocedure));
create or replace function public.is_private_owner() returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from private.beta_config c
  join auth.users u on u.id=c.admin_user_id where u.id=auth.uid() and u.email_confirmed_at is not null
   and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now()));
$$;
create function public.has_learning_access() returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from auth.users u cross join private.beta_config c
  where u.id=auth.uid() and u.email_confirmed_at is not null and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now()) and
   (u.id=c.admin_user_id or (c.enabled and exists(select 1 from private.beta_members m where m.user_id=u.id))));
$$;
revoke all on function public.has_learning_access() from public,anon,authenticated;
grant execute on function public.has_learning_access() to authenticated;

create function public.beta_signup_status() returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('enabled',c.enabled,'open',c.registration_open,
  'total',c.capacity,'remaining',greatest(0,c.capacity-(select count(*) from private.beta_members)))
 from private.beta_config c where singleton;
$$;
revoke all on function public.beta_signup_status() from public,anon,authenticated;
grant execute on function public.beta_signup_status() to anon,authenticated;

create function private.before_user_created(event jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c private.beta_config; uid uuid; email text; provider text;
begin
 select * into c from private.beta_config where singleton;
 if not found then return jsonb_build_object('error',jsonb_build_object('http_code',503,'message','Registration unavailable'));end if;
 uid:=(event#>>'{user,id}')::uuid;email:=event#>>'{user,email}';provider:=event#>>'{user,app_metadata,provider}';
 if uid=c.admin_user_id then return '{}'::jsonb;end if;
 if not c.enabled or not c.registration_open then
  return jsonb_build_object('error',jsonb_build_object('http_code',403,'message','Beta registration is closed'));end if;
 if coalesce(email,'')='' or coalesce(provider,'')<>'email' or coalesce((event#>>'{user,is_anonymous}')::boolean,false) then
  return jsonb_build_object('error',jsonb_build_object('http_code',403,'message','Email/password registration required'));end if;
 if not exists(select 1 from generate_series(1,c.capacity) n where not exists(select 1 from private.beta_members m where m.seat=n)) then
  return jsonb_build_object('error',jsonb_build_object('http_code',403,'message','Beta capacity reached'));end if;
 -- Some Auth releases call this before their INSERT transaction. Do not make a
 -- durable reservation here. The trigger below is the final atomic authority.
 return '{}'::jsonb;
exception when invalid_text_representation then
 return jsonb_build_object('error',jsonb_build_object('http_code',400,'message','Invalid account request'));
end;
$$;
revoke all on function private.before_user_created(jsonb) from public,anon,authenticated,service_role;
grant usage on schema private to supabase_auth_admin;
grant execute on function private.before_user_created(jsonb) to supabase_auth_admin;

insert into private.beta_upgrade_backup values('function','private.guard_owner_signup()',pg_get_functiondef('private.guard_owner_signup()'::regprocedure));
create or replace function private.guard_owner_signup() returns trigger
language plpgsql security definer set search_path='' as $$
declare c private.beta_config; free_seat integer;
begin
 select * into c from private.beta_config where singleton for update;
 if not found then raise exception 'Registration unavailable' using errcode='42501';end if;
 if new.id=c.admin_user_id then return new;end if;
 if not c.enabled or not c.registration_open then raise exception 'Beta registration is closed' using errcode='42501';end if;
 if new.email is null or coalesce(new.encrypted_password,'')='' or coalesce(new.is_anonymous,false)
    or coalesce(new.raw_app_meta_data->>'provider','')<>'email' then
  raise exception 'Email/password registration required' using errcode='42501';end if;
 select n into free_seat from generate_series(1,c.capacity) n
  where not exists(select 1 from private.beta_members m where m.seat=n) order by n limit 1;
 if free_seat is null then raise exception 'Beta capacity reached' using errcode='23514';end if;
 insert into private.beta_members(user_id,seat) values(new.id,free_seat);
 update private.beta_config set admission_epoch=admission_epoch+1 where singleton;
 return new;
end;
$$;
create function private.protect_beta_admin() returns trigger
language plpgsql security definer set search_path='' as $$
declare c private.beta_config;
begin
 select * into c from private.beta_config where singleton for update;
 if old.id=c.admin_user_id then raise exception 'Original administrator cannot be deleted' using errcode='42501';end if;
 -- FK cascade removes exactly this user's seat in this Auth deletion transaction.
 update private.beta_config set admission_epoch=admission_epoch+1 where singleton;
 return old;
end;
$$;
create trigger protect_beta_admin before delete on auth.users for each row execute function private.protect_beta_admin();
revoke all on function private.protect_beta_admin() from public,anon,authenticated,service_role;

insert into private.beta_upgrade_backup values('function','private.ensure_private_profile(uuid)',pg_get_functiondef('private.ensure_private_profile(uuid)'::regprocedure));
create or replace function private.ensure_private_profile(uid uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if uid is null or not exists(select 1 from auth.users u cross join private.beta_config c where u.id=uid
  and (u.id=c.admin_user_id or exists(select 1 from private.beta_members m where m.user_id=u.id))) then
  raise exception 'Registered identity required' using errcode='42501';end if;
 insert into public.users(id) values(uid) on conflict do nothing;
 insert into public.profiles(id,display_name) values(uid,'Learner') on conflict do nothing;
 insert into public.user_languages(user_id,language_code,current_level,primary_language)
  values(uid,'ja','N3',not exists(select 1 from public.user_languages where user_id=uid and primary_language)),(uid,'en','B1',false)
  on conflict(user_id,language_code) do nothing;
end;
$$;
insert into private.beta_upgrade_backup values('function','public.create_user_profile()',pg_get_functiondef('public.create_user_profile()'::regprocedure));
create or replace function public.create_user_profile() returns trigger
language plpgsql security definer set search_path='' as $$
begin perform private.ensure_private_profile(new.id);return new;end;
$$;
do $$declare uid uuid;begin for uid in select user_id from private.beta_members loop perform private.ensure_private_profile(uid);end loop;end $$;

-- Scope projected course copies as well as progress. They can contain user
-- supplied examples/metadata and must not become a shared content leak.
alter table public.grammar add column user_id uuid references auth.users(id) on delete cascade;
alter table public.articles add column user_id uuid references auth.users(id) on delete cascade;
alter table public.listening_episodes add column user_id uuid references auth.users(id) on delete cascade;
update public.grammar set user_id=(select admin_user_id from private.beta_config)
 where id not in ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003');
update public.articles set user_id=(select admin_user_id from private.beta_config)
 where id not in ('20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002');
update public.listening_episodes set user_id=(select admin_user_id from private.beta_config)
 where id not in ('30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002');
alter table public.grammar drop constraint grammar_language_code_title_key;
alter table public.grammar add constraint grammar_scope_title_key unique nulls not distinct(user_id,language_code,title);
create function private.scope_projected_content() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is not null then
  if public.has_learning_access() is not true then raise exception 'Learning access required' using errcode='42501';end if;
  if new.user_id is not null and new.user_id<>auth.uid() then raise exception 'Content owner mismatch' using errcode='42501';end if;
  new.user_id:=auth.uid();
 end if;
 return new;
end;
$$;
do $$declare t text;begin foreach t in array array['grammar','articles','listening_episodes'] loop
 execute format('create trigger scope_beta_content before insert on public.%I for each row execute function private.scope_projected_content()',t);
 execute format('create index on public.%I(user_id)',t);
end loop;end $$;
revoke all on function private.scope_projected_content() from public,anon,authenticated,service_role;

-- Preserve the installed schedulers/projection bodies and ACLs; change only the
-- learning authorization predicate. All existing auth.uid()/p_uid checks stay.
do $$declare r record; definition text;begin
 for r in select p.oid,p.oid::regprocedure::text identity from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname in ('public','private') and p.prokind='f' and p.proname not in
   ('is_private_owner','has_learning_access','configure_private_owner') and p.prosrc like '%public.is_private_owner()%' loop
  definition:=pg_get_functiondef(r.oid);
  insert into private.beta_upgrade_backup values('function',r.identity,definition) on conflict do nothing;
  execute replace(definition,'public.is_private_owner()','public.has_learning_access()');
 end loop;
 definition:=pg_get_functiondef('private.prepare_library_projection(uuid,jsonb)'::regprocedure);
 if position('where language_code=card->>''language'' and title=card->>''word''' in definition)=0 then raise exception 'Unexpected grammar projection; no changes committed';end if;
 execute replace(definition,'where language_code=card->>''language'' and title=card->>''word''',
  'where (user_id=p_uid or user_id is null) and language_code=card->>''language'' and title=card->>''word'' order by user_id nulls first');
end $$;

-- Replace owner-only fences, retaining row and parent ownership expressions.
do $$declare r record;u text;w text;roles text;statement text;begin
 for r in select * from pg_policies where schemaname in ('public','storage') loop
  roles:=array_to_string(r.roles,',');u:=r.qual;w:=r.with_check;
  statement:=format('create policy %I on %I.%I as %s for %s to %s',r.policyname,r.schemaname,r.tablename,r.permissive,r.cmd,roles);
  if u is not null then statement:=statement||' using('||u||')';end if;
  if w is not null then statement:=statement||' with check('||w||')';end if;
  insert into private.beta_upgrade_backup values('policy',r.schemaname||'.'||r.tablename||'.'||r.policyname,statement);
  if r.qual like '%is_private_owner()%' or r.with_check like '%is_private_owner()%' then
   -- Preserve owner-only access to unowned legacy dictionaries; user-owned
   -- legacy history retains its auth.uid() fence for admitted existing users.
   if r.tablename in ('legacy_vocabulary','legacy_grammar') then continue;end if;
   u:=replace(u,'is_private_owner()','has_learning_access()');w:=replace(w,'is_private_owner()','has_learning_access()');
   statement:=format('alter policy %I on %I.%I',r.policyname,r.schemaname,r.tablename);
   if u is not null then statement:=statement||' using('||u||')';end if;
   if w is not null then statement:=statement||' with check('||w||')';end if;
   execute statement;
  end if;
 end loop;
 -- Shared seeds are read-only; own projected copies are isolated, including admin.
 for r in select * from pg_policies where schemaname='public' and tablename in
  ('grammar','articles','listening_episodes','grammar_examples','grammar_relations') loop
  execute format('drop policy %I on public.%I',r.policyname,r.tablename);
 end loop;
 foreach roles in array array['grammar','articles','listening_episodes'] loop
  execute format('create policy beta_content_read on public.%I for select to authenticated using(public.has_learning_access() and (user_id is null or user_id=auth.uid()))',roles);
  execute format('create policy beta_content_own on public.%I for all to authenticated using(public.has_learning_access() and user_id=auth.uid()) with check(public.has_learning_access() and user_id=auth.uid())',roles);
 end loop;
end $$;
create policy beta_grammar_example_read on public.grammar_examples for select to authenticated
 using(public.has_learning_access() and exists(select 1 from public.grammar g where g.id=grammar_id));
create policy beta_grammar_example_own on public.grammar_examples for all to authenticated
 using(public.has_learning_access() and exists(select 1 from public.grammar g where g.id=grammar_id and g.user_id=auth.uid()))
 with check(public.has_learning_access() and exists(select 1 from public.grammar g where g.id=grammar_id and g.user_id=auth.uid()));
create policy beta_grammar_relation_read on public.grammar_relations for select to authenticated
 using(public.has_learning_access() and exists(select 1 from public.grammar g where g.id=grammar_id) and exists(select 1 from public.grammar g where g.id=related_grammar_id));
create policy beta_grammar_relation_own on public.grammar_relations for all to authenticated
 using(public.has_learning_access() and exists(select 1 from public.grammar g where g.id=grammar_id and g.user_id=auth.uid()) and exists(select 1 from public.grammar g where g.id=related_grammar_id))
 with check(public.has_learning_access() and exists(select 1 from public.grammar g where g.id=grammar_id and g.user_id=auth.uid()) and exists(select 1 from public.grammar g where g.id=related_grammar_id));
create policy beta_grammar_target on public.user_grammar_progress as restrictive for all to authenticated
 using(exists(select 1 from public.grammar g where g.id=grammar_id)) with check(exists(select 1 from public.grammar g where g.id=grammar_id));
create policy beta_reading_target on public.reading_progress as restrictive for all to authenticated
 using(exists(select 1 from public.articles a where a.id=article_id)) with check(exists(select 1 from public.articles a where a.id=article_id));
create policy beta_listening_target on public.listening_progress as restrictive for all to authenticated
 using(exists(select 1 from public.listening_episodes e where e.id=episode_id)) with check(exists(select 1 from public.listening_episodes e where e.id=episode_id));
create policy beta_sentence_grammar_target on public.sentence_grammar as restrictive for all to authenticated
 using(exists(select 1 from public.grammar g where g.id=grammar_id)) with check(exists(select 1 from public.grammar g where g.id=grammar_id));
alter policy private_legacy on public.courses using(public.has_learning_access() and published);
alter policy private_legacy on public.lessons using(public.has_learning_access() and exists(select 1 from public.courses c where c.id=course_id and c.published));
do $$declare definition text;begin
 definition:=pg_get_functiondef('private.validate_review_target()'::regprocedure);
 insert into private.beta_upgrade_backup values('function','private.validate_review_target()',definition);
 if position('where id=new.item_id)' in definition)=0 then raise exception 'Unexpected target validator';end if;
 execute replace(definition,'where id=new.item_id)','where id=new.item_id and (user_id is null or user_id=new.user_id))');
end $$;

create function public.beta_admin_accounts() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if public.is_private_owner() is not true then raise exception 'Administrator required' using errcode='42501';end if;
 return jsonb_build_object('status',public.beta_signup_status(),'accounts',coalesce((
  select jsonb_agg(jsonb_build_object('id',m.user_id,'seat',m.seat,'email',u.email,'confirmed',u.email_confirmed_at is not null,'createdAt',m.created_at) order by m.seat)
  from private.beta_members m join auth.users u on u.id=m.user_id),'[]'::jsonb));
end;
$$;
create function public.beta_admin_delete_check(p_target uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if public.is_private_owner() is not true then raise exception 'Administrator required' using errcode='42501';end if;
 if p_target is null or p_target=(select admin_user_id from private.beta_config) then raise exception 'Protected administrator' using errcode='42501';end if;
 return jsonb_build_object('exists',exists(select 1 from auth.users where id=p_target),'member',exists(select 1 from private.beta_members where user_id=p_target));
end;
$$;
create function public.beta_set_registration(p_open boolean,p_capacity integer default 10) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c private.beta_config;
begin
 if public.is_private_owner() is not true then raise exception 'Administrator required' using errcode='42501';end if;
 select * into c from private.beta_config where singleton for update;
 if p_open is null or p_capacity is null or p_capacity not between 1 and 10 or
   exists(select 1 from private.beta_members where seat>p_capacity) then raise exception 'Invalid capacity; no accounts were deleted' using errcode='22023';end if;
 if p_open and not exists(select 1 from auth.users where id=c.admin_user_id and email_confirmed_at is not null and coalesce(encrypted_password,'')<>'') then
  raise exception 'Original administrator needs a verified email/password login first' using errcode='42501';end if;
 if p_open and not exists(select 1 from jsonb_array_elements(coalesce(auth.jwt()->'amr','[]'::jsonb)) entry where entry->>'method'='password') then
  raise exception 'Sign in using the original administrator password before opening registration' using errcode='42501';end if;
 update private.beta_config set enabled=enabled or p_open,registration_open=p_open,capacity=p_capacity where singleton;
 return public.beta_signup_status();
end;
$$;
revoke all on function public.beta_admin_accounts(),public.beta_admin_delete_check(uuid),public.beta_set_registration(boolean,integer) from public,anon,authenticated;
grant execute on function public.beta_admin_accounts(),public.beta_admin_delete_check(uuid),public.beta_set_registration(boolean,integer) to authenticated;

create table private.beta_ai_usage(user_id uuid not null references auth.users on delete cascade,period text not null,bucket timestamptz not null,count integer not null,primary key(user_id,period,bucket));
alter table private.beta_ai_usage enable row level security;
revoke all on private.beta_ai_usage from public,anon,authenticated,service_role;
create or replace function public.consume_ai_request(p_user uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare n integer; b timestamptz; v_period text;
begin
 if not exists(select 1 from auth.users u cross join private.beta_config c where u.id=p_user and u.email_confirmed_at is not null and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now()) and
  (u.id=c.admin_user_id or c.enabled and exists(select 1 from private.beta_members m where m.user_id=u.id))) then return false;end if;
 perform pg_advisory_xact_lock(hashtextextended('beta-ai-'||p_user::text,0));
 foreach v_period in array array['minute','day'] loop
  b:=date_trunc(v_period,now() at time zone 'UTC') at time zone 'UTC';
  insert into private.beta_ai_usage values(p_user,v_period,b,1) on conflict(user_id,period,bucket)
   do update set count=private.beta_ai_usage.count+1 returning count into n;
  if (v_period='minute' and n>5) or (v_period='day' and n>30) then return false;end if;
 end loop;
 return true;
end;
$$;
revoke all on function public.consume_ai_request(uuid) from public,anon,authenticated;
grant execute on function public.consume_ai_request(uuid) to service_role;
$migration_013$; prior text[];
begin
 if exists(select 1 from generate_series(1,12) n where not exists(select 1 from supabase_migrations.schema_migrations where version=lpad(n::text,3,'0'))) then raise exception '001–012 must already be recorded; do not rerun them';end if;
 select statements into prior from supabase_migrations.schema_migrations where version='013';
 if found then
  if prior[1] is distinct from v_sql then raise exception 'Recorded 013 differs; stop without changes';end if;
 else
  execute v_sql;
  insert into supabase_migrations.schema_migrations(version,name,statements) values('013','limited_beta',array[v_sql]);
 end if;
end;
$deploy_013$;
commit;
select version,name from supabase_migrations.schema_migrations order by version;
