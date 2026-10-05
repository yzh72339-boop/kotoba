-- Only migration 004. Run this WHOLE file once as postgres, after 003 passes.
-- Creates one table/RPC and inserts existing starter content. Does not call AI.
begin;
set local lock_timeout='5s';
set local statement_timeout='120s';
do $deploy_004$
declare
 migration_sql text:=$migration_004$
-- Only migration 004. Install request deduplication and existing starter content.
-- No AI provider is called and no existing learning data is overwritten.
create table public.ai_requests(user_id uuid not null references auth.users on delete cascade,request_id uuid not null,status text not null default 'pending' check(status in ('pending','complete','failed')),response jsonb,started_at timestamptz not null default now(),completed_at timestamptz,primary key(user_id,request_id));
alter table public.ai_requests enable row level security;
create policy owner_read on public.ai_requests for select to authenticated using(public.is_private_owner() and user_id=auth.uid());
-- Project defaults can grant table privileges directly to browser roles.
-- Keep direct access closed until the final minimal grants migration.
revoke all on public.ai_requests from public,anon,authenticated;
create or replace function public.claim_ai_request(p_request uuid) returns jsonb language plpgsql security definer set search_path='' as $$declare r public.ai_requests;inserted integer;claim_time timestamptz;begin
 if not public.is_private_owner() then raise exception 'Private owner required' using errcode='42501';end if;
 if p_request is null then raise exception 'Invalid AI request' using errcode='22023';end if;
 insert into public.ai_requests(user_id,request_id) values(auth.uid(),p_request) on conflict do nothing;
 get diagnostics inserted=row_count;
 select * into r from public.ai_requests where user_id=auth.uid() and request_id=p_request for update;
 if r.status='complete' then return jsonb_build_object('cached',true,'response',r.response);end if;
 -- Use the INSERT outcome, not timestamp equality, to recognize a new request.
 -- A second call in the same transaction must not acquire the same request again.
 claim_time:=clock_timestamp();
 if inserted=1 or r.status='failed' or (r.status='pending' and r.started_at<claim_time-interval '2 minutes') then
  update public.ai_requests set status='pending',started_at=claim_time,completed_at=null,response=null where user_id=auth.uid() and request_id=p_request;
  return jsonb_build_object('acquired',true);
 end if;
 return jsonb_build_object('acquired',false);
end;$$;
revoke all on function public.claim_ai_request(uuid) from public,anon;grant execute on function public.claim_ai_request(uuid) to authenticated;
-- Starter grammar is private shared content. Stable IDs enable sentence relations and SRS.
insert into public.grammar(id,language_code,title,level,meaning_zh,structure,explanation) values
 ('10000000-0000-4000-8000-000000000001','ja','〜わけではない','N3','并不是…… / 并非意味着……','普通形 + わけではない','用于部分否定、否定过于笼统的推断。'),
 ('10000000-0000-4000-8000-000000000002','ja','〜とは限らない','N3','不一定……','普通形 + とは限らない','表达判断未必成立、存在例外。'),
 ('10000000-0000-4000-8000-000000000003','en','The present perfect','B1','过去发生、与现在有关','Subject + have / has + past participle','连接过去与现在，描述经历、已完成动作或持续状态。') on conflict do nothing;
insert into public.grammar_relations(grammar_id,related_grammar_id,relation_type) values('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','often_confused') on conflict do nothing;
insert into public.grammar_examples(grammar_id,sentence,translation_zh)
select x.grammar_id::uuid,x.sentence,x.translation_zh from (values
 ('10000000-0000-4000-8000-000000000001','日本人だからといって、みんな寿司が好きなわけではない。','并不是所有日本人都喜欢寿司。'),
 ('10000000-0000-4000-8000-000000000003','I have lived in Tokyo for three years.','我已经在东京住了三年。')
) x(grammar_id,sentence,translation_zh)
where not exists(select 1 from public.grammar_examples e where e.grammar_id=x.grammar_id::uuid and e.sentence=x.sentence);

