import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadDocuments} from '../scripts/content-files.mjs';
import {parseDocument,contentEntry,documentLength,matchesContent} from '../lib/content-library/schema.ts';
import {learnGrammar,learnedGrammarCards,saveReadingResult,readingResult,checkExercise,recommendedDifficulty} from '../lib/content-library/learning.ts';
import {initialState} from '../lib/store.ts';
import {schedule} from '../lib/srs.ts';
import {stampChanges,mergeStates} from '../lib/sync-state.ts';
import {exportJSON} from '../lib/export.ts';
import {parseBackup} from '../lib/backend/backup-schema.ts';
const docs=await loadDocuments();const grammar=docs.find(d=>d.kind==='grammar'&&d.level==='N2');const article=docs.find(d=>d.kind==='reading');
const fresh=()=>structuredClone(initialState);

test('new curriculum has complete examples, aligned reading and valid metadata without article bodies',()=>{
 assert.ok(docs.length>=40);const ids=new Set();
 for(const d of docs){assert.ok(!ids.has(d.id));ids.add(d.id);assert.deepEqual(parseDocument(d),d);const entry=contentEntry(d);assert.equal(entry.id,d.id);assert.ok(!('paragraphs' in entry));assert.ok(!('examples' in entry));if(d.kind==='grammar'){assert.ok(d.examples.length>=4);assert.ok(d.explanation.length>=40);assert.ok(d.exercises.length>=3)}else{assert.equal(d.translation.length,d.paragraphs.length);assert.ok(d.questions.length>=3);assert.ok(documentLength(d)>=(({ja:{N5:80,N4:150,N3:300,N2:500,N1:800},en:{A1:80,A2:150,B1:250,B2:400,C1:600,C2:800}})[d.language][d.level]))}}
});
test('content rejects wrong levels, missing Japanese readings and impossible question answers',()=>{
 assert.throws(()=>parseDocument({...grammar,level:'A1'}));assert.throws(()=>parseDocument({...grammar,examples:grammar.examples.map(e=>({...e,reading:undefined}))}));assert.throws(()=>parseDocument({...article,questions:article.questions.map(q=>({...q,answer:q.options.length}))}));assert.throws(()=>parseDocument({...article,translation:[]}));
});
test('learning grammar creates one due card and preserves existing notes, schedule and history',()=>{
 const s=fresh();s.notes[grammar.id]='My explanation';const learned=learnGrammar(s,grammar,1000);assert.equal(learnedGrammarCards(learned).length,1);assert.equal(learned.reviews[grammar.id].due,1000);assert.equal(learned.notes[grammar.id],'My explanation');assert.equal(learned.reviewHistory.length,0);
 const reviewed={...learned,reviews:{...learned.reviews,[grammar.id]:schedule(learned.reviews[grammar.id],grammar.id,'Good',2000)}};assert.deepEqual(learnGrammar(reviewed,grammar,3000).reviews[grammar.id],reviewed.reviews[grammar.id]);assert.equal(learnedGrammarCards({...reviewed,profile:{...reviewed.profile,language:'en'}}).length,0);
});
test('grammar review events converge once across devices and survive a private backup',()=>{
 const base=fresh(),learned=stampChanges(base,learnGrammar(base,grammar,1000),1000);const mobile=mergeStates(base,learned);assert.equal(learnedGrammarCards(mobile)[0].id,grammar.id);
 const event={id:'library-review-operation',language:'ja',cardId:grammar.id,rating:'Good',at:2000};const reviewed=stampChanges(mobile,{...mobile,reviewHistory:[event]},2000);const merged=mergeStates(reviewed,reviewed);assert.equal(merged.reviewHistory.length,1);assert.equal(merged.reviews[grammar.id].repetitions,1);const restored=parseBackup(exportJSON(merged));assert.equal(learnedGrammarCards(restored)[0].id,grammar.id);assert.equal(restored.reviews[grammar.id].due,merged.reviews[grammar.id].due);
});
test('reading completion and attempt history sync without overwriting article notes',()=>{
 const base=fresh();base.notes[article.id]='My reading note';base.readingPositions[article.id]={progress:67,offset:500,updatedAt:10};const result={articleId:article.id,language:'ja',startedAt:1000,completedAt:31000,readingTime:30,answers:{[article.questions[0].id]:0},score:80,lookedUpWords:[article.vocabulary[0]],savedWords:[],grammarViewed:[grammar.id],difficulty:'right'};
 const saved=stampChanges(base,saveReadingResult(base,result),31000);const merged=mergeStates(base,saved);assert.equal(merged.readingPositions[article.id].progress,100);assert.equal(merged.readingPositions[article.id].offset,500);assert.equal(merged.notes[article.id],'My reading note');assert.deepEqual(readingResult(merged,article.id),result);assert.deepEqual(readingResult(parseBackup(exportJSON(merged)),article.id),result);assert.ok(merged.notes[`library-attempt-${article.id}-31000`]);
});
test('practice comparison permits punctuation variants without accepting a different form',()=>{
 assert.ok(checkExercise('  食べない。  ',['食べない']));assert.ok(!checkExercise('食べた',['食べない']));assert.ok(checkExercise('I work here.',['I work here']));
});
test('recommendations use recent reading performance, not one answer or another language',()=>{
 let s=fresh();assert.equal(recommendedDifficulty(s,'ja'),0);for(let i=0;i<3;i++)s=saveReadingResult(s,{articleId:`article-ja-history-${i}`,language:'ja',startedAt:0,completedAt:i+1,readingTime:30,answers:{},score:90,lookedUpWords:[],savedWords:[],grammarViewed:[],difficulty:'right'});assert.equal(recommendedDifficulty(s,'ja'),1);assert.equal(recommendedDifficulty(s,'en'),0);
});
test('the existing service worker caches library JSON for offline use and navigation loads the library lazily',async()=>{
 const sw=await readFile('public/sw.js','utf8');assert.ok(sw.includes('/content/'));const app=await readFile('app/page.tsx','utf8');assert.ok(app.includes("dynamic(()=>import('@/components/content-library')"));assert.ok(!app.includes('core-01.json'));
});

