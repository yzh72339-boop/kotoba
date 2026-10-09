import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadDocuments} from '../scripts/content-files.mjs';
import {initialState} from '../lib/store.ts';
import {allCourseWords} from '../lib/course-library.ts';
import {collectReadingWord,collectReadingSentence,collectReadingGrammar,collectReadingMistake,readingSources,collectedCardIds} from '../lib/content-library/reading-collection.ts';
import {captureSentence,createMistake} from '../lib/learning-memory.ts';
import {reviewQueue,reviewCards} from '../lib/review-queue.ts';
import {saveReviewRun,savedReviewRun,unfinishedRun,applyCardRating} from '../lib/review-session.ts';
import {sessionCourse,pinSessionCourse,courseInProgress} from '../lib/content-library/session-course.ts';
import {contentEntry,contentLevels} from '../lib/content-library/schema.ts';
import {saveReadingDraft,readingDraft} from '../lib/content-library/practice-state.ts';
import {exportJSON} from '../lib/export.ts';
import {parseBackup} from '../lib/backend/backup-schema.ts';
import {mergeStates,stampChanges} from '../lib/sync-state.ts';
import {StudyTimer} from '../lib/study-timer.ts';
const docs=await loadDocuments(),catalog=docs.map(d=>contentEntry(d)),article=docs.find(d=>d.id==='article-ja-n5-book-permission'),grammar=docs.find(d=>d.id==='grammar-ja-n5-te-mo-ii-permission');
const fresh=()=>structuredClone(initialState);
const source={articleId:article.id,title:article.title,sentence:article.paragraphs[0],language:article.language};
const word=allCourseWords('ja').find(w=>w.id===article.vocabulary[0]);
const event=(id,at=2000,minutes=.2)=>({id,sessionId:'session-'+id,at,minutes,review:true,mistake:null});
function collected(){let s=fresh();s.profile.level='N5';s=collectReadingWord(s,word,source);s=collectReadingSentence(s,source,article.translation[0],article.vocabulary,[grammar.id]);s=collectReadingGrammar(s,grammar,source);return s}

