import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../lib/store.ts';
import {loadDocuments} from '../scripts/content-files.mjs';
import {contentEntry} from '../lib/content-library/schema.ts';
import {coursePlan,beginCourseSession,storedCoursePlan,scopedSession,switchLearningScope,sessionTask,finishCoreStep,saveSessionProgress,sessionSteps,scopedSessionProgress} from '../lib/content-library/daily-course-plan.ts';
import {readinessResult,readinessCacheKey} from '../lib/content-library/readiness-state.ts';
import {pageURL,pageFromHash,mobileNavParent,mobilePageTitle} from '../lib/app-navigation.ts';
import {saveStudyRecord} from '../lib/study-record.ts';
import {readingDraft,saveReadingDraft,grammarDraft,saveGrammarDraft,practiceCursor} from '../lib/content-library/practice-state.ts';
import {exportJSON} from '../lib/export.ts';
import {parseBackup} from '../lib/backend/backup-schema.ts';
import {mergeStates,stampChanges} from '../lib/sync-state.ts';
import {confirmReadingQuestion,readingSources,collectedCardIds} from '../lib/content-library/reading-collection.ts';
import {reviewQueue} from '../lib/review-queue.ts';
import {StudyTimer} from '../lib/study-timer.ts';
import {watchStudyTimer} from '../lib/platform/study-lifecycle.ts';
import {learningSaveMessage} from '../lib/learning-save-state.ts';
const docs=await loadDocuments(),catalog=docs.map(d=>contentEntry(d)),fresh=()=>structuredClone(initialState);
test('new daily session pins both real course IDs before opening and excludes unlearned seed cards from due reviews',()=>{
 const base=fresh();base.profile.level='N4';const s=beginCourseSession(base,catalog,1000),p=storedCoursePlan(s);assert.equal(p.reviewIds.length,0);assert.equal(p.grammar.language,'ja');assert.equal(p.grammar.legacy,false);assert.equal(p.reading.legacy,false);assert.ok(catalog.some(e=>e.id===p.grammar.id));assert.equal(sessionSteps(s).length,3);assert.ok(Object.values(s.notes).some(note=>note.includes(p.grammar.id)&&note.includes(p.reading.id)));
 const resumed=beginCourseSession(parseBackup(exportJSON(s)),catalog.toReversed(),2000);assert.equal(resumed.activeSession.startedAt,1000);assert.deepEqual(storedCoursePlan(resumed),p);
});
test('preview uses transparent metadata time and resumes actual unfinished reading before a new related article',()=>{
 const s=fresh();s.profile.level='N2';const a=catalog.find(e=>e.kind==='reading'&&e.language==='ja'&&e.level==='N2');s.readingPositions[a.id]={progress:67,offset:500,updatedAt:1000};const p=coursePlan(s,catalog,2000);assert.equal(p.reading.id,a.id);assert.equal(p.minutes,Math.ceil(p.reviewIds.length/3)+p.grammar.minutes+p.reading.minutes);assert.match(p.reason,/继续/);
});
test('language and grade changes retain separate plans, reviews and notes without mixing completion flags',()=>{
 let s=fresh();s.profile.level='N4';s.languageProfiles.ja.level='N4';s=beginCourseSession(s,catalog,1000);s=finishCoreStep(s,'Review');const original=storedCoursePlan(s);s.notes['private-note']='保留';s=switchLearningScope(s,'en','A2');assert.equal(s.activeSession,null);assert.equal(scopedSession(s),null);s=beginCourseSession(s,catalog,2000);assert.equal(storedCoursePlan(s).language,'en');assert.deepEqual(s.activeSession.completed,[]);
 s=switchLearningScope(s,'ja','N4');assert.equal(scopedSession(s).startedAt,1000);s=beginCourseSession(s,[],3000);assert.deepEqual(storedCoursePlan(s),original);assert.deepEqual(s.activeSession.completed,['Review']);assert.equal(s.notes['private-note'],'保留');
 s=switchLearningScope(s,'ja','N3');s=beginCourseSession(s,catalog,4000);assert.equal(storedCoursePlan(s).level,'N3');assert.deepEqual(s.activeSession.completed,[]);
});
test('completion is idempotent and another browsed grammar cannot complete the pinned task',()=>{
 let s=beginCourseSession(fresh(),catalog,1000);s=finishCoreStep(s,'Review');assert.equal(finishCoreStep(s,'Review'),s);s={...s,activeSession:{...s.activeSession,step:1}};const task=sessionTask(s,'Grammar');assert.equal(finishCoreStep(s,'Grammar','grammar-ja-wrong'),s);s=finishCoreStep(s,'Grammar',task.id);assert.ok(s.activeSession.completed.includes('Grammar'));assert.equal(finishCoreStep(s,'Grammar',task.id),s);
});
test('finished plans cannot revive a stale paused-session copy after Done',()=>{
 let s=beginCourseSession(fresh(),catalog,1000);s=switchLearningScope(s,'en');s=switchLearningScope(s,'ja');s=beginCourseSession(s,[],2000);s=saveSessionProgress(s,{...s.activeSession,step:2,completed:['Review','Grammar','Reading'],done:true});assert.equal(scopedSession(s),null);s={...s,activeSession:null};assert.equal(scopedSession(s),null);assert.equal(beginCourseSession(s,catalog,3000).activeSession.startedAt,3000);
});
test('legacy four-step sessions remain recoverable without changing the archive/schema version',()=>{
 const s=fresh();s.activeSession={language:'ja',step:3,startedAt:1000,baseline:0,completed:['Review','Grammar','Reading'],done:false};assert.equal(storedCoursePlan(s),null);assert.equal(sessionSteps(s).length,4);assert.equal(beginCourseSession(s,[],2000).activeSession.step,3);assert.deepEqual(parseBackup(exportJSON(s)).activeSession,s.activeSession);
});
test('readiness reports auth/network/offline/cache ambiguity separately from a genuinely undefined function',()=>{
 const base={online:true,configured:true,cached:true};assert.equal(readinessResult({...base,error:{code:'42883',message:'function content_library_ready does not exist'}}).status,'migration-required');assert.equal(readinessResult({...base,error:{code:'PGRST202'}}).status,'interface-unavailable');assert.equal(readinessResult({...base,error:{code:'PGRST301'}}).status,'auth-error');assert.equal(readinessResult({...base,error:{code:'FETCH_ERROR'}}).status,'network-error');assert.equal(readinessResult({...base,online:false,cached:false}).status,'offline-unverified');assert.equal(readinessResult({...base,data:true}).status,'ready');
});
test('language navigation clears stale course/filter query and retains the four-entry Library destination',()=>{
 const url=pageURL('https://kotoba.test/?content=grammar-ja-n4&word=word-ja-x&legacy=1#Grammar','Library');assert.equal(url.search,'');assert.equal(pageFromHash(url.hash),'Library');
});
test('study completion retries and repeated sync retain one record and the content language',()=>{
 const base=fresh(),record={id:'reading-attempt-one',language:'en',at:1000,day:'2026-10-08',type:'Reading',count:1,minutes:2};const s=saveStudyRecord(base,record);assert.equal(saveStudyRecord(s,{...record,at:2000}),s);const merged=mergeStates(stampChanges(base,s,1000),stampChanges(base,s,1000));assert.equal(merged.sessions.length,1);assert.equal(merged.sessions[0].language,'en');
});
test('saved reading answer indices keep their exact frozen option mapping after backup and sync',()=>{
 const a=docs.find(d=>d.kind==='reading');const base=fresh();const answer=a.questions[0].answer;const s=saveReadingDraft(base,a,{...readingDraft(base,a),attemptId:'fixed-answer-order',answers:{[a.questions[0].id]:answer}});const restored=parseBackup(exportJSON(mergeStates(base,stampChanges(base,s,1000))));assert.equal(a.questions[0].options[readingDraft(restored,a).answers[a.questions[0].id]],a.questions[0].options[answer]);
});

