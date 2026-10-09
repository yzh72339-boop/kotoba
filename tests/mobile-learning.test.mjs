import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadDocuments} from '../scripts/content-files.mjs';
import {verifiedOwnerForProject,privateAccessAllowed} from '../lib/private-access.ts';
import {initialState} from '../lib/store.ts';
import {readinessResult,readinessMessage} from '../lib/content-library/readiness-state.ts';
import {sessionCourse,pinSessionCourse,lastCourse} from '../lib/content-library/session-course.ts';
import {grammarDraft,saveGrammarDraft,readingDraft,saveReadingDraft} from '../lib/content-library/practice-state.ts';
import {readerAnchor,readAnchor,readerScrollTarget} from '../lib/content-library/reader-state.ts';
import {contentEntry} from '../lib/content-library/schema.ts';
import {exportJSON} from '../lib/export.ts';
import {parseBackup} from '../lib/backend/backup-schema.ts';
import {mergeStates,stampChanges} from '../lib/sync-state.ts';
import {saveReadingResult,readingResult} from '../lib/content-library/learning.ts';
import {fetchDocument,downloadDocuments,fetchCatalog} from '../lib/content-library/client.ts';
const docs=await loadDocuments(),catalog=docs.map(d=>contentEntry(d));const g=docs.find(d=>d.id==='grammar-ja-n4-nagara'),a=docs.find(d=>d.id==='article-ja-n4-map-and-walk');
const fresh=()=>structuredClone(initialState);
const input={online:true,configured:true,cached:false};
test('readiness distinguishes checking outcomes rather than treating network/login as migration missing',()=>{
 assert.deepEqual(readinessResult({...input,data:true}),{status:'ready',writable:true});
 assert.equal(readinessResult({...input,error:{code:'PGRST202'}}).status,'interface-unavailable');
 assert.equal(readinessResult({...input,error:{code:'PGRST301'}}).status,'auth-error');
 assert.equal(readinessResult({...input,error:{code:'42501'}}).status,'denied');
 assert.equal(readinessResult({...input,error:{code:'NETWORK'}}).status,'network-error');
 assert.equal(readinessResult({...input,configured:false}).status,'configuration-error');
 assert.ok(!readinessMessage['auth-error'].includes('010'));assert.ok(!readinessMessage['network-error'].includes('010'));
});
test('offline curriculum writes require a previously verified private device',()=>{
 assert.deepEqual(readinessResult({...input,online:false,cached:true}),{status:'offline-ready',writable:true});
 assert.deepEqual(readinessResult({...input,online:false}),{status:'offline-unverified',writable:false});
 assert.equal(readinessResult({...input,data:false,cached:true}).writable,false);
});
test('daily courses select exact language/grade and preserve a stable ID after progress changes',()=>{
 let s=fresh();s.profile.level='N4';s.completed.push(...g.prerequisites);s.activeSession={language:'ja',step:1,startedAt:1000,baseline:0,completed:['Review'],done:false};
 const lessonCatalog=catalog.filter(e=>e.kind!=='grammar'||e.level!=='N4'||e.id===g.id);assert.equal(sessionCourse(s,'grammar',lessonCatalog).id,g.id);s=pinSessionCourse(s,contentEntry(g));s.completed.push(g.id);
 assert.equal(sessionCourse(s,'grammar',catalog).id,g.id);
 assert.equal(sessionCourse(s,'reading',catalog).id,a.id);assert.equal(sessionCourse({...s,profile:{...s.profile,level:'N1'}},'reading',catalog.filter(e=>e.level!=='N1')),null);
});
test('changing grades retains the old session pin, reviews and personal notes',()=>{
 const base=fresh();base.profile.level='N4';base.activeSession={language:'ja',step:1,startedAt:1000,baseline:0,completed:['Review'],done:false};base.notes[g.id]='my note';base.reviews['old-card']={id:'old-card',due:1000,interval:1,ease:2.5,repetitions:1,lapses:0,lastReview:0};
 const pinned=pinSessionCourse(base,contentEntry(g));const changed={...pinned,completed:[...pinned.completed,...docs.find(d=>d.id==='grammar-ja-n3-you-ni-suru').prerequisites],profile:{...pinned.profile,level:'N3'}};const next=sessionCourse(changed,'grammar',catalog);assert.equal(next.level,'N3');const second=pinSessionCourse(changed,next);
 assert.equal(Object.keys(second.notes).filter(k=>k.startsWith('library-session-')).length,2);assert.equal(second.notes[g.id],'my note');assert.deepEqual(second.reviews,base.reviews);
 assert.equal(sessionCourse({...second,profile:{...second.profile,level:'N4'}},'grammar',catalog).id,g.id);
});
test('continue reading prefers the latest unfinished matching article, not a completed or other-level article',()=>{
 const s=fresh();s.profile.level='N2';const entries=catalog.filter(e=>e.kind==='reading'&&e.language==='ja'&&e.level==='N2');assert.ok(entries.length>2);
 s.readingPositions[entries[1].id]={progress:67,offset:500,updatedAt:200};s.readingPositions[entries[2].id]={progress:100,updatedAt:300};s.completed.push(entries[2].id);
 assert.equal(sessionCourse(s,'reading',catalog).id,entries[1].id);
});
test('last course validates stable identity, language and current grade',()=>{
 const s=fresh();s.profile.level='N4';s.notes['library-last-course']=JSON.stringify({id:g.id,kind:'grammar',language:'ja',level:'N4'});assert.equal(lastCourse(s).id,g.id);
 assert.equal(lastCourse({...s,profile:{...s.profile,level:'N3'}}),null);s.notes['library-last-course']='null';assert.equal(lastCourse(s),null);s.notes['library-last-course']='{"id":"../../secret"}';assert.equal(lastCourse(s),null);
});
test('grammar answers, checked feedback, mistake dedup and section survive backup and device sync',()=>{
 const base=fresh();base.notes[g.id]='private explanation';const d={answers:{[g.exercises[0].id]:'走路'},checked:{[g.exercises[0].id]:true},accepted:{[g.exercises[0].id]:true},logged:['old-wrong'],section:'practice'};
 const saved=stampChanges(base,saveGrammarDraft(base,g,d),1000);const restored=parseBackup(exportJSON(mergeStates(base,saved)));
 assert.deepEqual(grammarDraft(restored,g),d);assert.equal(restored.notes[g.id],'private explanation');
});
test('malformed grammar draft cannot introduce unknown exercises or accept unchecked answers',()=>{
 const s=fresh();s.notes[`library-grammar-draft-${g.id}`]=JSON.stringify({answers:{unknown:'x'},checked:{},accepted:{[g.exercises[0].id]:true},section:'unrecognized',logged:[null,'valid']});const d=grammarDraft(s,g);
 assert.deepEqual(d.answers,{});assert.deepEqual(d.accepted,{});assert.equal(d.section,'lesson');assert.deepEqual(d.logged,['valid']);
});
test('reading practice restores answers, attempt identity, visible time and lookup history',()=>{
 const s=fresh();const d={...readingDraft(s,a),answers:{[a.questions[0].id]:a.questions[0].answer},startedAt:1000,attemptId:'attempt-one',activeSeconds:42,lookedUpWords:[a.vocabulary[0]],grammarViewed:[g.id],savedWords:[a.vocabulary[1]]};
 const restored=parseBackup(exportJSON(saveReadingDraft(s,a,d)));assert.deepEqual(readingDraft(restored,a),d);
});
test('completed reading stays completed on refresh; wrong-question retry retains history and personal notes',()=>{
 let s=fresh();s.notes[a.id]='reading note';const answers=Object.fromEntries(a.questions.map((q,i)=>[q.id,i===0?(q.answer+1)%q.options.length:q.answer]));const result={articleId:a.id,language:a.language,startedAt:1000,completedAt:2000,readingTime:30,answers,score:67,lookedUpWords:[],savedWords:[],grammarViewed:[],difficulty:'right'};
 s=saveReadingDraft(saveReadingResult(s,result),a,{...readingDraft(s,a),answers,phase:'complete',attemptId:'attempt-one'});assert.equal(readingDraft(parseBackup(exportJSON(s)),a).phase,'complete');
 const correct=Object.fromEntries(a.questions.filter(q=>answers[q.id]===q.answer).map(q=>[q.id,q.answer]));s=saveReadingDraft(s,a,{...readingDraft(s,a),phase:'practice',attemptId:'attempt-two',answers:correct});
 assert.equal(Object.keys(readingDraft(s,a).answers).length,a.questions.length-1);assert.deepEqual(readingResult(s,a.id),result);assert.equal(s.notes[a.id],'reading note');assert.ok(s.notes[`library-attempt-${a.id}-2000`]);
});
test('legacy answer drafts remain readable while invalid options and foreign vocabulary are discarded',()=>{
 const s=fresh();s.notes[`library-draft-${a.id}`]=JSON.stringify({[a.questions[0].id]:0,[a.questions[1].id]:100});assert.deepEqual(readingDraft(s,a).answers,{[a.questions[0].id]:0});
 s.notes[`library-reading-draft-${a.id}`]=JSON.stringify({lookedUpWords:['foreign',a.vocabulary[0],a.vocabulary[0]],grammarViewed:['foreign',g.id],activeSeconds:-10});const d=readingDraft(s,a);assert.deepEqual(d.lookedUpWords,[a.vocabulary[0]]);assert.deepEqual(d.grammarViewed,[g.id]);assert.equal(d.activeSeconds,0);
});
test('paragraph anchors restore on a different screen without changing an existing course ID',()=>{
 const desktop=[{top:100,height:200},{top:330,height:100}],mobile=[{top:180,height:400},{top:630,height:250}];const anchor=readerAnchor(380,desktop);assert.deepEqual(anchor,{index:1,within:.5});
 assert.equal(readerScrollTarget({progress:67,offset:380},1200,readAnchor(JSON.stringify(anchor),2),mobile),755);
});
test('reader restoration preserves legacy offsets and rejects malformed or out-of-bounds anchors',()=>{
 assert.equal(readerScrollTarget({progress:67,offset:500},1000,null,[]),500);assert.equal(readerScrollTarget({progress:67},1000,null,[]),670);assert.equal(readerScrollTarget({progress:10,offset:5000},1000,null,[]),1000);
 for(const value of ['null','{"index":99,"within":0.5}','{"index":0,"within":3}','broken'])assert.equal(readAnchor(value,2),null);
 assert.equal(readerScrollTarget(undefined,0,null,[]),0);
});
test('downloaded mobile courses load offline; reconnect fetches fresh catalog without altering private learning data',async()=>{
 const oldFetch=globalThis.fetch,oldCaches=globalThis.caches,items=new Map();let offline=false;
 globalThis.caches={open:async name=>{assert.equal(name,'kotoba-personal-downloads');return {put:async(path,response)=>items.set(path,response.clone()),match:async path=>items.get(path)?.clone()}}};
 globalThis.fetch=async path=>{if(offline)throw new TypeError('offline');const doc=String(path).endsWith('index.json')?{version:1,entries:catalog}:docs.find(d=>String(path).endsWith(d.id+'.json'));return new Response(JSON.stringify(doc),{headers:{'content-type':'application/json'}})};
 try{const counts=[];await downloadDocuments([g.id,a.id],catalog,n=>counts.push(n));assert.deepEqual(counts,[1,2]);offline=true;assert.deepEqual(await fetchDocument(g.id),g);assert.deepEqual(await fetchDocument(a.id),a);assert.equal((await fetchCatalog()).length,catalog.length);offline=false;assert.equal((await fetchCatalog()).length,catalog.length);assert.equal(items.size,3)}finally{globalThis.fetch=oldFetch;if(oldCaches===undefined)delete globalThis.caches;else globalThis.caches=oldCaches}
});

test('offline course capability is scoped to the already verified owner/project and cannot grant online access',()=>{
 const project='https://kotoba.test',value={id:'private-owner',projectUrl:project,verifiedAt:1000};const owner=verifiedOwnerForProject(value,project);assert.equal(owner.id,'private-owner');assert.equal(verifiedOwnerForProject(value,'https://other-project.test'),undefined);assert.equal(verifiedOwnerForProject({id:'fake'},project),undefined);
 assert.equal(privateAccessAllowed({online:false,locked:false,cached:owner}),true);assert.equal(privateAccessAllowed({online:false,locked:true,cached:owner}),false);assert.equal(privateAccessAllowed({online:true,locked:false,cached:owner}),false);assert.equal(privateAccessAllowed({online:true,locked:false,cached:owner,sessionId:'another',requestFailed:true}),false);
});