test('reading words, sentences, grammar and wrong answers enter the existing SRS with actual source identity',()=>{
 let s=collected();const mistake=createMistake('ja','reading','Permission',"I chose the wrong meaning",'Ask for permission',article.title);s=collectReadingMistake(s,mistake,{...source,prompt:article.questions[1].prompt});
 const ids=collectedCardIds(s,article.id),queue=reviewQueue(s);assert.equal(ids.length,4);
 for(const id of ids){assert.ok(queue.some(c=>c.id===id),id);assert.equal(readingSources(s,id)[0].articleId,article.id);assert.equal(readingSources(s,id)[0].sentence,source.sentence)}
 assert.equal(s.dictionary[word.id].source,'Reading: '+article.title);assert.deepEqual(s.sentences[0].grammar,[grammar.id]);assert.equal(s.sentences[0].vocabulary.length,3);
 assert.equal(readingSources(s,'sentence-mistake-'+mistake.id)[0].prompt,article.questions[1].prompt);
});
test('repeated collection preserves stable card IDs, due dates, first encounter and my notes; another article adds a second source',()=>{
 let s=collected();const sentenceId=captureSentence(source.sentence,'ja','').id;s.notes[word.id]='do not overwrite';s.sentences[0].notes='personal sentence note';
 s=applyCardRating(s,word,'Good',event('review-one'));s=applyCardRating(s,reviewCards(s).find(w=>w.id===grammar.id),'Hard',event('review-two',3000));const before=structuredClone(s);
 for(let i=0;i<3;i++){s=collectReadingWord(s,word,source);s=collectReadingSentence(s,source,article.translation[0],article.vocabulary,[grammar.id]);s=collectReadingGrammar(s,grammar,source)}
 assert.equal(s.sentences.length,1);assert.equal(s.sentences[0].id,sentenceId);assert.equal(s.sentences[0].notes,'personal sentence note');assert.deepEqual(s.reviews,before.reviews);assert.deepEqual(s.reviewHistory,before.reviewHistory);assert.equal(s.notes[word.id],'do not overwrite');assert.deepEqual(s.dictionary[word.id],before.dictionary[word.id]);assert.equal(readingSources(s,word.id).length,1);
 const second={...source,articleId:'article-ja-n4-map-and-walk',title:'Different article',sentence:'Different original context.'};s=collectReadingWord(s,word,second);s=collectReadingSentence(s,{...second,sentence:source.sentence},article.translation[0]);assert.equal(readingSources(s,word.id).length,2);assert.equal(readingSources(s,sentenceId).length,2);assert.deepEqual(s.reviews,before.reviews);
});
test('reading source, practice and fixed review run survive private export and offline/reconnect state merge',()=>{
 const base=fresh();let mobile=collected();const ids=collectedCardIds(mobile,article.id);const run={id:'run-one',language:'ja',startedAt:1000,cardIds:ids};mobile=saveReviewRun(mobile,run,article.id);mobile.readingPositions[article.id]={progress:67,offset:400,updatedAt:1000};mobile=saveReadingDraft(mobile,article,{...readingDraft(mobile,article),answers:{[article.questions[0].id]:1},activeSeconds:34});mobile=stampChanges(base,mobile,1000);
 const restored=parseBackup(exportJSON(mergeStates(base,mobile)));assert.deepEqual(savedReviewRun(restored,article.id),run);assert.equal(restored.readingPositions[article.id].progress,67);assert.equal(readingDraft(restored,article).answers[article.questions[0].id],1);assert.equal(collectedCardIds(restored,article.id).length,3);assert.deepEqual(readingSources(restored,word.id),[source]);
 const other=stampChanges(base,collectReadingWord(base,word,{...source,articleId:'article-ja-n4-map-and-walk'}),1500);const synced=mergeStates(restored,other);assert.equal(readingSources(synced,word.id).length,2);assert.deepEqual(savedReviewRun(synced,article.id),run);
});
test('a review refresh resumes the original remaining cards, including an Again submission that must not be repeated in the same run',()=>{
 let s=collected();const cards=reviewCards(s).filter(w=>collectedCardIds(s,article.id).includes(w.id));const run={id:'run-resume',language:'ja',startedAt:1000,cardIds:cards.map(w=>w.id)};s=saveReviewRun(s,run,article.id);s=applyCardRating(s,cards[0],'Again',event('first-again',2000));
 const restored=parseBackup(exportJSON(s));assert.deepEqual(unfinishedRun(restored,savedReviewRun(restored,article.id),reviewCards(restored)).map(w=>w.id),run.cardIds.slice(1));assert.ok(restored.reviews[cards[0].id].due<=Date.now());
 for(const [i,card] of cards.slice(1).entries())s=applyCardRating(s,card,'Good',event('next-'+i,3000+i));assert.equal(unfinishedRun(s,run,reviewCards(s)).length,0);assert.equal(s.reviewHistory.length,cards.length);
});
test('replayed rating is atomic/idempotent and its visible study time and review statistics are recorded before session completion',()=>{
 const base=collected();const action=event('same-operation',2000,.125);let s=applyCardRating(base,word,'Good',action);const before=structuredClone(s);s=applyCardRating(s,word,'Good',action);assert.deepEqual(s,before);assert.equal(s.sessions.length,1);assert.equal(s.sessions[0].minutes,.125);assert.equal(s.sessions[0].count,1);assert.equal(s.reviewHistory.length,1);
 const merged=mergeStates(stampChanges(base,s,2000),stampChanges(base,s,2000));assert.equal(merged.reviewHistory.length,1);assert.equal(merged.sessions.length,1);assert.equal(merged.reviews[word.id].repetitions,1);
});
test('background time is excluded from the review event, and failed recall retains source on the mistake',()=>{
 let now=0;const timer=new StudyTimer(()=>now);now=5000;timer.setVisible(false);now=365000;timer.setVisible(true);now=370000;const minutes=timer.take()/60000;assert.equal(minutes,1/6);
 const base=collected();const m=createMistake('ja','grammar',grammar.pattern,'wrong','correct',source.title);const s=applyCardRating(base,reviewCards(base).find(w=>w.id===grammar.id),'Again',{...event('background-review',2000,minutes),mistake:m});assert.equal(s.sessions[0].minutes,Math.round(minutes*60000)/60000);assert.equal(readingSources(s,'sentence-mistake-'+m.id)[0].articleId,article.id);assert.equal(s.mistakes.length,1);
});
test('review runs are separated by article, language and daily-session identity, and corrupted runs cannot resume',()=>{
 const base=collected(),run={id:'context-review',language:'ja',startedAt:1000,cardIds:[word.id]};let s=saveReviewRun(base,run,article.id);assert.equal(savedReviewRun(s),null);assert.equal(savedReviewRun({...s,profile:{...s.profile,language:'en'}},article.id),null);
 s.activeSession={language:'ja',step:0,startedAt:5000,baseline:0,completed:[],done:false};assert.equal(savedReviewRun(s,article.id),null);s.notes['review-run-5000-ja-'+article.id]='{"id":"bad", "cardIds":[null]}';assert.equal(savedReviewRun(s,article.id),null);
});
test('untrusted source metadata does not produce a navigation target or enter the collected queue',()=>{
 const s=fresh();s.notes['reading-source-card--poison']=JSON.stringify({cardId:'card',articleId:'../../secret',language:'ja',title:'bad',sentence:'x'});s.notes['reading-source-card--wrong-lang']=JSON.stringify({cardId:'card',articleId:article.id,language:'en',title:'bad',sentence:'x'});assert.deepEqual(readingSources(s,'card'),[]);assert.deepEqual(collectedCardIds(s,article.id),[]);
});
test('all supported grades now have complete grammar and reading, with linked practice and explanation',()=>{
 for(const [language,levels] of Object.entries(contentLevels))for(const level of levels){const grams=docs.filter(d=>d.kind==='grammar'&&d.language===language&&d.level===level),readings=docs.filter(d=>d.kind==='reading'&&d.language===language&&d.level===level);assert.ok(grams.length>0,language+level+' grammar');assert.ok(readings.length>0,language+level+' reading');for(const a of readings){assert.ok(a.questions.every(q=>q.explanation));assert.ok(a.grammar.every(link=>docs.some(g=>g.id===link.id&&g.kind==='grammar')))}}
});
test('unmet prerequisites choose the earliest available lesson, pin it across refresh, and never silently skip a missing prerequisite',()=>{
 const scopedCatalog=catalog.filter(e=>e.kind!=='grammar'||e.level!=='N4'||e.id==='grammar-ja-n4-nagara');let s=fresh();s.profile.level='N4';s.activeSession={language:'ja',step:1,startedAt:1000,baseline:0,completed:[],done:false};const expected='grammar-ja-n5-masu-stem';assert.equal(sessionCourse(s,'grammar',scopedCatalog).id,expected);s=pinSessionCourse(s,scopedCatalog.find(e=>e.id===expected));s.completed.push(expected);assert.equal(sessionCourse(parseBackup(exportJSON(s)),'grammar',scopedCatalog).id,expected);
 s.activeSession={...s.activeSession,startedAt:2000};assert.equal(sessionCourse(s,'grammar',scopedCatalog).id,'grammar-ja-n4-nagara');const broken=scopedCatalog.map(e=>e.id==='grammar-ja-n4-nagara'?{...e,prerequisites:['grammar-ja-missing']}:e);assert.equal(sessionCourse(s,'grammar',broken),null);
});
test('daily reading prioritises unfinished reading before linked new material; completed wrong-answer retry resumes its stable course',()=>{
 const s=fresh();s.profile.level='N2';const entries=catalog.filter(e=>e.kind==='reading'&&e.language==='ja'&&e.level==='N2');s.readingPositions[entries[0].id]={progress:67,updatedAt:1000};assert.equal(sessionCourse(s,'reading',catalog).id,entries[0].id);
 s.completed.push(article.id);s.profile.level='N5';s.readingPositions[article.id]={progress:100,updatedAt:3000};let retry=saveReadingDraft(s,article,{...readingDraft(s,article),phase:'practice',attemptId:'retry-one'});assert.equal(courseInProgress(retry,contentEntry(article)),true);assert.equal(sessionCourse(retry,'reading',catalog).id,article.id);retry=saveReadingDraft(retry,article,{...readingDraft(retry,article),phase:'complete'});assert.equal(courseInProgress(retry,contentEntry(article)),false);
});