test('persistent content downloads accept library JSON and reject private API paths',async()=>{
 const {cacheDownloadedContent,readDownloadedContent}=await import('../lib/platform/content-cache.ts');
 const old=globalThis.caches;const items=new Map();globalThis.caches={open:async name=>{assert.equal(name,'kotoba-personal-downloads');return {put:async(path,response)=>items.set(path,response.clone()),match:async path=>items.get(path)?.clone()}}};
 try{await cacheDownloadedContent('/content/library/index.json',{version:1,entries:[]});assert.deepEqual(await readDownloadedContent('/content/library/index.json'),{version:1,entries:[]});await assert.rejects(()=>cacheDownloadedContent('/api/auth',{}));await assert.rejects(()=>readDownloadedContent('/content/library/../../token.json'));assert.equal(items.size,1)}finally{if(old===undefined)delete globalThis.caches;else globalThis.caches=old}
});
test('malformed reading metadata cannot break history or recommendations',()=>{
 const s=fresh();s.notes[`library-result-${article.id}`]=JSON.stringify({articleId:article.id,score:90,readingTime:12});assert.equal(readingResult(s,article.id),null);assert.equal(recommendedDifficulty(s,'ja'),0);
});

// Only compact, curated metadata is searched; article bodies remain lazy-loaded.
test('catalog keyword search finds linked vocabulary and grammar with normalized input',()=>{
 const entry=contentEntry(article,['余裕','よゆう','从容','に基づいて','evidence']);
 assert.ok(matchesContent(entry,' よゆう '));assert.ok(matchesContent(entry,'从容'));
 assert.ok(matchesContent(entry,'ＥＶＩＤＥＮＣＥ'));assert.ok(matchesContent(entry,'に基づいて'));
 assert.equal(matchesContent(entry,'not-a-library-keyword'),false);
 assert.ok(!('paragraphs' in entry));assert.ok(!('translation' in entry));
 assert.ok(matchesContent({...entry,keywords:undefined},entry.title));
});
