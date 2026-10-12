import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadDocuments} from '../scripts/content-files.mjs';
import {contentEntry,documentLength} from '../lib/content-library/schema.ts';
import {allCourseWords} from '../lib/course-library.ts';
import {initialState} from '../lib/store.ts';
import {beginCourseSession,storedCoursePlan,coursePlan,switchLearningScope} from '../lib/content-library/daily-course-plan.ts';
import {grammarDraft,saveGrammarDraft,readingDraft,saveReadingDraft} from '../lib/content-library/practice-state.ts';
import {collectReadingWord,collectReadingGrammar,readingSources,confirmReadingQuestion} from '../lib/content-library/reading-collection.ts';
import {saveReadingResult} from '../lib/content-library/learning.ts';
import {schedule} from '../lib/srs.ts';
import {exportJSON} from '../lib/export.ts';
import {parseBackup} from '../lib/backend/backup-schema.ts';

const docs=await loadDocuments(),catalog=docs.map(d=>contentEntry(d));
const pairs=[['ni-tsurete','schoolyard-temperature'],['ni-shitagatte','schoolyard-temperature'],['wo-tsuujite','photo-exhibition'],['wo-hajime','photo-exhibition'],['ni-kagirazu','photo-exhibition'],['ni-chigainai','delivery-inference'],['ni-kimatteiru','delivery-inference'],['nimo-kakawarazu','final-file'],['monodakara','final-file'],['bakari-ni','final-file']];
const grammars=pairs.map(([slug])=>docs.find(d=>d.id==='grammar-ja-n2-'+slug));
const articles=[...new Set(pairs.map(([,slug])=>'article-ja-n2-'+slug))].map(id=>docs.find(d=>d.id===id));
const cards=['ja','en'].flatMap(language=>allCourseWords(language));
const restore=s=>parseBackup(exportJSON(s));
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

test('linked N2 batch keeps all 927 vocabulary payloads and every original question identity/answer',()=>{
 assert.equal(hash(cards),'1b562788e4b02cbed1250ff8a46cf857b1ec8e6d9ceced7736ff7f52f9959314');
 const original=grammars.map(g=>({id:g.id,questions:g.exercises.slice(0,5).map(q=>Object.fromEntries(Object.entries(q).filter(([key])=>key!=='explanation')))})).sort((a,b)=>a.id.localeCompare(b.id));
 assert.equal(hash(original),'4d6b72705ee678dfec6893c40e0d060491459d410c0b070694bfbd55f8cb0c8d');
 for(const g of grammars){assert.equal(g.exercises.length,7);assert.equal(g.examples.length,4)}
 for(const a of articles){assert.ok(documentLength(a)>=500);assert.equal(a.questions.length,5);assert.equal(a.paragraphs.length,a.translation.length);assert.deepEqual([...new Set(a.questions.map(q=>q.answer))].sort(),[0,1,2]);for(const id of a.vocabulary){const word=cards.find(w=>w.id===id);assert.ok(word);assert.ok(a.paragraphs.some(p=>p.includes(word.word)))}for(const ref of a.grammar)assert.ok(a.paragraphs.some(p=>p.includes(ref.surface)))}
});

test('each reused N2 grammar selects its new linked reading and keeps pinned identity across resume and scope changes',()=>{
 for(const [slug,articleSlug] of pairs){
  const grammarID='grammar-ja-n2-'+slug;let s=structuredClone(initialState);s.profile.level='N2';s.languageProfiles.ja.level='N2';
  s.completed=docs.filter(d=>d.kind==='grammar'&&d.id!==grammarID).map(d=>d.id);
  s=beginCourseSession(s,catalog,Date.UTC(2026,9,12,12));const plan=storedCoursePlan(s);
  assert.equal(plan.grammar.id,grammarID);assert.equal(plan.reading.id,'article-ja-n2-'+articleSlug);assert.equal(plan.grammar.legacy,false);assert.match(plan.reason,/阅读包含本课语法/);
  assert.deepEqual(storedCoursePlan(beginCourseSession(restore(s),catalog.toReversed(),Date.UTC(2026,9,13,12))),plan);
  s=switchLearningScope(s,'en','B1');s=beginCourseSession(s,catalog,Date.UTC(2026,9,12,13));assert.equal(storedCoursePlan(s).language,'en');
  s=switchLearningScope(s,'ja','N2');s=beginCourseSession(restore(s),[],Date.UTC(2026,9,12,14));assert.deepEqual(storedCoursePlan(s),plan);
 }
});

