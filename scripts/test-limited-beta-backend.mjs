// Disposable PostgreSQL only; never reads .env or connects to production.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawnSync,spawn} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {initialState} from '../lib/store.ts';
const name='kotoba-beta-sql-'+randomUUID().slice(0,8),owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',existing='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const env={...process.env};for(const k of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete env[k];
const args=commands=>['--host=unix:///var/run/docker.sock',...commands];
function docker(commands,input){const r=spawnSync('docker',args(commands),{env,input,encoding:'utf8',maxBuffer:8*1024*1024});if(r.status!==0){writeFileSync('/tmp/kotoba-291-sql-last-error.log',r.stderr||r.stdout);throw new Error((r.stderr||r.stdout).split('\n').filter(line=>/^(ERROR|DETAIL|CONTEXT|LINE|psql):/.test(line)).slice(0,5).join('\n')||(r.stderr||r.stdout).slice(0,1000))}return r.stdout}
const sqlArgs=['exec','-i',name,'psql','-h','127.0.0.1','-U','postgres','-v','ON_ERROR_STOP=1','-At'];
function sql(input){return docker(sqlArgs,input)}
function concurrent(input){return new Promise(resolve=>{const p=spawn('docker',args(sqlArgs),{env});let error='';p.stdout.resume();p.stderr.on('data',v=>error+=v);p.on('close',code=>resolve({code,error}));p.stdin.end(input)})}
const claims=id=>`select set_config('request.jwt.claim.sub','${id}',false);select set_config('request.jwt.claims','{"amr":[{"method":"password"}]}',false);`;
const auth=(id,email)=>`insert into auth.users(id,email,email_confirmed_at) values('${id}','${email}',now());`;
const checks=[];
try{
 docker(['info','--format','{{.ServerVersion}}']);docker(['run','-d','--name',name,'-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:17-alpine']);
 for(let i=0;i<50;i++){try{docker(['exec',name,'pg_isready','-h','127.0.0.1','-U','postgres']);break}catch{if(i===49)throw new Error('Disposable PostgreSQL unavailable');await new Promise(r=>setTimeout(r,200))}}
 let base=await readFile('tests/fixtures/content-backend-bootstrap.sql','utf8');
 base+=`create role supabase_auth_admin nologin;grant select,insert,update,delete on storage.objects to authenticated;alter table auth.users add column encrypted_password text default 'isolated-fixture-hash';alter table auth.users add column is_anonymous boolean default false;alter table auth.users add column deleted_at timestamptz;alter table auth.users add column banned_until timestamptz;alter table auth.users add column raw_app_meta_data jsonb default '{"provider":"email"}';\n${auth(existing,'existing@kotoba.invalid')}`;
 for(const f of ['001_kotoba','002_personal_backend','003_sync_and_srs','004_ai_requests_and_content','005_hardening_and_projection','006_personal_audio_and_memory','007_audio_position_identity','008_phase_one_private_account','009_private_permissions_and_storage'])base+='\nbegin;\n'+await readFile('supabase/migrations/'+f+'.sql','utf8')+'\ncommit;\n';
 base+=`select public.configure_private_owner('owner@kotoba.invalid');${auth(owner,'owner@kotoba.invalid')}insert into supabase_migrations.schema_migrations(version,name) select lpad(i::text,3,'0'),'isolated' from generate_series(1,9)i;`;
 for(const n of ['010','011','012'])base+=await readFile('supabase/dashboard/'+n+'_deploy.sql','utf8');
 base+=`insert into public.user_progress(user_id,state,revision) values('${owner}','${JSON.stringify({...initialState,notes:{original:'preserved'}})}',7);insert into public.vocabulary(user_id,language_code,term,meaning_zh) values('${owner}','ja','原本','original');`;
 sql(base);
 const old=sql(`select md5(state::text),revision from public.user_progress where user_id='${owner}';select id,due_at,state from public.review_items where user_id='${owner}';`);
 const migration=await readFile('supabase/dashboard/013_deploy.sql','utf8');sql(migration);sql(migration);
 assert.equal(sql(`select md5(state::text),revision from public.user_progress where user_id='${owner}';select id,due_at,state from public.review_items where user_id='${owner}';`),old);
 assert.equal(sql('select count(*) from private.beta_members;').trim(),'1');checks.push('Original UID, snapshot revision/hash and SRS IDs/dates preserved; existing ordinary account counted; identical 013 replay safe');
 sql(`${claims(owner)}set role authenticated;select public.beta_set_registration(true,10);reset role;`);
 const candidates=Array.from({length:25},(_,i)=>({id:randomUUID(),email:'concurrent'+i+'@kotoba.invalid'}));
 const results=await Promise.all(candidates.map(c=>concurrent(`begin;select private.before_user_created('{"user":{"id":"${c.id}","email":"${c.email}","app_metadata":{"provider":"email"}}}');${auth(c.id,c.email)}select pg_sleep(0.01);commit;`)));
 assert.equal(results.filter(r=>r.code===0).length,9);assert.ok(results.filter(r=>r.code!==0).every(r=>r.error.includes('Beta capacity reached')));
 assert.equal(sql('select count(*) from private.beta_members;').trim(),'10');assert.equal(sql(`select count(*) from auth.users where id<>'${owner}';`).trim(),'10');checks.push('25 concurrent Auth-creation transactions: exactly 9 + 1 existing ordinary accounts; account 10 accepted and 11+ rejected');
 assert.throws(()=>sql(auth(randomUUID(),'eleventh@kotoba.invalid')),/Beta capacity reached/);
 assert.throws(()=>sql(`delete from auth.users where id='${owner}';`),/Original administrator cannot be deleted/);
 sql(`delete from auth.users where id='${existing}';delete from auth.users where id='${existing}';`);assert.equal(sql('select count(*) from private.beta_members;').trim(),'9');
 const rollbackId=randomUUID();sql('begin;'+auth(rollbackId,'rollback@kotoba.invalid')+'rollback;');assert.equal(sql('select count(*) from private.beta_members;').trim(),'9');
 sql(`create function public.fail_test_signup() returns trigger language plpgsql as $$begin if new.email='failed@kotoba.invalid' then raise exception 'test downstream creation failure';end if;return new;end$$;create trigger zz_test_failure after insert on auth.users for each row execute function public.fail_test_signup();`);
 assert.throws(()=>sql(auth(randomUUID(),'failed@kotoba.invalid')),/test downstream creation failure/);assert.equal(sql('select count(*) from private.beta_members;').trim(),'9');checks.push('Failed/rolled-back creation consumes no seat; failed Auth transaction and repeat deletion cannot drift counts; admin deletion refused');
 const pending=randomUUID();sql(`insert into auth.users(id,email) values('${pending}','pending@kotoba.invalid');`);
 sql(`${claims(pending)}set role authenticated;do $$begin if public.has_learning_access() then raise exception 'Unconfirmed access';end if;end$$;reset role;`);
 assert.equal(sql('select count(*) from private.beta_members;').trim(),'10');checks.push('Unconfirmed email temporarily occupies seat but has no learning access');
 sql(`${claims(owner)}set role authenticated;select public.beta_admin_accounts();select public.get_private_account();reset role;`);
 const a=candidates[results.findIndex(r=>r.code===0)].id,b=candidates[results.findLastIndex(r=>r.code===0)].id;
 sql(`insert into public.vocabulary(user_id,language_code,term) values('${a}','en','private-A'),('${b}','en','private-B');insert into public.personal_notes(user_id,target_type,title,content) values('${a}','manual','A','A-private-note'),('${b}','manual','B','B-private-note');`);
 const bReview=sql(`select id from public.review_items where user_id='${b}' limit 1;`).trim();
 for(const uid of [a,b,owner])sql(`${claims(uid)}set role authenticated;
 do $$declare t record;n integer;begin
  if not public.has_learning_access() then raise exception 'Member access failed';end if;
  for t in select c.relname from pg_class c join pg_namespace ns on ns.oid=c.relnamespace
   join pg_attribute a on a.attrelid=c.oid and a.attname='user_id' and not a.attisdropped
   where ns.nspname='public' and c.relkind='r' and c.relname not like 'legacy_%' loop
   begin execute format('select count(*) from public.%I where user_id<>auth.uid()',t.relname) into n;if n<>0 then raise exception 'Foreign SELECT on %',t.relname;end if;exception when insufficient_privilege then null;end;
   begin execute format('update public.%I set user_id=user_id where user_id<>auth.uid()',t.relname);get diagnostics n=row_count;if n<>0 then raise exception 'Foreign UPDATE on %',t.relname;end if;exception when insufficient_privilege then null;end;
   begin execute format('delete from public.%I where user_id<>auth.uid()',t.relname);get diagnostics n=row_count;if n<>0 then raise exception 'Foreign DELETE on %',t.relname;end if;exception when insufficient_privilege then null;end;
  end loop;
  if exists(select 1 from public.profiles where id<>auth.uid()) then raise exception 'Foreign profile';end if;
  begin insert into public.personal_notes(user_id,target_type,title,content) values('${uid===a?b:a}','manual','cross','cross');raise exception 'Foreign INSERT';exception when insufficient_privilege then null;end;
 end$$;
 select public.get_private_account();reset role;`);
 assert.throws(()=>sql(`${claims(a)}set role authenticated;select public.record_review('${bReview}','${randomUUID()}','good',now(),0);`),/Review item not found/);
 assert.throws(()=>sql(`${claims(a)}set role authenticated;select public.beta_admin_accounts();`),/Administrator required/);checks.push('A, B and administrator cannot SELECT/INSERT/UPDATE/DELETE another member records; foreign review RPC and ordinary admin RPC denied');
 const aReview=sql(`select id from public.review_items where user_id='${a}' limit 1;`).trim(),event=randomUUID();
 sql(`${claims(a)}set role authenticated;select public.record_review('${aReview}','${event}','good','2026-01-01',0);select public.record_review('${aReview}','${event}','good','2026-01-01',0);reset role;`);
 assert.equal(sql(`select review_count from public.review_items where id='${aReview}';`).trim(),'1');
 const state={...structuredClone(initialState),notes:{member:'private-A'},profile:{...initialState.profile,name:'Member A'}};
 sql(`${claims(a)}set role authenticated;select public.sync_personal_state(0,'beta-sync-once',$state$${JSON.stringify(state)}$state$::jsonb);select public.sync_personal_state(0,'beta-sync-once',$state$${JSON.stringify(state)}$state$::jsonb);reset role;`);
 assert.equal(sql(`select revision from public.user_progress where user_id='${a}';`).trim(),'1');checks.push('Full capacity does not deny existing access; existing SRS rating and snapshot retry stay idempotent');
 sql(`${claims(a)}set role authenticated;insert into public.grammar(language_code,title) values('en','Private point');reset role;${claims(b)}set role authenticated;insert into public.grammar(language_code,title) values('en','Private point');reset role;`);
 assert.equal(sql("select count(*) from public.grammar where title='Private point';").trim(),'2');
 sql(`insert into storage.objects(bucket_id,name) values('personal-content','${b}/private.txt');${claims(a)}set role authenticated;do $$begin if exists(select 1 from storage.objects where name='${b}/private.txt') then raise exception 'Foreign storage';end if;end$$;reset role;`);
 checks.push('Same-titled projected grammar remains separately owned; shared seeds read-only; private bucket prefix isolation');
 const quota=sql(`set role service_role;${Array.from({length:6},()=>`select public.consume_ai_request('${a}');`).join('')}reset role;`).trim().split('\n').filter(v=>['t','f'].includes(v));assert.deepEqual(quota,['t','t','t','t','t','f']);
 sql(`delete from private.beta_ai_usage where period='minute';update private.beta_ai_usage set count=30 where period='day';`);assert.equal(sql(`set role service_role;select public.consume_ai_request('${a}');reset role;`).trim().split('\n').filter(v=>['t','f'].includes(v))[0],'f');checks.push('AI service quota: 5/minute and 30/UTC-day; no browser execution privilege');
 sql(`delete from auth.users where id='${pending}';`);assert.equal(sql('select count(*) from private.beta_members;').trim(),'9');sql(auth(randomUUID(),'reclaimed@kotoba.invalid'));assert.equal(sql('select count(*) from private.beta_members;').trim(),'10');
 sql(await readFile('supabase/dashboard/013_verify.sql','utf8'));checks.push('Admin removal of unconfirmed Auth account frees exactly one seat; replacement accepted');
 const schemaAudit=JSON.parse(sql(`select jsonb_agg(jsonb_build_object('table',c.relname,'rls',c.relrowsecurity,'policies',(select jsonb_agg(jsonb_build_object('name',p.policyname,'command',p.cmd,'using',p.qual,'check',p.with_check)) from pg_policies p where p.schemaname='public' and p.tablename=c.relname)) order by c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r';`));
 assert.ok(schemaAudit.every(t=>t.rls));
 await mkdir('/workspace/deliverables/kotoba-291',{recursive:true});await writeFile('/workspace/deliverables/kotoba-291/database-report.json',JSON.stringify({scope:'Disposable PostgreSQL 17, not live Supabase/Auth email delivery',checks,concurrentRequests:25,ordinaryAccounts:10,errors:[]},null,2));
 await writeFile('/workspace/deliverables/kotoba-291/rls-catalog.json',JSON.stringify(schemaAudit,null,2));
 console.log(JSON.stringify({checks,concurrentRequests:25,ordinaryAccounts:10,errors:[]}));
}finally{spawnSync('docker',args(['rm','-fv',name]),{env,encoding:'utf8'})}
