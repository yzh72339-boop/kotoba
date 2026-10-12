// Disposable local PostgreSQL only. Never executes SQL against production Supabase.
import {readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {initialState} from '../lib/store.ts';
import {prepareMaterial,putMaterial} from '../lib/personal-materials.ts';
import {createContextCard,saveContextCard,editContextCard} from '../lib/personal-context.ts';
import {captureWord} from '../lib/learning-memory.ts';
const container='kotoba-context-'+randomUUID().slice(0,8),env={...process.env};
for(const k of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete env[k];
function docker(args,input){const r=spawnSync('docker',['--host=unix:///var/run/docker.sock',...args],{env,input,encoding:'utf8',maxBuffer:4*1024*1024});if(r.status!==0)throw new Error((r.stderr||r.stdout).slice(-4500));return r.stdout}
const p=await prepareMaterial({title:'Original context',language:'en',level:null,source:'Local test',text:'😀 A walk beside the bank.\n\nThe bank opens at nine.'});let state=putMaterial(structuredClone(initialState),p);const now=Date.now()-10000;
const cards=p.snapshot.paragraphs.map((paragraph,i)=>createContextCard(p.material,p.snapshot,{expression:'bank',meaning:i?'银行':'河岸',sentence:p.snapshot.text.slice(paragraph.start,paragraph.end),translation:'',kind:'word',mode:'context',paragraphId:paragraph.id},now));for(const card of cards)state=saveContextCard(state,card);const legacy=captureWord('bank','en','Fixture','银行');state.dictionary[legacy.id]=legacy;state.profile.language='en';state.reviewHistory=[{id:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',cardId:cards[0].id,language:'en',rating:'Again',at:now}];
const paused=editContextCard(state,cards[0].id,{paused:true}),restored=editContextCard(paused,cards[0].id,{paused:false});
const payload=s=>'$payload$'+JSON.stringify(s)+'$payload$::jsonb';
const sql=`
set role authenticated;
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
select set_config('request.jwt.claims','{"email":"owner@kotoba.test"}',false);
select public.personal_context_ready();
select public.sync_personal_state(0,'context-first',${payload(state)});
select public.sync_personal_state(0,'context-first',${payload(state)});
select public.sync_personal_state(1,'context-second',${payload(state)});
do $$begin
 if (select count(*) from public.personal_context_cards)<>2 then raise exception 'Homonyms merged';end if;
 if (select count(*) from public.review_items where item_type='context')<>2 then raise exception 'Missing unified SRS items';end if;
 if (select count(*) from public.review_logs)<>1 then raise exception 'Duplicate review';end if;
 if (select state from public.review_items where item_type='context' and review_count=1)<>'relearning' then raise exception 'Scheduler changed';end if;
 if (select count(*) from public.vocabulary where term='bank')<>1 then raise exception 'Legacy word uniqueness changed';end if;
end $$;
select public.sync_personal_state(2,'context-pause',${payload(paused)});
do $$begin if (select state from public.review_items where item_type='context' and review_count=1)<>'suspended' then raise exception 'Pause failed';end if;end $$;
select public.sync_personal_state(3,'context-restore',${payload(restored)});
do $$begin if (select state from public.review_items where item_type='context' and review_count=1)<>'relearning' then raise exception 'Resume lost prior state';end if;end $$;
reset role;
-- The existing server upsert still relies on the original uniqueness constraint.
insert into public.vocabulary(user_id,language_code,term,meaning_zh) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','en','bank','银行') on conflict(user_id,language_code,term) do update set meaning_zh=excluded.meaning_zh;
set role authenticated;
select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',false);
select set_config('request.jwt.claims','{"email":"other@kotoba.test"}',false);
do $$declare c integer;begin
 if exists(select 1 from public.personal_context_cards) then raise exception 'Foreign cards visible';end if;
 update public.personal_context_cards set expression='bad';get diagnostics c=row_count;if c<>0 then raise exception 'Foreign update';end if;
 delete from public.personal_context_cards;get diagnostics c=row_count;if c<>0 then raise exception 'Foreign delete';end if;
 begin perform public.personal_context_ready();raise exception 'Foreign owner accepted';exception when insufficient_privilege then null;end;
 begin insert into public.personal_context_cards(user_id,client_id,language_code,expression,meaning_zh,source_sentence,material_id,snapshot_id,paragraph_id,source_title,content_version,card_kind,recall_mode) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','context-card-en-00000000000000000000000000000000','en','bank','x','bank','x','x','x','x',1,'word','context');raise exception 'Foreign insert';exception when insufficient_privilege then null;end;
end $$;
reset role;
set role anon;
do $$begin begin perform count(*) from public.personal_context_cards;raise exception 'Anonymous access';exception when insufficient_privilege then null;end;end $$;
reset role;
select 'Context local SQL/RLS/SRS/idempotency PASS';
`;
try{
 docker(['info','--format','{{.ServerVersion}}']);docker(['run','-d','--name',container,'-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:17-alpine']);let ready=false;for(let i=0;i<30;i++){try{docker(['exec',container,'pg_isready','-h','127.0.0.1','-U','postgres']);ready=true;break}catch{await new Promise(r=>setTimeout(r,300))}}if(!ready)throw new Error('PostgreSQL not ready');
 let baseline=await readFile('tests/fixtures/content-backend-bootstrap.sql','utf8');baseline+="\ninsert into auth.users(id,email,email_confirmed_at) values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','other@kotoba.test',now());\n";
 for(const name of ['001_kotoba','002_personal_backend','003_sync_and_srs','004_ai_requests_and_content','005_hardening_and_projection','006_personal_audio_and_memory','007_audio_position_identity','008_phase_one_private_account','009_private_permissions_and_storage'])baseline+='\nbegin;\n'+await readFile('supabase/migrations/'+name+'.sql','utf8')+'\ncommit;\n';
 baseline+="\nselect public.configure_private_owner('owner@kotoba.test');\ninsert into auth.users(id,email,email_confirmed_at) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','owner@kotoba.test',now());\ninsert into supabase_migrations.schema_migrations(version,name) select lpad(i::text,3,'0'),'fixture' from generate_series(1,9)i;\n";
 for(const number of ['010','011'])baseline+='\n'+await readFile('supabase/dashboard/'+number+'_deploy.sql','utf8');
 const migration=await readFile('supabase/dashboard/012_deploy.sql','utf8'),verify=await readFile('supabase/dashboard/012_verify.sql','utf8');
 docker(['exec','-i',container,'psql','-h','127.0.0.1','-U','postgres','-v','ON_ERROR_STOP=1'],baseline+'\n'+migration+'\n'+migration+'\n'+verify+sql);
 await writeFile('docs/PERSONAL-CONTEXT-BACKEND-TEST.md','# Personal context backend\n\nDisposable PostgreSQL 17: PASS. No production connection.\n\n- Existing 001–011 fixture followed by additive 012.\n- Two bank senses remain separate; unchanged vocabulary upsert constraint.\n- UTF-16 paragraph offsets with emoji accepted correctly.\n- Duplicate sync and review replay produce one event.\n- Existing record_review scheduler retains relearning across pause/resume.\n- Private card SELECT/INSERT/UPDATE/DELETE fences and anonymous rejection.\n- Real Supabase migration and owner/second-device verification: NOT VERIFIED.\n');console.log('Personal context: isolated PostgreSQL migration / RLS / unified SRS / retry PASS. Production not accessed.');
}finally{spawnSync('docker',['--host=unix:///var/run/docker.sock','rm','-fv',container],{env,encoding:'utf8'})}
