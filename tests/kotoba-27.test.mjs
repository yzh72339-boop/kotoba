import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {allCourseWords,levels} from '../lib/course-library.ts';
import {contextualWords} from '../lib/vocabulary-context/index.ts';
import {wordOccursInText,vocabularyOccurrences} from '../lib/vocabulary-occurrence.ts';
import {initialState} from '../lib/store.ts';
import {loadDocuments} from '../scripts/content-files.mjs';
import {contentEntry} from '../lib/content-library/schema.ts';
import {beginCourseSession,storedCoursePlan,saveSessionProgress,switchLearningScope,finishCoreStep} from '../lib/content-library/daily-course-plan.ts';
import {todayCourseProgress} from '../lib/content-library/today-progress.ts';
import {collectReadingWord,readingSources} from '../lib/content-library/reading-collection.ts';
import {schedule} from '../lib/srs.ts';
const documents=await loadDocuments(),catalog=documents.map(d=>contentEntry(d));

test('2.7 keeps every original word payload and ID, with 20 distinct additions per grade',()=>{
 const expected={ja:'c478339dc8e5d39171e0163b8c60039ea89c10d485af7fddb289e5a6188e3194',en:'985076baa2a1f2608fb920d34ac076aaea30ead76c7b49ce83f7554403345b66'};
 for(const language of ['ja','en']){
  const words=allCourseWords(language),old=words.filter(w=>!w.id.startsWith('context-'));
  assert.equal(createHash('sha256').update(JSON.stringify(old)).digest('hex'),expected[language]);
  const seen=new Set(old.map(w=>w.word.normalize('NFKC').toLowerCase()));
  for(const level of levels[language])for(const w of contextualWords(language,level)){
   assert.equal(contextualWords(language,level).length,20);assert.ok(!seen.has(w.word.normalize('NFKC').toLowerCase()),w.word);seen.add(w.word.normalize('NFKC').toLowerCase());
   for(const key of ['pronunciation','meaning','example','translation','pos'])assert.ok(w[key]);
   assert.ok(w.collocations.length>0);
  }
 }
 assert.equal(allCourseWords('ja').length+allCourseWords('en').length,887);
});
test('English reading references match whole words and phrases, preserving Unicode offsets',()=>{
 assert.equal(wordOccursInText('already growing','read','en'),false);
 assert.equal(wordOccursInText('already growing','go','en'),false);
 assert.equal(wordOccursInText('a tacit agreement','tacit','en'),true);
 assert.equal(wordOccursInText('An air of authority.','air of authority','en'),true);
 assert.deepEqual(vocabularyOccurrences('日本、Read it.','read','en'),[{start:3,end:7}]);
 assert.equal(wordOccursInText('readé','read','en'),false);
 assert.equal(wordOccursInText('C++ is a language','C++','en'),true);
 assert.equal(wordOccursInText('机の上に鍵があります。','鍵','ja'),true);
});
test('new course chain links actual prerequisite grammar to a complete reading',()=>{
 let s=structuredClone(initialState);s.profile.level='N2';s.languageProfiles.ja.level='N2';
 s=beginCourseSession(s,catalog);const p=storedCoursePlan(s);
 assert.equal(p.grammar.id,'grammar-ja-n5-nai-form');
 assert.equal(p.reading.id,'article-ja-n5-study-morning');
 assert.ok(documents.find(d=>d.id===p.reading.id).grammar.some(g=>g.id===p.grammar.id));
 assert.equal(p.grammar.legacy,false);assert.equal(p.reading.legacy,false);
});
test('switching language and grade parks the exact plan and restores stable course IDs',()=>{
 let s=beginCourseSession(structuredClone(initialState),catalog);const pinned=storedCoursePlan(s),started=s.activeSession.startedAt;
 s=switchLearningScope(s,'en','C1');s=beginCourseSession(s,catalog,started+1);assert.equal(storedCoursePlan(s).language,'en');
 s=switchLearningScope(s,'ja','N3');s=beginCourseSession(s,catalog,started+2);
 assert.equal(s.activeSession.startedAt,started);assert.deepEqual(storedCoursePlan(s),pinned);
});
test('completed active sessions from yesterday do not show a completed today',()=>{
 const now=Date.UTC(2026,9,9,12);let s=beginCourseSession(structuredClone(initialState),catalog,now-48*3600000);
 s=saveSessionProgress(s,{...s.activeSession,step:2,completed:['Review','Grammar','Reading'],done:true});
 assert.equal(todayCourseProgress(s,now).completed,0);assert.equal(todayCourseProgress(s,now).session,null);
});
test('new vocabulary collection retries preserve the card, schedule and first source',()=>{
 const article=documents.find(d=>d.kind==='reading'&&d.vocabulary.some(id=>id.startsWith('context-en-c1-')));
 const word=allCourseWords('en').find(w=>article.vocabulary.includes(w.id)&&w.id.startsWith('context-'));
 const source={articleId:article.id,title:article.title,sentence:article.paragraphs[0],language:'en'};
 let s=collectReadingWord(structuredClone(initialState),word,source);s.reviews[word.id]=schedule(undefined,word.id,'Good',Date.now());const review=s.reviews[word.id];
 const once=structuredClone(s.dictionary[word.id]);s=collectReadingWord(s,word,source);
 assert.deepEqual(s.dictionary[word.id],once);assert.deepEqual(s.reviews[word.id],review);
 assert.equal(s.saved.filter(id=>id===word.id).length,1);assert.equal(readingSources(s,word.id).length,1);
});
test('repeated daily completion never advances or completes a different pinned course',()=>{
 let s=beginCourseSession(structuredClone(initialState),catalog);s.activeSession.step=1;const p=storedCoursePlan(s);
 assert.equal(finishCoreStep(s,'Grammar','grammar-ja-n5-unrelated'),s);
 s=finishCoreStep(s,'Grammar',p.grammar.id);const once=s;
 assert.equal(finishCoreStep(s,'Grammar',p.grammar.id),once);assert.equal(s.activeSession.completed.filter(x=>x==='Grammar').length,1);
});
test('all 2.7 reading links are literal, and every supported grade remains qualified',()=>{
 for(const language of ['ja','en'])for(const level of levels[language]){
  const g=documents.filter(d=>d.kind==='grammar'&&d.language===language&&d.level===level);
  const r=documents.filter(d=>d.kind==='reading'&&d.language===language&&d.level===level);
  assert.ok(g.length>=10&&r.length>=5);
  assert.ok(g.every(d=>d.examples.length>=4&&d.exercises.length>=5));
  for(const d of r){assert.ok(d.questions.length>=5);assert.equal(d.translation.length,d.paragraphs.length);for(const id of d.vocabulary){const w=allCourseWords(language).find(w=>w.id===id);assert.ok(w&&wordOccursInText(d.paragraphs.join('\n'),w.word,language),id)}}
 }
});
