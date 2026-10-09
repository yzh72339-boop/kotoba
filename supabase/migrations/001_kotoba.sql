-- Private foundation. For staged Dashboard deployment use 001_deploy.sql.
-- No browser data access is opened before the personal backend is ready.
create extension if not exists pgcrypto;
create table public.languages(id text primary key, name text not null);
insert into public.languages values ('ja','日本語'),('en','English');
create table public.users(id uuid primary key references auth.users on delete cascade, created_at timestamptz not null default now());
create table public.profiles(user_id uuid primary key references public.users on delete cascade, name text not null default 'Learner', language text references public.languages default 'ja', level text default 'N3', goal text default '日常交流', daily_goal int default 30 check(daily_goal in (10,20,30,45)), updated_at timestamptz default now());
create table public.courses(id uuid primary key default gen_random_uuid(), language text references public.languages not null, level text not null, title text not null, published boolean not null default false);
create table public.lessons(id uuid primary key default gen_random_uuid(), course_id uuid references public.courses on delete cascade not null, title text not null, position int not null, content jsonb not null default '{}', unique(course_id,position));
create table public.vocabulary(id text primary key, language text references public.languages not null, word text not null, pronunciation text, meaning text not null, level text, content jsonb not null default '{}');
create table public.grammar(id text primary key, language text references public.languages not null, title text not null, level text, content jsonb not null default '{}');
create table public.reviews(id uuid primary key default gen_random_uuid(), user_id uuid references public.users on delete cascade not null, card_id text not null, card_type text not null check(card_type in ('vocabulary','grammar','sentence')), due timestamptz not null default now(), interval_days int not null default 0 check(interval_days>=0), ease numeric not null default 2.5 check(ease>=1.3), repetitions int not null default 0, lapses int not null default 0, unique(user_id,card_id));
create index reviews_due on public.reviews(user_id,due);
create table public.study_sessions(id uuid primary key default gen_random_uuid(), user_id uuid references public.users on delete cascade not null, day date not null default current_date, minutes numeric not null check(minutes>=0), type text not null, card_count int default 0, created_at timestamptz not null default now());
create table public.user_progress(user_id uuid primary key references public.users on delete cascade, state jsonb not null default '{}', updated_at timestamptz not null default now(), check(octet_length(state::text)<2097152));
create table public.ai_conversations(id uuid primary key default gen_random_uuid(), user_id uuid references public.users on delete cascade not null, role text not null check(role in ('user','assistant')), content text not null check(length(content)<=16000), created_at timestamptz not null default now());
create table public.ai_usage(user_id uuid references public.users on delete cascade, bucket timestamptz not null, count int not null default 0, primary key(user_id,bucket));
create or replace function public.create_user_profile() returns trigger language plpgsql security definer set search_path = '' as $$begin
if lower(coalesce(new.email,''))<>'owner@example.com' then
 raise exception 'Private application: registration is closed';
end if;
insert into public.users(id) values(new.id);
insert into public.profiles(user_id,name) values(new.id,coalesce(new.raw_user_meta_data->>'name','Learner'));
return new;end;$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.create_user_profile();
-- Backfill already-existing accounts.
insert into public.users(id) select id from auth.users on conflict do nothing;
insert into public.profiles(user_id) select id from auth.users on conflict do nothing;
-- User-owned records are visible and writable only by their owner.
alter table public.users enable row level security;
create policy "own user" on public.users for select to authenticated using(auth.uid()=id);
alter table public.profiles enable row level security;
create policy "own profile" on public.profiles for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
alter table public.reviews enable row level security;
create policy "own reviews" on public.reviews for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
alter table public.study_sessions enable row level security;
create policy "own sessions" on public.study_sessions for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
alter table public.user_progress enable row level security;
create policy "own progress" on public.user_progress for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
alter table public.ai_conversations enable row level security;
create policy "own conversations" on public.ai_conversations for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
alter table public.ai_usage enable row level security;
-- Prototype curriculum remains closed during the first deployment checkpoint.
alter table public.languages enable row level security;
create policy "read languages" on public.languages for select to authenticated using(false);
alter table public.courses enable row level security;
create policy "published courses" on public.courses for select to authenticated using(false);
alter table public.lessons enable row level security;
create policy "published lessons" on public.lessons for select to authenticated using(false);
alter table public.vocabulary enable row level security;
create policy "read vocabulary" on public.vocabulary for select to authenticated using(false);
alter table public.grammar enable row level security;
create policy "read grammar" on public.grammar for select to authenticated using(false);
-- Atomic hourly quota. Only the Edge Function's service role may call this.
create or replace function public.consume_ai_request(p_user uuid) returns boolean language plpgsql security definer set search_path = '' as $$
declare usage_count int; hour_bucket timestamptz:=date_trunc('hour',now());
begin
insert into public.ai_usage(user_id,bucket,count) values(p_user,hour_bucket,1)
on conflict(user_id,bucket) do update set count=public.ai_usage.count+1 returning count into usage_count;
return usage_count<=30;
end;$$;
revoke all on function public.consume_ai_request(uuid) from public,anon,authenticated;
grant execute on function public.consume_ai_request(uuid) to service_role;
revoke all on function public.create_user_profile() from public,anon,authenticated;
-- Revoke TRUNCATE as well: RLS cannot restrict that privilege.
do $$declare t text;begin
 foreach t in array array['languages','users','profiles','courses','lessons','vocabulary','grammar','reviews','study_sessions','user_progress','ai_conversations','ai_usage'] loop
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('create policy stage_001_closed on public.%I as restrictive for all to anon,authenticated using(false) with check(false)',t);
 end loop;
end;$$;
