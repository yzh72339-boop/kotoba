import {preservedVocabulary} from './helpers/preserved-vocabulary.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {loadDocuments} from '../scripts/content-files.mjs';
import {contentEntry,documentLength} from '../lib/content-library/schema.ts';
import {allCourseWords} from '../lib/course-library.ts';
import {initialState} from '../lib/store.ts';
import {coursePlan,beginCourseSession,storedCoursePlan,switchLearningScope} from '../lib/content-library/daily-course-plan.ts';
import {readingDraft,saveReadingDraft,grammarDraft,saveGrammarDraft} from '../lib/content-library/practice-state.ts';
import {collectReadingWord,readingSources} from '../lib/content-library/reading-collection.ts';
import {learnGrammar} from '../lib/content-library/learning.ts';
import {wordOccursInText} from '../lib/vocabulary-occurrence.ts';
import {parseBackup} from '../lib/backend/backup-schema.ts';
import {exportJSON} from '../lib/export.ts';
const docs=await loadDocuments();
const batch=docs.filter(d=>d.tags.includes('v3-context-05'));
const grammars=batch.filter(d=>d.kind==='grammar'),readings=batch.filter(d=>d.kind==='reading');
const restore=s=>parseBackup(exportJSON(s));

test('context05 preserves all 268 prior course payloads and 927 word IDs and payloads',()=>{
 const frozen=JSON.parse(readFileSync(new URL('./fixtures/v3-preview-06-baseline.json',import.meta.url),'utf8'));
 const prior=docs.filter(d=>frozen.ids.includes(d.id));assert.equal(prior.length,268);assert.equal(prior.length,frozen.count);
 assert.equal(createHash('sha256').update(JSON.stringify(prior)).digest('hex'),frozen.hash);
 const words=preservedVocabulary();assert.equal(words.length,frozen.vocabularyCount);
 assert.equal(createHash('sha256').update(JSON.stringify(words)).digest('hex'),frozen.vocabularyHash);
});

test('six distinct N3/B2 topics and three readers form explained, source-grounded units',()=>{
 assert.equal(grammars.length,6);assert.equal(readings.length,3);
 assert.equal(grammars.filter(g=>g.level==='N3').length,4);assert.equal(grammars.filter(g=>g.level==='B2').length,2);
 assert.equal(new Set(grammars.map(g=>g.pattern)).size,6);
 for(const g of grammars){assert.equal(g.examples.length,4);assert.equal(g.exercises.length,5);assert.ok(g.explanation.length>=40&&g.commonMistakes.length&&g.prerequisites.length&&g.comparison.length);assert.ok(readings.some(a=>a.language===g.language&&a.level===g.level&&a.grammar.some(r=>r.id===g.id)));
  const positions=g.exercises.filter(q=>q.options).map(q=>q.options.indexOf(q.acceptedAnswers[0]));assert.deepEqual([...new Set(positions)].sort(),[0,1,2]);for(const q of g.exercises)assert.ok(q.explanation.length>=12);
 }
 for(const a of readings){const length=documentLength(a);assert.ok(a.language==='ja'?length>=300&&length<=700:length>=400&&length<=800);assert.equal(a.questions.length,5);assert.equal(a.paragraphs.length,a.translation.length);assert.deepEqual([...new Set(a.questions.map(q=>q.answer))].sort(),[0,1,2]);assert.ok(a.questions.some(q=>q.type==='inference')&&a.questions.some(q=>q.type==='author-intent'));
  for(const r of a.grammar)assert.ok(a.paragraphs.some(p=>p.includes(r.surface)));for(const id of a.vocabulary){const word=allCourseWords(a.language).find(w=>w.id===id);assert.ok(word);assert.ok(a.paragraphs.some(p=>wordOccursInText(p,word.word,a.language)))}
  assert.equal(a.estimatedMinutes,Math.ceil(length/(a.language==='ja'?200:160)));
 }
});

test('N3 and B2 actual course pins and frozen answers restore across language switch and catalog reorder',()=>{
 const catalog=docs.map(d=>contentEntry(d));
 for(const g of grammars){let s=structuredClone(initialState);s.profile.language=g.language;s.profile.level=g.level;s.languageProfiles[g.language].level=g.level;s.completed=docs.filter(d=>d.kind==='grammar'&&d.id!==g.id).map(d=>d.id);
  const plan=coursePlan(s,catalog);assert.equal(plan.grammar.id,g.id);assert.ok(readings.some(a=>a.id===plan.reading.id&&a.grammar.some(r=>r.id===g.id)));
  s=beginCourseSession(s,catalog,10000);const pinned=storedCoursePlan(s);
  const other=g.language==='ja'?'en':'ja',otherLevel=other==='ja'?'N2':'B1';s=beginCourseSession(switchLearningScope(s,other,otherLevel),catalog,20000);
  s=beginCourseSession(switchLearningScope(restore(s),g.language,g.level),catalog.toReversed(),30000);assert.deepEqual(storedCoursePlan(s),pinned);
  const e=g.exercises[0];s=saveGrammarDraft(s,g,{...grammarDraft(s,g),section:'practice',questionId:e.id,answers:{[e.id]:e.acceptedAnswers[0]},checked:{[e.id]:true},accepted:{[e.id]:true}});
  assert.equal(grammarDraft(restore(s),g).answers[e.id],e.acceptedAnswers[0]);
  const a=readings.find(a=>a.id===pinned.reading.id),q=a.questions[2];s=saveReadingDraft(s,a,{...readingDraft(s,a),attemptId:'frozen-context05',questionId:q.id,answers:{[q.id]:q.answer},checked:{[q.id]:true}});
  assert.equal(readingDraft(restore(s),a).answers[q.id],q.answer);
 }
});

test('collections and course completion remain duplicate-safe in both languages with existing SRS due dates',()=>{
 for(const a of readings){let s=structuredClone(initialState);const word=allCourseWords(a.language).find(w=>w.id===a.vocabulary[0]);s.reviews[word.id]={id:word.id,due:123456,interval:7,ease:2.5,repetitions:3,lapses:1};const due=structuredClone(s.reviews[word.id]);
  const source={articleId:a.id,title:a.title,sentence:a.paragraphs.find(p=>wordOccursInText(p,word.word,a.language)),language:a.language};s=collectReadingWord(collectReadingWord(s,word,source),word,source);
  assert.deepEqual(restore(s).reviews[word.id],due);assert.equal(readingSources(s,word.id).length,1);
  const g=grammars.find(g=>a.grammar.some(r=>r.id===g.id));s=learnGrammar(s,g);const review=structuredClone(s.reviews[g.id]);s=learnGrammar(s,g);
  assert.deepEqual(s.reviews[g.id],review);assert.equal(s.completed.filter(id=>id===g.id).length,1);
 }
});
