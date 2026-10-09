import {readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {loadDocuments} from '../scripts/content-files.mjs';
import {initialState} from '../lib/store.ts';
import {learnGrammar} from '../lib/content-library/learning.ts';
import {grammarDraft,saveGrammarDraft,readingDraft,saveReadingDraft} from '../lib/content-library/practice-state.ts';
import {beginCourseSession,switchLearningScope} from '../lib/content-library/daily-course-plan.ts';
import {pinSessionCourse} from '../lib/content-library/session-course.ts';
import {contentEntry} from '../lib/content-library/schema.ts';
import {captureWord} from '../lib/learning-memory.ts';
import {collectReadingWord,collectReadingSentence,confirmReadingQuestion,readingSources} from '../lib/content-library/reading-collection.ts';
import {saveReviewRun,applyCardRating} from '../lib/review-session.ts';
const docs=await loadDocuments();let state=structuredClone(initialState);const now=Date.now()-5000;
const gs=docs.filter(d=>d.kind==='grammar'&&d.level==='N2').slice(0,2),articles=docs.filter(d=>d.kind==='reading').slice(0,2);
for(const g of gs)state=learnGrammar(state,g,now);
state.reviewHistory=gs.map((g,i)=>({id:`cccccccc-cccc-4ccc-8ccc-ccccccccccc${i}`,language:'ja',cardId:g.id,rating:'Good',at:now}));
state.readingPositions['article-ja']={progress:33,updatedAt:now};
for(const [i,a] of articles.entries()){state.notes[`library-reading-meta-${a.id}`]=JSON.stringify({id:a.id,language:a.language,title:a.title,level:a.level,content:a.paragraphs.join('\n\n'),translation:a.translation.join('\n\n'),minutes:a.estimatedMinutes});state.readingPositions[a.id]={progress:67+i,updatedAt:now};}
state.profile.timezone='Asia/Shanghai';state.notes['app-theme-preference']='system';const word=captureWord('余裕','ja','Fixture','充裕');state.dictionary[word.id]=word;
state.activeSession={language:'ja',step:1,startedAt:now,baseline:0,completed:['Review'],done:false};state=pinSessionCourse(state,contentEntry(gs[0]));
state=saveGrammarDraft(state,gs[0],{...grammarDraft(state,gs[0]),section:'practice',answers:{[gs[0].exercises[0].id]:gs[0].exercises[0].acceptedAnswers[0]},checked:{[gs[0].exercises[0].id]:true},accepted:{[gs[0].exercises[0].id]:true}});
state=saveReadingDraft(state,articles[0],{...readingDraft(state,articles[0]),attemptId:'mobile-test-attempt',startedAt:now,activeSeconds:20,answers:{[articles[0].questions[0].id]:0}});
state.notes[`library-reading-anchor-${articles[0].id}`]=JSON.stringify({index:1,within:.5});
const collectedArticle=docs.find(d=>d.id==='article-ja-n5-book-permission');const readingWord=captureWord('友達','ja');const source={articleId:collectedArticle.id,title:collectedArticle.title,sentence:collectedArticle.paragraphs[0],language:'ja'};state=collectReadingWord(state,readingWord,source);state=collectReadingSentence(state,source,collectedArticle.translation[0],collectedArticle.vocabulary);state=saveReviewRun(state,{id:'fixture-review-run',language:'ja',startedAt:now,cardIds:[readingWord.id]},collectedArticle.id);state=applyCardRating(state,readingWord,'Good',{id:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',sessionId:'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',at:now+1000,minutes:.125,review:true,mistake:null});
const sourceKey=Object.keys(state.notes).find(key=>key.startsWith('reading-source-'+readingWord.id+'--'));if(readingSources(state,readingWord.id).length!==1)throw new Error('Missing source fixture');
const question=collectedArticle.questions[0];state=saveReadingDraft(state,collectedArticle,{...readingDraft(state,collectedArticle),attemptId:'corrected-error-fixture',answers:{[question.id]:(question.answer+1)%question.options.length}});state=confirmReadingQuestion(state,collectedArticle,question.id);state=saveReadingDraft(state,collectedArticle,{...readingDraft(state,collectedArticle),answers:{[question.id]:question.answer},checked:{}});state=confirmReadingQuestion(state,collectedArticle,question.id);
const core=beginCourseSession({...state,activeSession:null},docs.map(d=>contentEntry(d)),now+2000);const parked=switchLearningScope(core,'en','B1');state.notes={...state.notes,...parked.notes};
state.sessions.push({id:'grammar-completion-'+gs[0].id,language:'ja',at:now,day:'2026-10-09',type:'Grammar',count:1,minutes:.5});
const payload=JSON.stringify(state);
const sql=`set role authenticated;
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
select set_config('request.jwt.claims','{"email":"owner@kotoba.test"}',false);
select public.content_library_ready();
select public.sync_personal_state(0,'library-fixture-once',$payload$${payload}$payload$::jsonb)->>'applied';
select public.sync_personal_state(0,'library-fixture-once',$payload$${payload}$payload$::jsonb)->>'applied';
reset role;
do $$begin
 if (select count(distinct entity_id) from public.client_id_map where user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and client_id in ('${gs[0].id}','${gs[1].id}'))<>2 then raise exception 'Grammar identities were merged';end if;
 if (select count(*) from public.review_logs where user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')<>3 then raise exception 'Review was duplicated or lost';end if;
 if (select count(distinct article_id) from public.reading_progress where user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')<>3 then raise exception 'Article progress was merged';end if;
 if (select progress from public.reading_progress where user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and article_id='20000000-0000-4000-8000-000000000001')<>33 then raise exception 'Legacy reading progress changed';end if;
 if (select count(*) from public.mistakes where user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')<>1 then raise exception 'Corrected reading error was lost or duplicated';end if;
 if (select revision from public.user_progress where user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')<>1 then raise exception 'Duplicate batch changed revision';end if;
 if (select count(*) from public.study_sessions where user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')<>2 then raise exception 'Partial review study record duplicated or lost';end if;
 if (select duration_seconds from public.study_sessions where user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and activity_type='Review' limit 1)<>8 then raise exception 'Visible study time projection changed';end if;
 if (select state->'notes'->>'${sourceKey}' from public.user_progress where user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') is distinct from $source$${state.notes[sourceKey]}$source$ then raise exception 'Reading context did not persist';end if;
end;$$;
select set_config('kotoba.fixture.vocabulary_id',(select id::text from public.vocabulary where user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' limit 1),false);
set role authenticated;
select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',false);
select set_config('request.jwt.claims','{"email":"other@kotoba.test"}',false);
do $$begin
 if (select count(*) from public.user_progress)<>0 then raise exception 'Foreign progress visible';end if;
 if (select count(*) from public.review_logs)<>0 then raise exception 'Foreign reviews visible';end if;
 begin perform public.content_library_ready();raise exception 'Other account accepted';exception when insufficient_privilege then null;end;
end;$$;
-- Test every actual public table under the non-owner role. Permission denial or
-- zero rows is acceptable; a visible/modified/deleted row is not.
do $$declare t record;c bigint;column_name text;begin
 for t in select tablename from pg_catalog.pg_tables where schemaname='public' loop
  begin execute format('select count(*) from public.%I',t.tablename) into c;if c<>0 then raise exception 'Non-owner read on %',t.tablename;end if;exception when insufficient_privilege then null;end;
  select a.attname into column_name from pg_catalog.pg_attribute a where a.attrelid=format('public.%I',t.tablename)::regclass and a.attnum>0 and not a.attisdropped and a.attgenerated='' and a.attidentity='' order by a.attnum limit 1;
  begin execute format('update public.%I set %I=%I',t.tablename,column_name,column_name);get diagnostics c=row_count;if c<>0 then raise exception 'Non-owner update on %',t.tablename;end if;exception when insufficient_privilege then null;end;
  begin execute format('delete from public.%I',t.tablename);get diagnostics c=row_count;if c<>0 then raise exception 'Non-owner delete on %',t.tablename;end if;exception when insufficient_privilege then null;end;
 end loop;
 begin insert into public.vocabulary(user_id,language_code,term) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','ja','禁止された書き込み');raise exception 'Non-owner vocabulary insert accepted';exception when insufficient_privilege then null;end;
 begin insert into public.vocabulary_examples(vocabulary_id,sentence) values(current_setting('kotoba.fixture.vocabulary_id')::uuid,'Parent access must be rejected');raise exception 'Non-owner child insert accepted';exception when insufficient_privilege then null;end;
end;$$;
reset role;
set role anon;
do $$declare t record;c bigint;begin
 for t in select tablename from pg_catalog.pg_tables where schemaname='public' loop
  begin execute format('select count(*) from public.%I',t.tablename) into c;if c<>0 then raise exception 'Anonymous read on %',t.tablename;end if;exception when insufficient_privilege then null;end;
 end loop;
end;$$;
reset role;
select 'local migration + distinct identities + idempotency + RLS PASS' as result;
`;
const container='kotoba-content-test-'+randomUUID().slice(0,8);
const dockerEnv={...process.env};for(const key of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete dockerEnv[key];
function docker(args,input){const result=spawnSync('docker',['--host=unix:///var/run/docker.sock',...args],{input,encoding:'utf8',env:dockerEnv,maxBuffer:1024*1024});if(result.status!==0)throw new Error((result.stderr||result.stdout||'Docker test failed').slice(-2000));return result.stdout}
try{
 docker(['info','--format','{{.ServerVersion}}']);
 docker(['run','-d','--name',container,'-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:17-alpine']);
 let ready=false;for(let i=0;i<30;i++){try{docker(['exec',container,'pg_isready','-h','127.0.0.1','-U','postgres']);ready=true;break}catch{await new Promise(resolve=>setTimeout(resolve,300))}}if(!ready)throw new Error('Disposable PostgreSQL did not start');
 let baseline=await readFile('tests/fixtures/content-backend-bootstrap.sql','utf8');
 baseline+="\ninsert into auth.users(id,email,email_confirmed_at) values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','other@kotoba.test',now());\n";
 for(const name of ['001_kotoba','002_personal_backend','003_sync_and_srs','004_ai_requests_and_content','005_hardening_and_projection','006_personal_audio_and_memory','007_audio_position_identity','008_phase_one_private_account','009_private_permissions_and_storage'])baseline+='\nbegin;\n'+await readFile(`supabase/migrations/${name}.sql`,'utf8')+'\ncommit;\n';
 baseline+="\nselect public.configure_private_owner('owner@kotoba.test');\ninsert into auth.users(id,email,email_confirmed_at) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','owner@kotoba.test',now());\ninsert into supabase_migrations.schema_migrations(version,name) select lpad(i::text,3,'0'),'fixture' from generate_series(1,9) i;\n";
 const deploy=await readFile('supabase/dashboard/010_deploy.sql','utf8');const verify=await readFile('supabase/dashboard/010_verify.sql','utf8');
 const events=await readFile('supabase/dashboard/011_deploy.sql','utf8'),verifyEvents=await readFile('supabase/dashboard/011_verify.sql','utf8');
 const rollbackEvents=await readFile('supabase/dashboard/011_rollback.sql','utf8'),repairEvents=await readFile('supabase/migrations/011_text_event_identity.sql','utf8');
 docker(['exec','-i',container,'psql','-U','postgres','-v','ON_ERROR_STOP=1'],baseline+deploy+deploy+verify+events+events+verifyEvents+sql+rollbackEvents+'\nbegin;\n'+repairEvents+'\ncommit;\n'+verifyEvents+sql);
 await writeFile('docs/CONTENT-BACKEND-TEST.md',`# Content backend validation\n\nDisposable local PostgreSQL 17: PASS.\n\n- Migrations 010 and 011 applied and repeated safely in the disposable database only.\n- Textual study event ID and corrected reading mistake sync without changing client IDs.\n- Emergency rollback and compatibility reapplication retain data and migration history in the disposable database.\n- Separate grammar and article identities.\n- Duplicate review/batch retries do not duplicate events or revisions.\n- Existing reading progress retained.\n- Corrected reading error remains in the private mistake projection once across duplicate sync.\n- Every local public table rejects non-owner reads/updates/deletes (permission denied or zero rows).\n- Non-owner vocabulary and parent-owned example inserts are rejected.\n- Anonymous reads reject every local public table.\n- Compatibility RPC rejects the non-owner.\n- Timezone, System-theme preference, mobile practice drafts, session pins and reading-anchor snapshots remain compatible.\n\nThis is **not** evidence of deployment or verification on real Supabase.\n`);
 console.log('Content backend: isolated PostgreSQL migration / idempotency / identities / RLS PASS. Production was not accessed.');
}finally{const cleanup=spawnSync('docker',['--host=unix:///var/run/docker.sock','rm','-fv',container],{encoding:'utf8',env:dockerEnv});if(cleanup.status!==0)console.error('Local test container cleanup failed:',container)}
