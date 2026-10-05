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
