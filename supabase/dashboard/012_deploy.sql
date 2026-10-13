-- Deploy ONLY 012 after verified 001–011. Entire operation is transactional.
begin;
set local lock_timeout='5s';
set local statement_timeout='120s';
do $deploy_context$
declare migration_sql text:=$context_sql$
-- Personal context cards use the existing transactional SRS and snapshot sync.
-- Keep vocabulary/sentence uniqueness, all legacy IDs and migrations 001–011.
do $$ begin
 if to_regprocedure('private.project_pre_library_state(uuid,jsonb)') is null
  or to_regprocedure('private.project_pre_context_state(uuid,jsonb)') is not null then
  raise exception 'Expected migrations 001–011 and an undeployed 012; stop';
 end if;
end $$;

create table public.personal_context_cards(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 client_id text not null check(client_id ~ '^context-card-(ja|en)-[a-f0-9]{32}$'),
 language_code text not null check(language_code in ('ja','en')),
 expression text not null check(length(trim(expression)) between 1 and 1200),
 meaning_zh text not null check(length(trim(meaning_zh)) between 1 and 4000),
 source_sentence text not null check(length(source_sentence) between 1 and 12000),
 material_id text not null,snapshot_id text not null,paragraph_id text not null,
 source_title text not null,content_version integer not null check(content_version>0),
 card_kind text not null check(card_kind in ('word','sentence')),
 recall_mode text not null check(recall_mode in ('expression','context')),
 paused boolean not null default false,archived boolean not null default false,
 previous_review_state text check(previous_review_state in ('new','learning','review','relearning')),
 memory_strength numeric not null default 0 check(memory_strength between 0 and 100),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(user_id,client_id),unique(id,user_id),
 check(client_id like 'context-card-'||language_code||'-%')
);
alter table public.personal_context_cards enable row level security;
create policy personal_context_owner on public.personal_context_cards for all to authenticated
 using(user_id=(select auth.uid()) and (select public.is_private_owner()))
 with check(user_id=(select auth.uid()) and (select public.is_private_owner()));
revoke all on public.personal_context_cards from public,anon;
grant select,insert,update,delete on public.personal_context_cards to authenticated;
create index personal_context_language on public.personal_context_cards(user_id,language_code,archived);
create trigger touch_updated_at before update on public.personal_context_cards for each row execute function private.touch_updated_at();

-- This expands the target kinds, without changing any existing target or scheduler.
alter table public.review_items drop constraint review_items_item_type_check;
alter table public.review_items add constraint review_items_item_type_check
 check(item_type in ('vocabulary','grammar','sentence','context'));
create or replace function private.validate_review_target() returns trigger language plpgsql set search_path='' as $$ begin
 if new.item_type='vocabulary' and not exists(select 1 from public.vocabulary where id=new.item_id and user_id=new.user_id) then raise exception 'Vocabulary ownership mismatch';
 elsif new.item_type='sentence' and not exists(select 1 from public.saved_sentences where id=new.item_id and user_id=new.user_id) then raise exception 'Sentence ownership mismatch';
 elsif new.item_type='grammar' and not exists(select 1 from public.grammar where id=new.item_id) then raise exception 'Unknown grammar';
 elsif new.item_type='context' and not exists(select 1 from public.personal_context_cards where id=new.item_id and user_id=new.user_id) then raise exception 'Context ownership mismatch';end if;
 return new;
end $$;
create function private.context_memory_strength() returns trigger language plpgsql set search_path='' as $$ begin
 if new.item_type='context' then
  update public.personal_context_cards set memory_strength=least(100,case when new.repetitions=0 then 0 else 30+new.repetitions*12 end)
   where id=new.item_id and user_id=new.user_id;
 end if;return new;
end $$;
create trigger update_context_memory after update of repetitions,lapse_count on public.review_items
 for each row when(new.item_type='context') execute function private.context_memory_strength();

-- Browser paragraph offsets are UTF-16 code units, including supplementary characters.
create function private.context_utf16_slice(value text,start_offset integer,end_offset integer) returns text
language sql immutable strict set search_path='' as $$
 select coalesce(string_agg(ch,'' order by ordinal),'') from (
  select ch,ordinal,sum(case when ascii(ch)>65535 then 2 else 1 end) over(order by ordinal) as finish
  from regexp_split_to_table(value,'') with ordinality as chars(ch,ordinal)
 ) positions where finish>start_offset and finish<=end_offset