test('all 2.6 grades have the qualified minimum with five mapped questions and four examples',()=>{
 for(const [language,levels] of Object.entries({ja:['N5','N4','N3','N2','N1'],en:['A1','A2','B1','B2','C1','C2']}))for(const level of levels){const g=docs.filter(d=>d.kind==='grammar'&&d.language===language&&d.level===level),r=docs.filter(d=>d.kind==='reading'&&d.language===language&&d.level===level);assert.ok(g.length>=(level==='N2'?50:10),language+level);assert.ok(r.length>=(level==='N2'?10:5),language+level);for(const d of g){assert.ok(d.examples.length>=4);assert.ok(d.exercises.length>=5);for(const e of d.exercises)if(e.options)assert.ok(e.options.includes(e.acceptedAnswers[0]));}for(const d of r){assert.ok(d.questions.length>=5);assert.equal(d.paragraphs.length,d.translation.length);}}
});
test('only explicit missing readiness function is a migration signal, and capability keys isolate project and owner',()=>{
 const input={online:true,configured:true,cached:false};assert.equal(readinessResult({...input,error:{code:'42883',message:'function unrelated_helper() does not exist'}}).status,'interface-unavailable');assert.notEqual(readinessCacheKey('project-one','owner'),readinessCacheKey('project-two','owner'));assert.notEqual(readinessCacheKey('project-one','owner'),readinessCacheKey('project-one','another-user'));
});
test('new daily plans cover three steps and explain actual legacy fallback only when full content is unavailable',()=>{
 const base=fresh(),s=beginCourseSession(base,[],1000),p=storedCoursePlan(s);assert.equal(p.grammar.legacy,true);assert.equal(p.reading.legacy,true);assert.match(p.reason,/缺失/);assert.deepEqual(sessionSteps(s),['Review','Grammar','Reading']);
});
test('a reading selection is retained but unchecked until submitted, and confirmation survives restore',()=>{
 const a=docs.find(d=>d.kind==='reading'),base=fresh(),d=readingDraft(base,a),q=a.questions[0];let s=saveReadingDraft(base,a,{...d,answers:{[q.id]:q.answer}});assert.equal(readingDraft(s,a).checked[q.id],undefined);s=saveReadingDraft(s,a,{...readingDraft(s,a),checked:{[q.id]:true}});const restored=parseBackup(exportJSON(s));assert.equal(readingDraft(restored,a).checked[q.id],true);s.notes['library-reading-draft-'+a.id]=JSON.stringify({...d,checked:{[q.id]:true}});assert.equal(readingDraft(s,a).checked[q.id],undefined);
});
test('one reading attempt creates one result/history operation even after a later retry or repeated sync',async()=>{
 const {saveReadingResult}=await import('../lib/content-library/learning.ts');const a=docs.find(d=>d.kind==='reading'),base=fresh(),r={articleId:a.id,language:a.language,startedAt:1000,completedAt:2000,readingTime:40,answers:{},score:0,lookedUpWords:[],savedWords:[],grammarViewed:[],difficulty:'right',attemptId:'confirmed-attempt'};
 const s=saveReadingResult(base,r);assert.equal(saveReadingResult(s,{...r,completedAt:3000}),s);const next=saveReadingResult(s,{...r,attemptId:'retry-attempt',completedAt:4000});assert.equal(saveReadingResult(next,{...r,completedAt:5000}),next);const merged=mergeStates(stampChanges(base,s,2000),stampChanges(base,s,2000));assert.equal(Object.keys(merged.notes).filter(k=>k.startsWith('library-attempt-')).length,1);
});
test('package, lockfile, settings version and development worker share one release number',async()=>{
 const {APP_VERSION}=await import('../lib/version.ts');const {readFile}=await import('node:fs/promises');const pkg=JSON.parse(await readFile('package.json','utf8')),lock=JSON.parse(await readFile('package-lock.json','utf8'));assert.equal(APP_VERSION,'2.7.0');assert.equal(pkg.version,APP_VERSION);assert.equal(lock.version,APP_VERSION);assert.equal(lock.packages[''].version,APP_VERSION);assert.ok((await readFile('public/sw.js','utf8')).includes('kotoba-'+APP_VERSION+'-dev'));
});
test('a corrected reading error remains in SRS with its article source after reload and repeated confirmation',()=>{
 const a=docs.find(d=>d.kind==='reading'&&d.language==='ja'),q=a.questions[0],wrong=(q.answer+1)%q.options.length;
 let s=saveReadingDraft(fresh(),a,{...readingDraft(fresh(),a),attemptId:'first-error',answers:{[q.id]:wrong}});
 s=confirmReadingQuestion(s,a,q.id);assert.equal(confirmReadingQuestion(s,a,q.id),s);
 const firstId=s.mistakes[0].id;s=saveReadingDraft(s,a,{...readingDraft(s,a),answers:{[q.id]:q.answer},checked:{[q.id]:false}});s=confirmReadingQuestion(s,a,q.id);
 assert.equal(s.mistakes.length,1);assert.equal(s.mistakes[0].original,q.options[wrong]);assert.equal(readingDraft(s,a).answers[q.id],q.answer);
 const restored=parseBackup(exportJSON(mergeStates(s,stampChanges(fresh(),s,1000))));
 const card='sentence-mistake-'+firstId;assert.ok(reviewQueue(restored).some(w=>w.id===card));assert.ok(collectedCardIds(restored,a.id).includes(card));assert.equal(readingSources(restored,card)[0].articleId,a.id);assert.equal(readingSources(restored,card)[0].prompt,q.prompt);
});
test('reading confirmation uses content language, ignores invalid selections, and retains one error per attempt/question',()=>{
 const a=docs.find(d=>d.kind==='reading'&&d.language==='en'),q=a.questions[0],base=fresh();assert.equal(confirmReadingQuestion(base,a,q.id),base);
 let s=saveReadingDraft(base,a,{...readingDraft(base,a),attemptId:'attempt-one',answers:{[q.id]:(q.answer+1)%q.options.length}});s=confirmReadingQuestion(s,a,q.id);assert.equal(s.mistakes[0].language,'en');
 s=saveReadingDraft(s,a,{...readingDraft(s,a),checked:{},answers:{[q.id]:(q.answer+2)%q.options.length}});s=confirmReadingQuestion(s,a,q.id);assert.equal(s.mistakes.length,1);
 s=saveReadingDraft(s,a,{...readingDraft(s,a),checked:{},attemptId:'attempt-two'});s=confirmReadingQuestion(s,a,q.id);assert.equal(s.mistakes.length,2);assert.notEqual(s.mistakes[0].id,s.mistakes[1].id);
 const completed=saveReadingDraft(s,a,{...readingDraft(s,a),checked:{},phase:'complete'});assert.equal(confirmReadingQuestion(completed,a,q.id),completed);
});
test('pagehide/pageshow restore visible study time without counting bfcache suspension or adding duplicate intervals',()=>{
 let now=0,total=0;const timer=new StudyTimer(()=>now),page=new EventTarget(),document=Object.assign(new EventTarget(),{hidden:false});
 const stop=watchStudyTimer(timer,()=>{total+=timer.take()},{page,document});now=5000;page.dispatchEvent(new Event('pagehide'));now=365000;page.dispatchEvent(new Event('pageshow'));page.dispatchEvent(new Event('pageshow'));now=370000;document.hidden=true;document.dispatchEvent(new Event('visibilitychange'));assert.equal(total,10000);
 now=400000;page.dispatchEvent(new Event('pageshow'));now=500000;document.hidden=false;document.dispatchEvent(new Event('visibilitychange'));now=505000;stop();assert.equal(total,15000);
 now=600000;page.dispatchEvent(new Event('pageshow'));now=700000;assert.equal(timer.take(),0);assert.equal(total,15000);
});
test('save feedback never claims cloud success for pending operations, offline or local fallback',()=>{
 assert.equal(learningSaveMessage('saved',true,'synced',0),'已保存并同步');
 assert.match(learningSaveMessage('saved',true,'synced',1),/等待同步/);
 assert.match(learningSaveMessage('saved',false,'synced',0),/离线/);
 assert.match(learningSaveMessage('fallback',true,'synced',0),/备用/);
 assert.match(learningSaveMessage('failed',true,'synced',0),/本地保存失败/);
 assert.match(learningSaveMessage('saving',true,'synced',0),/保存到本地/);
 assert.match(learningSaveMessage('saved',true,'failed',2),/同步失败/);
 assert.match(learningSaveMessage('saved',true,'syncing',2),/同步中/);
});
test('mobile practice restores the exact grammar and reading question across backup and sync without changing options',()=>{
 const g=docs.find(d=>d.kind==='grammar'),a=docs.find(d=>d.kind==='reading'),base=fresh();
 let s=saveGrammarDraft(base,g,{...grammarDraft(base,g),section:'practice',questionId:g.exercises[3].id,answers:{[g.exercises[0].id]:g.exercises[0].acceptedAnswers[0]},checked:{[g.exercises[0].id]:true},accepted:{[g.exercises[0].id]:true}});
 s=saveReadingDraft(s,a,{...readingDraft(s,a),questionId:a.questions[2].id,answers:{[a.questions[2].id]:a.questions[2].answer}});
 const restored=parseBackup(exportJSON(mergeStates(base,stampChanges(base,s,1000))));const gd=grammarDraft(restored,g),rd=readingDraft(restored,a);
 assert.equal(practiceCursor(g.exercises,gd.questionId,gd.accepted).index,3);assert.equal(practiceCursor(a.questions,rd.questionId,rd.checked).index,2);assert.equal(rd.checked[a.questions[2].id],undefined);assert.equal(a.questions[2].options[rd.answers[a.questions[2].id]],a.questions[2].options[a.questions[2].answer]);
});
test('missing/foreign cursor falls back to unfinished work while confirming does not jump to the next question',()=>{
 const a=docs.find(d=>d.kind==='reading'),g=docs.find(d=>d.kind==='grammar'),base=fresh();
 let s=saveReadingDraft(base,a,{...readingDraft(base,a),questionId:'foreign-question',attemptId:'mobile-navigation',answers:{[a.questions[0].id]:a.questions[0].answer}});
 assert.equal(readingDraft(s,a).questionId,undefined);s=confirmReadingQuestion(s,a,a.questions[0].id);const d=readingDraft(s,a);assert.equal(practiceCursor(a.questions,d.questionId,d.checked).index,0);assert.equal(practiceCursor(a.questions,undefined,d.checked).index,1);
 s=saveGrammarDraft(s,g,{...grammarDraft(s,g),questionId:'foreign-question'});assert.equal(grammarDraft(s,g).questionId,undefined);assert.equal(practiceCursor(g.exercises,undefined,{[g.exercises[0].id]:true}).index,1);
});
test('phone daily progress reports three core steps and restores a parked plan instead of the other language',()=>{
 let s=beginCourseSession(fresh(),catalog,1000);s=finishCoreStep(s,'Review');let p=scopedSessionProgress(s);assert.equal(p.steps.length,3);assert.equal(p.completed,1);
 s=switchLearningScope(s,'en','A2');assert.equal(scopedSessionProgress(s).session,null);s=beginCourseSession(s,catalog,2000);s=switchLearningScope(s,'ja','N3');p=scopedSessionProgress(s);assert.equal(p.session.startedAt,1000);assert.equal(p.completed,1);assert.equal(p.steps.length,3);
 s=beginCourseSession(s,[],3000);s=saveSessionProgress(s,{...s.activeSession,done:true,completed:['Review','Grammar','Reading']});assert.equal(scopedSessionProgress(s).completed,3);
 const legacy=fresh();legacy.activeSession={language:'ja',step:2,startedAt:1000,baseline:0,done:false,completed:['Review','Grammar']};assert.equal(scopedSessionProgress(legacy).steps.length,4);
});
test('mobile child routes keep a selected parent and Chinese title without rewriting stable URLs',()=>{
 for(const page of ['Grammar','Reading','My Sentences','Mistake Notebook'])assert.equal(mobileNavParent(page),'Library');for(const page of ['Vocabulary','Review','Listening','Speaking'])assert.equal(mobileNavParent(page),'Learn');assert.equal(mobileNavParent('Settings'),'Profile');assert.equal(mobilePageTitle.Review,'复习');
 const url=pageURL('https://kotoba.test/','Reading',{content:'article-ja-n4-map-and-walk'});assert.equal(pageFromHash(url.hash),'Reading');assert.equal(url.searchParams.get('content'),'article-ja-n4-map-and-walk');
});
