import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadDocuments} from '../scripts/content-files.mjs';
import {contentEntry,documentLength} from '../lib/content-library/schema.ts';
import {initialState} from '../lib/store.ts';
import {allCourseWords} from '../lib/course-library.ts';
import {beginCourseSession,storedCoursePlan,switchLearningScope} from '../lib/content-library/daily-course-plan.ts';
import {readingDraft,saveReadingDraft,grammarDraft,saveGrammarDraft} from '../lib/content-library/practice-state.ts';
import {collectReadingGrammar,collectReadingWord,confirmReadingQuestion,readingSources} from '../lib/content-library/reading-collection.ts';
import {saveReadingResult} from '../lib/content-library/learning.ts';
import {schedule} from '../lib/srs.ts';
import {exportJSON} from '../lib/export.ts';
import {parseBackup} from '../lib/backend/backup-schema.ts';
const docs=await loadDocuments(),catalog=docs.map(d=>contentEntry(d)),restore=s=>parseBackup(exportJSON(s));
const slugs=['ni-shitewa','wari-ni','kara-to-itte','mono-nara','you-mono-nara','ka-to-omouto','tsutsu-aru','ni-atatte','ni-hanshite','nai-koto-wa-nai'];
const newGrammar=slugs.map(s=>'grammar-ja-n2-'+s).concat(['grammar-ja-n1-ni-taenai','grammar-ja-n1-tomo-arou']);
const newReading=['rain-room','closing-bookshop','folding-chair','repair-notebook'].map(s=>'article-ja-n2-'+s).concat('article-ja-n1-apology-record');
const oldUnlinked=['zaru-wo-enai','hoka-nai','dokoroka','dokoro-dewanai','zu-niwa-irarenai','ue-ni','ni-hoka-naranai','kkonai','kotonaku'].map(s=>'grammar-ja-n2-'+s).concat('grammar-ja-n1-kagiri-da');
const articles=docs.filter(d=>newReading.includes(d.id));
test('V3 batch preserves all prior 224 course payloads, vocabulary and original answer mappings',()=>{
 const prior=docs.filter(d=>![...newGrammar,...newReading].includes(d.id));assert.equal(prior.length,224);
 assert.equal(createHash('sha256').update(JSON.stringify(prior)).digest('hex'),'6e8d9fbf233e33c40b9f5c9f01a43085c28f56804764aa1dcfc0c609b7599835');
 const words=['ja','en'].flatMap(allCourseWords);assert.equal(words.length,927);assert.equal(createHash('sha256').update(JSON.stringify(words)).digest('hex'),'1b562788e4b02cbed1250ff8a46cf857b1ec8e6d9ceced7736ff7f52f9959314');
});
test('new courses have full teaching content and every prior grammar now has a real linked reading',()=>{
 for(const id of newGrammar){const g=docs.find(d=>d.id===id);assert.equal(g.examples.length,4);assert.equal(g.exercises.length,5);assert.ok(g.explanation.length>=40);assert.ok(g.commonMistakes.length);assert.ok(g.comparison.length);assert.ok(g.prerequisites.length)}
 for(const g of docs.filter(d=>d.kind==='grammar'))assert.ok(docs.some(a=>a.kind==='reading'&&a.grammar.some(ref=>ref.id===g.id)),g.id);
 for(const a of articles){assert.ok(documentLength(a)>=(a.level==='N1'?800:500));assert.equal(a.questions.length,5);assert.equal(a.paragraphs.length,a.translation.length);assert.deepEqual([...new Set(a.questions.map(q=>q.answer))].sort(),[0,1,2]);assert.ok(a.vocabulary.length>=3)}
 assert.equal(new Set(articles.map(a=>a.questions.map(q=>q.answer).join(','))).size,5);
});
test('each newly linked or new course pins its actual reading and restores identity after pause, scope switch and catalog reordering',()=>{
 for(const id of [...oldUnlinked,...newGrammar]){
  const g=docs.find(d=>d.id===id);let s=structuredClone(initialState);s.profile.level=g.level;s.languageProfiles.ja.level=g.level;s.completed=docs.filter(d=>d.kind==='grammar'&&d.id!==id).map(d=>d.id);
  s=beginCourseSession(s,catalog,Date.UTC(2026,9,14,12));const plan=storedCoursePlan(s);assert.equal(plan.grammar.id,id);assert.equal(plan.reading.legacy,false);assert.ok(articles.some(a=>a.id===plan.reading.id&&a.grammar.some(ref=>ref.id===id)));
  assert.deepEqual(storedCoursePlan(beginCourseSession(restore(s),catalog.toReversed(),Date.UTC(2026,9,15,12))),plan);
  s=switchLearningScope(s,'en','B1');s=beginCourseSession(s,catalog,Date.UTC(2026,9,14,13));s=switchLearningScope(s,'ja',g.level);s=beginCourseSession(restore(s),[],Date.UTC(2026,9,14,14));assert.deepEqual(storedCoursePlan(s),plan);
 }
});
test('fixed answers, confirmed feedback and reading anchors restore without remapping the options',()=>{
 for(const a of articles){let s=structuredClone(initialState);const q=a.questions[2];s=saveReadingDraft(s,a,{...readingDraft(s,a),attemptId:'v3-fixed-order',questionId:q.id,answers:{[q.id]:q.answer},checked:{[q.id]:true}});s.readingPositions[a.id]={progress:61,offset:380,updatedAt:1000};s=restore(s);assert.equal(readingDraft(s,a).answers[q.id],q.answer);assert.equal(readingDraft(s,a).checked[q.id],true);assert.equal(s.readingPositions[a.id].offset,380);assert.equal(a.questions[2].options[readingDraft(s,a).answers[q.id]],q.options[q.answer])}
 for(const id of newGrammar){const g=docs.find(d=>d.id===id),q=g.exercises[0];let s=structuredClone(initialState);s=saveGrammarDraft(s,g,{...grammarDraft(s,g),answers:{[q.id]:q.acceptedAnswers[0]},checked:{[q.id]:true},accepted:{[q.id]:true},questionId:q.id,section:'practice'});assert.equal(grammarDraft(restore(s),g).answers[q.id],q.acceptedAnswers[0])}
});
test('new article collection and duplicate mistake/completion preserve existing SRS schedule and one source per article',()=>{
 const words=allCourseWords('ja');
 for(const a of articles){const word=words.find(w=>w.id===a.vocabulary[0]),g=docs.find(d=>d.id===a.grammar[0].id);let s=structuredClone(initialState);s.reviews[word.id]=schedule(undefined,word.id,'Good',1000);const before=structuredClone(s.reviews[word.id]);const source={articleId:a.id,title:a.title,sentence:a.paragraphs.find(p=>p.includes(a.grammar[0].surface)),language:a.language};s=collectReadingWord(s,word,{...source,sentence:a.paragraphs.find(p=>p.includes(word.word))});s=collectReadingWord(s,word,source);assert.deepEqual(s.reviews[word.id],before);assert.equal(readingSources(s,word.id).length,1);s=collectReadingGrammar(s,g,source);s=collectReadingGrammar(s,g,source);assert.equal(readingSources(s,g.id).length,1);assert.equal(s.completed.filter(id=>id===g.id).length,1);
  const q=a.questions[0];s=saveReadingDraft(s,a,{...readingDraft(s,a),attemptId:'v3-mistake',answers:{[q.id]:(q.answer+1)%q.options.length}});s=confirmReadingQuestion(s,a,q.id);assert.equal(confirmReadingQuestion(s,a,q.id),s);assert.equal(s.mistakes.length,1);
  const result={articleId:a.id,language:a.language,startedAt:1000,completedAt:3000,readingTime:120,answers:Object.fromEntries(a.questions.map(q=>[q.id,q.answer])),score:100,lookedUpWords:[],savedWords:[word.id],grammarViewed:[g.id],difficulty:'right',attemptId:'v3-result'};s=saveReadingResult(s,result);s=restore(s);assert.equal(saveReadingResult(s,{...result,completedAt:4000}),s);assert.equal(s.completed.filter(id=>id===a.id).length,1);assert.deepEqual(s.reviews[word.id],before);
 }
});