$$;
revoke all on function private.context_utf16_slice(text,integer,integer) from public,anon,authenticated;

create function private.prepare_context_projection(p_uid uuid,p_state jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare entry record;card jsonb;snapshot jsonb;target uuid;review_id uuid;event jsonb;event_id uuid;filtered jsonb;
begin
 if p_uid is null or p_uid is distinct from auth.uid() or public.is_private_owner() is not true then
  raise exception 'Private owner required' using errcode='42501';end if;
 for entry in select * from jsonb_each(coalesce(p_state->'notes','{}')) where key like 'personal-context-context-card-%' loop
  card:=(entry.value#>>'{}')::jsonb;
  if entry.key is distinct from 'personal-context-'||(card->>'id')
   or card->>'id' !~ '^context-card-(ja|en)-[a-f0-9]{32}$'
   or card->>'id' not like 'context-card-'||(card->>'language')||'-%'
   or card->>'materialId' not like 'article-'||(card->>'language')||'-personal-%'
   or card->>'expression' is null or position(card->>'expression' in card->>'sentence')=0 then
   raise exception 'Invalid personal context card' using errcode='22023';end if;
  snapshot:=(p_state#>>array['notes','personal-snapshot-'||(card->>'snapshotId')])::jsonb;
  if snapshot is null or snapshot->>'id' is distinct from card->>'snapshotId'
   or snapshot->>'materialId' is distinct from card->>'materialId'
   or snapshot->>'language' is distinct from card->>'language'
   or snapshot->>'version' is distinct from card->>'version'
   or position(card->>'sentence' in snapshot->>'text')=0
   or not exists(select 1 from jsonb_array_elements(snapshot->'paragraphs') p where p->>'id'=card->>'paragraphId'
    and (p->>'start')::int>=0 and (p->>'end')::int>(p->>'start')::int
    and position(card->>'sentence' in private.context_utf16_slice(snapshot->>'text',(p->>'start')::int,(p->>'end')::int))>0) then
   raise exception 'Context snapshot does not belong to material' using errcode='22023';end if;
  target:=private.resolve_id(p_uid,'note','personal-context-'||(card->>'id'));
  insert into public.personal_context_cards(id,user_id,client_id,language_code,expression,meaning_zh,source_sentence,material_id,snapshot_id,paragraph_id,source_title,content_version,card_kind,recall_mode,paused,archived,created_at)
   values(target,p_uid,card->>'id',card->>'language',card->>'expression',card->>'meaning',card->>'sentence',card->>'materialId',card->>'snapshotId',card->>'paragraphId',card->>'title',(card->>'version')::int,card->>'kind',card->>'mode',(card->>'paused')::boolean,(card->>'archived')::boolean,to_timestamp((card->>'createdAt')::numeric/1000))
   on conflict(user_id,client_id) do update set expression=excluded.expression,meaning_zh=excluded.meaning_zh,recall_mode=excluded.recall_mode,paused=excluded.paused,archived=excluded.archived;
  insert into public.review_items(user_id,item_type,item_id) values(p_uid,'context',target) on conflict(user_id,item_type,item_id) do nothing;
 end loop;
 -- Deleting a card in a restored snapshot archives it, preserving SRS/history.
 update public.personal_context_cards c set archived=true where c.user_id=p_uid
  and not coalesce(p_state->'notes','{}') ? ('personal-context-'||c.client_id);
 for event in select * from jsonb_array_elements(coalesce(p_state->'reviewHistory','[]')) where value->>'cardId' ~ '^context-card-(ja|en)-[a-f0-9]{32}$' loop
  select r.id into review_id from public.review_items r join public.personal_context_cards c on c.id=r.item_id and c.user_id=r.user_id
   where r.user_id=p_uid and r.item_type='context' and c.client_id=event->>'cardId' and c.language_code=event->>'language';
  if review_id is null then raise exception 'Context review target missing' using errcode='22023';end if;
  event_id:=case when event->>'id' ~ '^[0-9a-f-]{36}$' then (event->>'id')::uuid else private.resolve_id(p_uid,'note','context-review-'||(event->>'id')) end;
  perform public.record_review(review_id,event_id,lower(event->>'rating'),to_timestamp((event->>'at')::numeric/1000));
 end loop;
 update public.personal_context_cards c set previous_review_state=r.state from public.review_items r
  where r.item_type='context' and r.user_id=p_uid and c.id=r.item_id and c.user_id=p_uid and (c.paused or c.archived) and r.state<>'suspended';
 update public.review_items r set state='suspended' from public.personal_context_cards c
  where r.item_type='context' and r.user_id=p_uid and c.id=r.item_id and c.user_id=p_uid and (c.paused or c.archived);
 update public.review_items r set state=coalesce(c.previous_review_state,case when r.review_count=0 then 'new' else 'review' end) from public.personal_context_cards c
  where r.item_type='context' and r.user_id=p_uid and c.id=r.item_id and c.user_id=p_uid and not c.paused and not c.archived and r.state='suspended';
 select coalesce(jsonb_agg(value),'[]') into filtered from jsonb_array_elements(coalesce(p_state->'reviewHistory','[]')) where value->>'cardId' !~ '^context-card-(ja|en)-[a-f0-9]{32}$';
 return jsonb_set(p_state,'{reviewHistory}',filtered);
end $$;

alter function private.project_state(uuid,jsonb) rename to project_pre_context_state;
create function private.project_state(uid uuid,s jsonb) returns void language plpgsql security definer set search_path='' as $$ begin
 if uid is null or uid is distinct from auth.uid() or public.is_private_owner() is not true then raise exception 'Private owner required' using errcode='42501';end if;
 perform private.project_pre_context_state(uid,private.prepare_context_projection(uid,s));
end $$;
revoke all on function private.prepare_context_projection(uuid,jsonb),private.project_pre_context_state(uuid,jsonb),private.project_state(uuid,jsonb),private.context_memory_strength() from public,anon,authenticated;
create function public.personal_context_ready() returns boolean language plpgsql stable security invoker set search_path='' as $$ begin
 if public.is_private_owner() is not true then raise exception 'Private owner required' using errcode='42501';end if;return true;
end $$;
revoke all on function public.personal_context_ready() from public,anon;
grant execute on function public.personal_context_ready() to authenticated;

$context_sql$;old_tables jsonb;old_scheduler text;old_policies text;old_helper text;
begin
 if exists(select 1 from supabase_migrations.schema_migrations m where m.version='012') then
  if not exists(select 1 from supabase_migrations.schema_migrations m where m.version='012' and m.name='personal_context_cards' and m.statements=array[migration_sql]) then raise exception '012 already recorded with different SQL; stop';end if;
  raise notice '012 already installed; no changes';return;
 end if;
 if (select count(*) from supabase_migrations.schema_migrations m where m.version in ('001','002','003','004','005','006','007','008','009','010','011'))<>11 then raise exception 'Verified 001–011 required';end if;
 select jsonb_object_agg(c.relname,c.oid) into old_tables from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r';
 old_scheduler:=pg_get_functiondef('public.record_review(uuid,uuid,text,timestamptz,integer)'::regprocedure);
 old_policies:=(select md5(coalesce(jsonb_agg(to_jsonb(p) order by p.schemaname,p.tablename,p.policyname)::text,'[]')) from pg_policies p where p.schemaname in ('public','storage'));
 old_helper:=coalesce(pg_get_functiondef(to_regprocedure('public.rls_auto_enable()')),'');
 execute migration_sql;
 if exists(select 1 from jsonb_each(old_tables) t where to_regclass('public.'||quote_ident(t.key))::oid is distinct from (t.value#>>'{}')::oid) then raise exception 'Existing table identity changed';end if;
 if old_scheduler is distinct from pg_get_functiondef('public.record_review(uuid,uuid,text,timestamptz,integer)'::regprocedure) then raise exception 'Scheduler changed';end if;
 if old_helper is distinct from coalesce(pg_get_functiondef(to_regprocedure('public.rls_auto_enable()')),'') then raise exception 'RLS helper changed';end if;
 if old_policies is distinct from (select md5(coalesce(jsonb_agg(to_jsonb(p) order by p.schemaname,p.tablename,p.policyname)::text,'[]')) from pg_policies p where p.schemaname in ('public','storage') and p.tablename<>'personal_context_cards') then raise exception 'Prior policies changed';end if;
 insert into supabase_migrations.schema_migrations(version,name,statements) values('012','personal_context_cards',array[migration_sql]);
end;
$deploy_context$;
commit;
select version,name from supabase_migrations.schema_migrations order by version;
