import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,minutesToday,streak} from '../lib/store.ts';
import {calendarDay,shiftDay,weekDays,sessionDay} from '../lib/study-calendar.ts';
import {reviewCards,reviewQueue,reviewOverview} from '../lib/review-queue.ts';
import {coursePack} from '../lib/course-library.ts';
import {captureWord,buildDailyPlan} from '../lib/learning-memory.ts';
import {learningStatistics,latestReading} from '../lib/learning-statistics.ts';
import {pageFromHash,pageURL} from '../lib/app-navigation.ts';
import {themePreference,resolvedTheme,withThemePreference} from '../lib/theme.ts';
import {stampChanges,mergeStates} from '../lib/sync-state.ts';
import {parseBackup} from '../lib/backend/backup-schema.ts';
import {exportJSON} from '../lib/export.ts';
import {StudyTimer} from '../lib/study-timer.ts';
import {searchVocabulary,searchHistory} from '../lib/vocabulary-search.ts';
import {parseAIResult} from '../lib/ai-response.ts';
const fresh=()=>structuredClone(initialState),now=Date.parse('2026-10-08T03:00:00Z');
const review=(id,due)=>({id,due,interval:1,ease:2.5,repetitions:1,lapses:0});

test('personal timezone determines study dates while undated legacy sessions retain their day',()=>{
 const state=fresh();state.profile.timezone='Asia/Shanghai';const at=Date.parse('2026-10-07T17:00:00Z');
 assert.equal(calendarDay(at,'Asia/Shanghai'),'2026-10-08');assert.equal(calendarDay(at,'America/New_York'),'2026-10-07');
 state.sessions=[{id:'pc',day:'2026-10-07',minutes:3,type:'Review',count:1,at},{id:'legacy',day:'2026-10-08',minutes:2,type:'Reading',count:1}];
 assert.equal(minutesToday(state,now),5);assert.equal(sessionDay(state.sessions[1],'America/New_York'),'2026-10-08');assert.doesNotThrow(()=>calendarDay(now,'not-a-timezone'));
});
test('streak and calendar weeks survive daylight saving and offline activity arriving late',()=>{
 const state=fresh();state.profile.timezone='America/New_York';
 state.sessions=[{id:'one',day:'2026-10-31',minutes:2,type:'Review',count:1,at:Date.parse('2026-10-31T16:00:00Z')},{id:'two',day:'2026-11-01',minutes:2,type:'Reading',count:1,at:Date.parse('2026-11-01T16:00:00Z')}];
 assert.equal(streak(state,Date.parse('2026-11-02T16:00:00Z')),2);
 assert.equal(shiftDay('2026-11-01',1),'2026-11-02');assert.equal(weekDays(Date.parse('2026-11-01T23:00:00Z'),'America/New_York')[0],'2026-10-26');
 state.sessions.push({...state.sessions[1],id:'retry'});assert.equal(streak(state,Date.parse('2026-11-02T16:00:00Z')),2);
});
test('changing level retains earlier learned cards and schedules known due cards before unseen cards',()=>{
 const state=fresh();state.profile.level='N2';state.languageProfiles.ja.level='N2';const old=coursePack('ja','N5').words.find(w=>!coursePack('ja','N2').words.some(v=>v.id===w.id));assert.ok(old);
 state.reviews[old.id]=review(old.id,now-86400000);const queue=reviewQueue(state,now);
 assert.equal(queue[0].id,old.id);assert.ok(reviewCards(state).some(c=>c.id===old.id));
 state.reviews[old.id].due=now+86400000;assert.ok(!reviewQueue(state,now).some(c=>c.id===old.id));assert.equal(reviewOverview(state,now).upcoming,1);
});
test('personal words, sentences and mistake practice share the same queue and plan counts',()=>{
 const state=fresh();const word=captureWord('個人の表現','ja','test','私人表达');state.dictionary[word.id]=word;
 state.sentences=[{id:'sentence-personal',language:'ja',sentence:'今日は静かです。',translation:'今天很安静。',source:'test',date:now,notes:'',vocabulary:[],grammar:[]}];
 state.mistakes=[{id:'mistake-one',language:'ja',area:'grammar',pattern:'に vs で',original:'駅に待つ',correction:'駅で待つ',source:'test',at:now,resolved:false}];
 const queue=reviewQueue(state,now);assert.ok(queue.some(c=>c.id===word.id));assert.ok(queue.some(c=>c.id==='sentence-personal'));assert.ok(queue.some(c=>c.id==='sentence-mistake-mistake-one'));
 assert.equal(queue.length,reviewOverview(state,now).ready);assert.equal(buildDailyPlan(state).reviewCount,reviewOverview(state).ready);assert.equal(new Set(queue.map(c=>c.id)).size,queue.length);
});
test('statistics separate languages, deduplicate event IDs and do not invent accuracy without reviews',()=>{
 const state=fresh();state.profile.timezone='Asia/Shanghai';state.sessions=[{id:'ja',day:'2026-10-08',minutes:3,type:'Review',count:1,language:'ja',at:now},{id:'en',day:'2026-10-08',minutes:5,type:'Review',count:1,language:'en',at:now}];state.sessions.push(state.sessions[0]);
 const event={id:'operation-one',language:'ja',cardId:'test',rating:'Good',at:now};state.reviewHistory=[event,event,{...event,id:'english',language:'en',rating:'Again'}];
 const stats=learningStatistics(state,'day',now);assert.equal(stats.minutes,3);assert.equal(stats.reviews,1);assert.equal(stats.accuracy,100);assert.equal(stats.trend.reduce((n,t)=>n+t.minutes,0),3);
 assert.equal(learningStatistics(fresh(),'day',now).accuracy,null);
});
test('new grammar learning contributes to statistics without counting the shared legacy marker twice',()=>{
 const state=fresh(),id='grammar-ja-n2-check';state.completed=[id,'ja:Grammar'];state.notes['library-card-'+id]=JSON.stringify({id,language:'ja',word:'〜に応じて',meaning:'根据',example:'状況に応じて変える。',translation:'根据情况改变。',pronunciation:'Grammar',tag:'N2'});
 assert.equal(learningStatistics(state,'week',now).grammar,1);
});
test('continue reading resolves the actual saved article and keeps legacy links separate',()=>{
 const state=fresh();state.readingPositions={'article-ja':{progress:33,updatedAt:1},'article-ja-n2-real':{progress:67,updatedAt:2}};state.notes['library-reading-meta-article-ja-n2-real']=JSON.stringify({language:'ja',title:'実際の記事'});
 assert.deepEqual(latestReading(state),{id:'article-ja-n2-real',title:'実際の記事',progress:67,legacy:false});
 state.readingPositions['article-ja-n2-real'].progress=100;assert.equal(latestReading(state).legacy,true);
});
test('deep links safely parse malformed hashes and ordinary navigation clears stale article filters',()=>{
 assert.equal(pageFromHash('#AI%20Tutor'),'AI Tutor');assert.equal(pageFromHash('#%E0'),undefined);assert.equal(pageFromHash('#not-a-page'),undefined);
 const current='https://kotoba.example/?content=article-ja-test&word=ja-word&legacy=1#Reading';const next=pageURL(current,'Today');assert.equal(next.search,'');assert.equal(next.hash,'#Today');
 const reading=pageURL(current,'Reading',{content:'article-ja-real'});assert.equal(reading.searchParams.get('content'),'article-ja-real');assert.equal(reading.searchParams.get('word'),null);assert.equal(reading.origin,'https://kotoba.example');
 assert.equal(pageURL(current,'Reading',{content:'../../escape'}).search,'');
});
test('system theme syncs as a preference while each device resolves its own appearance and backup stays compatible',()=>{
 const base=fresh();const source=stampChanges(base,withThemePreference(base,'system'),now);const device=mergeStates(base,source);
 assert.equal(themePreference(device),'system');assert.equal(resolvedTheme(device,true),'dark');assert.equal(resolvedTheme(device,false),'light');
 assert.equal(themePreference(parseBackup(exportJSON(device))),'system');assert.equal(themePreference(withThemePreference(device,'dark')),'dark');
});
test('study duration excludes background time and does not count a completed segment twice',()=>{
 let clock=0;const timer=new StudyTimer(()=>clock);clock=1000;timer.setVisible(false);clock=7201000;timer.setVisible(true);clock=7203000;assert.equal(timer.take(),3000);assert.equal(timer.take(),0);
 timer.reset(false);clock+=90000;assert.equal(timer.take(),0);timer.setVisible(true);clock+=1000;assert.equal(timer.take(),1000);
});
test('dictionary search tolerates one typo and searches readings, Chinese meanings and prefix without changing IDs',()=>{
 const word=(id,term,reading,meaning)=>({id,word:term,pronunciation:reading,meaning,example:'',translation:'',tag:'B1'});const words=[word('one','change','/tʃeɪndʒ/','改变'),word('two','余裕','よゆう','从容')];
 assert.equal(searchVocabulary(words,'cahnge')[0].id,'one');assert.equal(searchVocabulary(words,'ｃｈａｎｇｅ')[0].id,'one');assert.equal(searchVocabulary(words,'chan')[0].id,'one');assert.equal(searchVocabulary(words,'よゆう')[0].id,'two');assert.equal(searchVocabulary(words,'从容')[0].id,'two');assert.equal(searchVocabulary(words,'chxxge').length,0);
 assert.deepEqual(searchHistory('not-json'),[]);assert.deepEqual(searchHistory('["change",12,null]'),['change']);
});
test('untrusted AI responses require bounded structured content before being persisted',()=>{
 assert.deepEqual(parseAIResult({answer:'解释',unexpected:'ignored'}),{answer:'解释'});assert.throws(()=>parseAIResult({answer:''}));assert.throws(()=>parseAIResult({answer:'x'.repeat(16001)}));assert.throws(()=>parseAIResult({answer:'ok',mistakes:[{area:'unknown',pattern:'',original:'',correction:''}]}));
});

test('English reading history never picks a Japanese article whose topic contains en',()=>{
 const state=fresh();state.profile.language='en';state.readingPositions['article-ja-environment']={progress:67,updatedAt:now};state.notes['library-reading-meta-article-ja-environment']=JSON.stringify({language:'ja',title:'環境'});
 assert.equal(latestReading(state),null);assert.equal(learningStatistics(state,'week',now).readingCompleted,0);
});

test('backup restoration preserves vocabulary senses, collocations and source metadata',()=>{
 const state=fresh();const word={...captureWord('substantial','en','Reading','大量的'),pos:'adjective',senses:['大量的','实质性的'],collocations:['substantial evidence'],synonyms:['considerable'],antonyms:['minor'],topics:['work'],frequency:'medium',register:'formal',sourceRef:'My article',usageNote:'注意语境。'};
 state.dictionary[word.id]=word;const restored=parseBackup(exportJSON(state));assert.deepEqual(restored.dictionary[word.id],word);
});