test('an existing five-question draft and unfinished new reading remain restorable after additive questions',()=>{
 for(const g of grammars){const a=articles.find(a=>a.grammar.some(ref=>ref.id===g.id));let s=structuredClone(initialState);s.profile.level='N2';
 const answers=Object.fromEntries(g.exercises.slice(0,5).map(q=>[q.id,q.acceptedAnswers[0]])),checked=Object.fromEntries(g.exercises.slice(0,5).map(q=>[q.id,true]));
 s=saveGrammarDraft(s,g,{...grammarDraft(s,g),answers,checked,accepted:checked,section:'practice',questionId:g.exercises[4].id});
 const recovered=grammarDraft(restore(s),g);assert.deepEqual(recovered.answers,answers);assert.equal(recovered.questionId,g.exercises[4].id);assert.equal(recovered.checked[g.exercises[5].id],undefined);
 s.readingPositions[a.id]={progress:67,offset:420,updatedAt:1000};const q=a.questions[2];s=saveReadingDraft(s,a,{...readingDraft(s,a),attemptId:'n2-linked-resume',questionId:q.id,answers:{[q.id]:q.answer},checked:{[q.id]:true}});
 s=restore(s);assert.equal(coursePlan(s,catalog,2000).reading.id,a.id);assert.equal(s.readingPositions[a.id].offset,420);assert.equal(readingDraft(s,a).questionId,q.id);assert.equal(readingDraft(s,a).answers[q.id],q.answer);
 }
});

test('new reading collection reuses existing scheduled cards, keeps both sources and does not duplicate completed attempts or mistakes',()=>{
 for(const a of articles){const word=cards.find(w=>w.id===a.vocabulary[0]),b=docs.find(d=>d.kind==='reading'&&d.id!==a.id&&d.vocabulary.includes(word.id));let s=structuredClone(initialState);
 const source={articleId:a.id,title:a.title,sentence:a.paragraphs.find(p=>p.includes(word.word)),language:a.language};
 s.reviews[word.id]=schedule(undefined,word.id,'Good',1000);const originalSchedule=structuredClone(s.reviews[word.id]);
 s=collectReadingWord(s,word,source);s=collectReadingWord(s,word,source);assert.deepEqual(s.reviews[word.id],originalSchedule);assert.equal(readingSources(s,word.id).length,1);
 const g=grammars.find(g=>a.grammar.some(ref=>ref.id===g.id));const grammarSource={...source,sentence:a.paragraphs.find(p=>p.includes(a.grammar.find(ref=>ref.id===g.id).surface))};s=collectReadingGrammar(s,g,grammarSource);s.reviews[g.id]=schedule(s.reviews[g.id],g.id,'Good',2000);const grammarSchedule=structuredClone(s.reviews[g.id]);s=collectReadingGrammar(s,g,grammarSource);assert.deepEqual(s.reviews[g.id],grammarSchedule);assert.equal(s.completed.filter(id=>id===g.id).length,1);
 // A card may legitimately occur in a second article; keep a separate source without making a second card.
 assert.ok(b);s=collectReadingWord(s,word,{...source,articleId:b.id,title:b.title,sentence:b.paragraphs.find(p=>p.includes(word.word))});assert.equal(readingSources(s,word.id).length,2);assert.equal(Object.keys(s.dictionary).filter(id=>id===word.id).length,1);
 const q=a.questions[0];s=saveReadingDraft(s,a,{...readingDraft(s,a),attemptId:'n2-linked-mistake',answers:{[q.id]:(q.answer+1)%q.options.length}});s=confirmReadingQuestion(s,a,q.id);const once=s;assert.equal(confirmReadingQuestion(s,a,q.id),once);assert.equal(s.mistakes.length,1);
 const result={articleId:a.id,language:'ja',startedAt:1000,completedAt:3000,readingTime:120,answers:Object.fromEntries(a.questions.map(q=>[q.id,q.answer])),score:100,lookedUpWords:[word.id],savedWords:[word.id],grammarViewed:[g.id],difficulty:'right',attemptId:'n2-linked-result'};
 s=saveReadingResult(s,result);const completed=restore(s);assert.equal(saveReadingResult(completed,{...result,completedAt:4000}),completed);assert.equal(completed.completed.filter(id=>id===a.id).length,1);assert.deepEqual(completed.reviews[word.id],originalSchedule);assert.equal(completed.readingPositions[a.id].progress,100);
 }
});