insert into public.articles(id,language_code,title,content,translation_zh,level,estimated_minutes,source_type) values('20000000-0000-4000-8000-000000000001','ja','小さな喫茶店、大きな幸せ','東京の静かな通りに、小さな喫茶店があります。窓から朝の光が入り、コーヒーの香りが店の中に広がります。

忙しい毎日でも、ここでは時間に余裕を持つことができます。本を読んだり、風景を眺めたり。何もしない時間も、大切なのです。

幸せは、特別な出来事だけにあるわけではありません。日々の暮らしの中にある、小さな瞬間。それに気づく習慣を続けることが、大きな幸せにつながります。','在东京安静的街道上，有一家小小的咖啡馆。晨光从窗户照进来，咖啡的香气弥漫在店内。

即使每天都很忙，在这里也可以从容地度过时间。读读书，看看风景。什么都不做的时间也很重要。

幸福并非只存在于特别的事情中。它也存在于日常生活中的细小瞬间。坚持留意这些瞬间，会带来很大的幸福。','N3',4,'lesson') on conflict(id) do nothing;
insert into public.listening_episodes(id,language_code,title,level,transcript) values('30000000-0000-4000-8000-000000000001','ja','A coffee in Tokyo','N3','[{"text":"いらっしゃいませ。ご注文はお決まりですか？","translation":"欢迎光临。您想好点什么了吗？"},{"text":"はい、ホットコーヒーを一つお願いします。","translation":"是的，请给我一杯热咖啡。"},{"text":"サイズはいかがなさいますか？","translation":"您要什么大小的？"},{"text":"普通のサイズでお願いします。","translation":"请给我普通大小的。"},{"text":"かしこまりました。少々お待ちください。","translation":"好的，请稍等。"}]'::jsonb) on conflict(id) do nothing;

insert into public.articles(id,language_code,title,content,translation_zh,level,estimated_minutes,source_type) values('20000000-0000-4000-8000-000000000002','en','The art of slowing down','On a quiet street in Tokyo, there is a small café. Morning light falls through its windows, and the smell of fresh coffee fills the room. Finding it felt like serendipity.

In a world that celebrates speed, slowing down can be an intentional choice. Take your time. Read a book. Watch the light change. Be mindful of the moments that might otherwise pass unnoticed.

Happiness does not always arrive as a grand event. Sometimes, it is a warm cup of coffee and a new perspective. Embrace these subtle moments, and let your curiosity guide you.','在东京一条安静的街道上，有一家小咖啡馆。晨光穿过窗户，新鲜咖啡的香气弥漫在房间里。发现它就像一场美好的巧合。

在一个崇尚速度的世界中，慢下来可以是有意识的选择。慢慢来，读一本书，看光线变化，留心那些原本可能被忽略的瞬间。

幸福不总以盛大事件的形式出现。有时，它是一杯温热的咖啡与一个新视角。拥抱这些微妙的瞬间，让好奇心引领你。','B2',4,'lesson') on conflict(id) do nothing;
insert into public.listening_episodes(id,language_code,title,level,transcript) values('30000000-0000-4000-8000-000000000002','en','A coffee in Tokyo','B2','[{"text":"Good morning! What can I get for you?","translation":"早上好！您想点什么？"},{"text":"Could I have a hot coffee, please?","translation":"请给我一杯热咖啡，好吗？"},{"text":"Of course. What size would you like?","translation":"当然。您想要多大杯的？"},{"text":"A regular size would be great, thank you.","translation":"普通大小就好，谢谢。"},{"text":"Would you like anything else?","translation":"您还需要别的吗？"}]'::jsonb) on conflict(id) do nothing;
$migration_004$;
 expected_tables text[]:=array['ai_conversations','ai_messages','ai_usage','articles','backups','client_id_map','courses','daily_plans','downloads','grammar','grammar_examples','grammar_relations','languages','legacy_ai_conversations','legacy_grammar','legacy_profiles','legacy_reviews','legacy_study_sessions','legacy_vocabulary','lessons','listening_episodes','listening_progress','mistakes','personal_notes','profiles','reading_progress','review_items','review_logs','saved_sentences','sentence_grammar','sentence_vocabulary','speaking_sessions','study_sessions','sync_batches','user_grammar_progress','user_languages','user_progress','users','vocabulary','vocabulary_collocations','vocabulary_examples'];
 content_tables text[]:=array['grammar','grammar_relations','grammar_examples','articles','listening_episodes'];
 row_deltas jsonb:='{"grammar":3,"grammar_relations":1,"grammar_examples":2,"articles":2,"listening_episodes":2}'::jsonb;
 helper_before jsonb;event_before jsonb;protected_before jsonb;policies_before jsonb;
 data_before jsonb:='{}'::jsonb;content_before jsonb:='{}'::jsonb;
 fingerprint jsonb;t text;row_count bigint;
begin
 perform pg_advisory_xact_lock(hashtext('kotoba-dashboard-migrations'));
 if current_user<>'postgres' then raise exception 'Use postgres in SQL Editor';end if;
 if to_regclass('supabase_migrations.schema_migrations') is null then raise exception 'Missing migration ledger';end if;
 if (select array_agg(version order by version) from supabase_migrations.schema_migrations) is distinct from array['001','002','003']
  or not exists(select 1 from supabase_migrations.schema_migrations where version='003' and name='sync_and_srs') then
  raise exception 'Expected only verified migrations 001, 002 and 003';end if;
 if (select array_agg(c.relname::text order by c.relname::text) from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind in ('r','p')) is distinct from expected_tables then
  raise exception 'Public table inventory differs from verified 003';end if;
 if to_regprocedure('public.claim_ai_request(uuid)') is not null then raise exception '004 RPC already exists; do not overwrite or repeat';end if;
 if (select count(*) from private.app_owner)<>1 or not exists(select 1 from private.app_owner where email='yzh72339@gmail.com') then
  raise exception 'Private owner email differs from server configuration';end if;
 lock table auth.users in share row exclusive mode;
 lock table public.ai_conversations,public.ai_messages,public.ai_usage,public.articles,public.backups,public.client_id_map,public.courses,public.daily_plans,public.downloads,public.grammar,public.grammar_examples,public.grammar_relations,public.languages,public.legacy_ai_conversations,public.legacy_grammar,public.legacy_profiles,public.legacy_reviews,public.legacy_study_sessions,public.legacy_vocabulary,public.lessons,public.listening_episodes,public.listening_progress,public.mistakes,public.personal_notes,public.profiles,public.reading_progress,public.review_items,public.review_logs,public.saved_sentences,public.sentence_grammar,public.sentence_vocabulary,public.speaking_sessions,public.study_sessions,public.sync_batches,public.user_grammar_progress,public.user_languages,public.user_progress,public.users,public.vocabulary,public.vocabulary_collocations,public.vocabulary_examples,private.app_owner in share row exclusive mode;
 if exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  where ((n.nspname='public' and c.relkind in ('r','p')) or c.oid='private.app_owner'::regclass) and not c.relrowsecurity)
  or exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
   cross join (values('anon'),('authenticated')) r(role_name)
   cross join (values('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) v(privilege)
   where ((n.nspname='public' and c.relkind in ('r','p')) or c.oid='private.app_owner'::regclass) and has_table_privilege(r.role_name,c.oid,v.privilege)) then
  raise exception 'Checkpoint 003 RLS or closed table privileges have changed';end if;
 if has_schema_privilege('anon','private','USAGE') or has_schema_privilege('authenticated','private','USAGE') then
  raise exception 'Private schema is accessible to a browser role';end if;
 if (select count(*) from storage.buckets where id in ('personal-audio','personal-backups','personal-content') and not public)<>3 then
  raise exception 'Managed Storage buckets must be private';end if;
 select to_jsonb(p) into helper_before from pg_catalog.pg_proc p where p.oid=to_regprocedure('public.rls_auto_enable()');
 select to_jsonb(e) into event_before from pg_catalog.pg_event_trigger e where e.evtname='ensure_rls';
 if helper_before is null or event_before is null
  or md5(helper_before::text) is distinct from (select substring(statements[2] from 'helper_catalog_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations where version='003')
  or md5(event_before::text) is distinct from (select substring(statements[2] from 'ensure_rls_catalog_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations where version='003') then
  raise exception 'Existing RLS helper differs from verified 003';end if;
 if md5((select jsonb_agg(to_jsonb(p) order by p.oid) from pg_catalog.pg_proc p where p.oid in (select to_regprocedure(s) from unnest(array['public.create_user_profile()','public.configure_private_owner(text)','public.is_private_owner()','public.consume_ai_request(uuid)','private.guard_owner_signup()','private.touch_updated_at()']) s))::text) is distinct from (select substring(statements[4] from 'protected_functions_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations where version='003')
  or md5((select jsonb_agg(to_jsonb(p) order by p.oid) from pg_catalog.pg_proc p where p.oid in (select to_regprocedure(s) from unnest(array['public.record_review(uuid,uuid,text,timestamptz,integer)','public.sync_personal_state(bigint,text,jsonb)','public.personal_progress(text)','private.resolve_id(uuid,text,text)','private.validate_review_target()','private.create_review_item()','private.create_grammar_review()','private.project_state(uuid,jsonb)']) s))::text) is distinct from (select substring(statements[4] from 'installed_functions_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations where version='003')
  or md5((select jsonb_agg(to_jsonb(p) order by p.schemaname,p.tablename,p.policyname) from pg_catalog.pg_policies p where (p.schemaname='public' and p.tablename<>'ai_requests') or (p.schemaname='storage' and p.tablename='objects'))::text) is distinct from (select substring(statements[4] from 'policies_catalog_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations where version='003') then
  raise exception 'Auth, SRS/sync functions or policies differ from verified 003';end if;
 if not exists(select 1 from pg_catalog.pg_trigger where tgrelid='auth.users'::regclass and tgname='on_auth_user_created'
  and tgfoid=to_regprocedure('public.create_user_profile()') and tgtype=5 and tgenabled='O')
  or not exists(select 1 from pg_catalog.pg_trigger where tgrelid='auth.users'::regclass and tgname='allow_private_owner_only'
   and tgfoid=to_regprocedure('private.guard_owner_signup()') and tgtype=7 and tgenabled='O') then
  raise exception 'Auth triggers differ from verified 003';end if;
 -- Never overwrite a personalized row or silently accept a conflicting stable ID.
 if exists(select 1 from public.grammar where id::text=any(array['10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003']))
  or exists(select 1 from public.articles where id::text=any(array['20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002']))
  or exists(select 1 from public.listening_episodes where id::text=any(array['30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002']))
  or exists(select 1 from public.grammar where (language_code,title) in (('ja','〜わけではない'),('ja','〜とは限らない'),('en','The present perfect'))) then
  raise exception 'Starter content identity already exists; stop and inspect before deploying';end if;
 select (select jsonb_agg(to_jsonb(p) order by p.oid) from pg_catalog.pg_proc p where p.oid in (select to_regprocedure(s) from unnest(array['public.create_user_profile()','public.configure_private_owner(text)','public.is_private_owner()','public.consume_ai_request(uuid)','private.guard_owner_signup()','private.touch_updated_at()','public.record_review(uuid,uuid,text,timestamptz,integer)','public.sync_personal_state(bigint,text,jsonb)','public.personal_progress(text)','private.resolve_id(uuid,text,text)','private.validate_review_target()','private.create_review_item()','private.create_grammar_review()','private.project_state(uuid,jsonb)']) s)) into protected_before;
 select (select jsonb_agg(to_jsonb(p) order by p.schemaname,p.tablename,p.policyname) from pg_catalog.pg_policies p where (p.schemaname='public' and p.tablename<>'ai_requests') or (p.schemaname='storage' and p.tablename='objects')) into policies_before;
 foreach t in array expected_tables loop
  execute format('select count(*) from public.%I',t) into row_count;
  data_before:=data_before||jsonb_build_object(t,jsonb_build_object('oid',to_regclass(format('public.%I',t))::oid,'rows',row_count));
 end loop;
 foreach t in array content_tables loop
  execute format('select coalesce(jsonb_object_agg(id::text,md5(to_jsonb(x)::text)),''{}''::jsonb) from public.%I x',t) into fingerprint;
  content_before:=content_before||jsonb_build_object(t,fingerprint);
 end loop;

 execute migration_sql;

 foreach t in array expected_tables loop
  execute format('select count(*) from public.%I',t) into row_count;
  if (data_before->t->>'oid')::oid is distinct from to_regclass(format('public.%I',t))::oid
   or row_count<>(data_before->t->>'rows')::bigint+coalesce((row_deltas->>t)::int,0) then
   raise exception 'Unexpected table identity or row-count change in %; rollback',t;end if;
 end loop;
 foreach t in array content_tables loop
  execute format('select coalesce(jsonb_object_agg(id::text,md5(to_jsonb(x)::text)),''{}''::jsonb) from public.%I x where $1 ? id::text',t)
   into fingerprint using content_before->t;
  if fingerprint is distinct from content_before->t then raise exception 'Existing content changed in %; rollback',t;end if;
 end loop;
 if (select count(*) from public.ai_requests)<>0 then raise exception 'Unexpected AI request execution during deployment';end if;
 if not (select relrowsecurity from pg_catalog.pg_class where oid='public.ai_requests'::regclass)
  or exists(select 1 from (values('anon'),('authenticated')) r(role_name)
   cross join (values('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) v(privilege)
   where has_table_privilege(r.role_name,'public.ai_requests',v.privilege)) then
  raise exception 'New AI table RLS or closed privileges are invalid; rollback';end if;
 if has_function_privilege('anon','public.claim_ai_request(uuid)','EXECUTE')
  or not has_function_privilege('authenticated','public.claim_ai_request(uuid)','EXECUTE') then
  raise exception 'New AI RPC browser permissions are invalid; rollback';end if;
 if protected_before is distinct from (select jsonb_agg(to_jsonb(p) order by p.oid) from pg_catalog.pg_proc p where p.oid in (select to_regprocedure(s) from unnest(array['public.create_user_profile()','public.configure_private_owner(text)','public.is_private_owner()','public.consume_ai_request(uuid)','private.guard_owner_signup()','private.touch_updated_at()','public.record_review(uuid,uuid,text,timestamptz,integer)','public.sync_personal_state(bigint,text,jsonb)','public.personal_progress(text)','private.resolve_id(uuid,text,text)','private.validate_review_target()','private.create_review_item()','private.create_grammar_review()','private.project_state(uuid,jsonb)']) s)) or policies_before is distinct from (select jsonb_agg(to_jsonb(p) order by p.schemaname,p.tablename,p.policyname) from pg_catalog.pg_policies p where (p.schemaname='public' and p.tablename<>'ai_requests') or (p.schemaname='storage' and p.tablename='objects')) then
  raise exception 'Existing functions or RLS policies changed; rollback';end if;
 if helper_before is distinct from (select to_jsonb(p) from pg_catalog.pg_proc p where p.oid=to_regprocedure('public.rls_auto_enable()'))
  or event_before is distinct from (select to_jsonb(e) from pg_catalog.pg_event_trigger e where e.evtname='ensure_rls') then
  raise exception 'Existing RLS helper changed; rollback';end if;
 insert into supabase_migrations.schema_migrations(version,name,statements) values('004','ai_requests_and_content',array[
  migration_sql,
  format(E'-- helper_catalog_md5=%s; ensure_rls_catalog_md5=%s\n',md5(helper_before::text),md5(event_before::text)),
  jsonb_build_object('tables',data_before,'content',content_before,'deltas',row_deltas)::text,
  jsonb_build_object('policies',md5(policies_before::text),'protected_functions',md5(protected_before::text),
   'claim_function',md5((select to_jsonb(p) from pg_catalog.pg_proc p where p.oid=to_regprocedure('public.claim_ai_request(uuid)'))::text),'claim_policy',md5((select jsonb_agg(to_jsonb(p) order by p.policyname) from pg_catalog.pg_policies p where p.schemaname='public' and p.tablename='ai_requests')::text),'starter_content',md5((select jsonb_agg(jsonb_build_object('table',q.t,'data',q.data) order by q.t,q.id) from (select 'grammar' as t,id::text as id,to_jsonb(x) as data from public.grammar x where id::text=any(array['10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003'])
 union all select 'articles' as t,id::text as id,to_jsonb(x) as data from public.articles x where id::text=any(array['20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002'])
 union all select 'listening_episodes' as t,id::text as id,to_jsonb(x) as data from public.listening_episodes x where id::text=any(array['30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002'])) q)::text))::text
 ]);
end;
$deploy_004$;
commit;
select version,name from supabase_migrations.schema_migrations order by version;
