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
const docs=await loadDocuments(),all=['ja','en'].flatMap(allCourseWords),japaneseIds=new Set(allCourseWords('ja').map(w=>w.id));
const batch=docs.filter(d=>d.tags.includes('v3-vocabulary-10')),grammars=batch.filter(d=>d.kind==='grammar'),readings=batch.filter(d=>d.kind==='reading');
const restore=s=>parseBackup(exportJSON(s)),hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const prior=JSON.parse(readFileSync(new URL('./fixtures/v3-preview-11-baseline.json',import.meta.url),'utf8'));

test('context10 preserves 310 prior courses and every original 975 vocabulary payload and ID',()=>{
 const protectedDocs=docs.filter(d=>prior.ids.includes(d.id)),protectedWords=all.filter(w=>prior.vocabularyIds.includes(w.id));
 assert.equal(protectedDocs.length,310);assert.equal(hash(protectedDocs),prior.hash);assert.equal(protectedWords.length,975);assert.equal(hash(protectedWords),prior.vocabularyHash);
});

test('N3 and N1 units contain distinct topics, 4 examples, 5 explained exercises and level-appropriate readers',()=>{
 assert.equal(grammars.length,4);assert.equal(readings.length,2);assert.equal(new Set(grammars.map(g=>g.pattern)).size,4);
 for(const level of ['N3','N1']){assert.equal(grammars.filter(g=>g.level===level).length,2);assert.equal(readings.filter(a=>a.level===level).length,1)}
 for(const g of grammars){assert.equal(g.examples.length,4);assert.ok(g.examples.every(e=>e.reading&&/^[ぁ-ゖー、。！？・\s]+$/.test(e.reading)));assert.equal(g.exercises.length,5);assert.ok(g.commonMistakes.length&&g.comparison.length&&g.prerequisites.length);assert.ok(readings.some(a=>a.level===g.level&&a.grammar.some(r=>r.id===g.id)));
  assert.deepEqual([...new Set(g.exercises.filter(q=>q.options).map(q=>q.options.indexOf(q.acceptedAnswers[0])))].sort(),[0,1,2]);for(const q of g.exercises)assert.ok(q.explanation.length>=12);
 }
 for(const a of readings){const length=documentLength(a);assert.ok(a.level==='N3'?length>=300&&length<=700:length>=800&&length<=2000);assert.equal(a.estimatedMinutes,Math.ceil(length/200));assert.equal(a.questions.length,5);assert.equal(a.paragraphs.length,a.translation.length);assert.deepEqual([...new Set(a.questions.map(q=>q.answer))].sort(),[0,1,2]);assert.ok(a.questions.some(q=>q.type==='inference')&&a.questions.some(q=>q.type==='author-intent'));
  for(const ref of a.grammar)assert.ok(a.paragraphs.some(p=>p.includes(ref.surface)));for(const id of a.vocabulary){const w=all.find(w=>w.id===id);assert.ok(w&&japaneseIds.has(w.id));assert.ok(a.paragraphs.some(p=>wordOccursInText(p,w.word,'ja')))}
 }
});

test('actual N3/N1 daily course IDs and answer mappings restore after level switch, language switch and catalog reorder',()=>{
 const catalog=docs.map(d=>contentEntry(d));
 for(const g of grammars){let s=structuredClone(initialState);s.profile.language='ja';s.profile.level=g.level;s.languageProfiles.ja.level=g.level;s.completed=docs.filter(d=>d.kind==='grammar'&&d.id!==g.id).map(d=>d.id);
  const plan=coursePlan(s,catalog);assert.equal(plan.grammar.id,g.id);assert.ok(readings.some(a=>a.id===plan.reading.id&&a.grammar.some(r=>r.id===g.id)));
  s=beginCourseSession(s,catalog,10000);const pinned=storedCoursePlan(s);
  s=beginCourseSession(switchLearningScope(s,'ja',g.level==='N3'?'N1':'N3'),catalog,20000);s=beginCourseSession(switchLearningScope(s,'en','B1'),catalog,30000);
  s=beginCourseSession(switchLearningScope(restore(s),'ja',g.level),catalog.toReversed(),40000);assert.deepEqual(storedCoursePlan(s),pinned);
  const e=g.exercises[1];s=saveGrammarDraft(s,g,{...grammarDraft(s,g),section:'practice',questionId:e.id,answers:{[e.id]:e.acceptedAnswers[0]},checked:{[e.id]:true},accepted:{[e.id]:true}});assert.equal(grammarDraft(restore(s),g).answers[e.id],e.options[e.options.indexOf(e.acceptedAnswers[0])]);
  const a=readings.find(a=>a.id===pinned.reading.id),q=a.questions[2];s=saveReadingDraft(s,a,{...readingDraft(s,a),attemptId:'frozen-context10',questionId:q.id,answers:{[q.id]:q.answer},checked:{[q.id]:true}});assert.equal(readingDraft(restore(s),a).answers[q.id],q.answer);
 }
});

test('new source word collection and course completion stay idempotent and preserve old SRS dates',()=>{
 for(const a of readings){let s=structuredClone(initialState);const word=all.find(w=>w.id===a.vocabulary[0]);s.reviews[word.id]={id:word.id,due:123456,interval:7,ease:2.5,repetitions:3,lapses:1};const before=structuredClone(s.reviews[word.id]);const source={articleId:a.id,title:a.title,sentence:a.paragraphs.find(p=>wordOccursInText(p,word.word,'ja')),language:'ja'};
  s=collectReadingWord(collectReadingWord(s,word,source),word,source);assert.deepEqual(restore(s).reviews[word.id],before);assert.equal(readingSources(s,word.id).length,1);assert.equal(readingSources(s,word.id)[0].sentence,source.sentence);
  const g=grammars.find(g=>a.grammar.some(r=>r.id===g.id));s=learnGrammar(s,g);const scheduled=structuredClone(s.reviews[g.id]);s=learnGrammar(s,g);assert.deepEqual(s.reviews[g.id],scheduled);assert.equal(s.completed.filter(id=>id===g.id).length,1);
 }
});

test('24 complete globally new context cards have frozen payloads and literal article occurrences',()=>{
 const frozen=JSON.parse(readFileSync(new URL('./fixtures/context10-vocabulary-baseline.json',import.meta.url),'utf8')),added=all.filter(w=>w.sourceRef==='Kotoba 3.1 original vocabulary batch10');assert.equal(added.length,24);assert.equal(new Set(all.map(w=>w.id)).size,all.length);assert.equal(hash(all.filter(w=>frozen.ids.includes(w.id))),frozen.hash);
 const old=all.filter(w=>prior.vocabularyIds.includes(w.id));assert.equal(old.length+added.length,999);
 for(const a of readings){const linked=added.filter(w=>a.vocabulary.includes(w.id));assert.equal(linked.length,12);for(const w of linked){assert.ok(w.pronunciation&&w.meaning&&w.example.includes(w.word)&&w.translation&&w.pos&&w.senses.length&&w.collocations.length);assert.ok(w.tag.startsWith(a.level));assert.ok(a.paragraphs.some(p=>wordOccursInText(p,w.word,'ja')));assert.ok(!old.some(o=>japaneseIds.has(o.id)&&o.word.toLowerCase()===w.word.toLowerCase()))}}
});
