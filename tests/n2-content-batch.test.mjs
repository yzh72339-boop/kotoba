import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadDocuments} from '../scripts/content-files.mjs';
import {contentEntry} from '../lib/content-library/schema.ts';
import {allCourseWords} from '../lib/course-library.ts';
import {contextualWords} from '../lib/vocabulary-context/index.ts';
import {initialState} from '../lib/store.ts';
import {beginCourseSession,storedCoursePlan} from '../lib/content-library/daily-course-plan.ts';
import {collectReadingWord,readingSources} from '../lib/content-library/reading-collection.ts';
import {schedule} from '../lib/srs.ts';
import {exportJSON} from '../lib/export.ts';
import {parseBackup} from '../lib/backend/backup-schema.ts';

const docs=await loadDocuments(),catalog=docs.map(d=>contentEntry(d));
const grammarIds=['ni-sakidatte','shidai-immediate','shidai-de','wo-kikkake-ni'].map(s=>'grammar-ja-n2-'+s);
const readingIds=['before-the-workshop','application-after-sending','return-dependent-plan','a-handle-from-one-question'].map(s=>'article-ja-n2-'+s);
const additions=contextualWords('ja','N2').slice(20);

test('N2 batch preserves all prior Japanese word payloads and gives every added card an actual reading occurrence',()=>{
 const prior=allCourseWords('ja').filter(w=>!additions.some(a=>a.id===w.id));
 assert.equal(createHash('sha256').update(JSON.stringify(prior)).digest('hex'),'069acf5716ac0581b59d26ed74615e8da42d12490bd21443b4b7f1fe680d36ea');
 assert.equal(additions.length,40);
 for(const word of additions){
  const linked=docs.filter(d=>readingIds.includes(d.id)&&d.vocabulary.includes(word.id));
  assert.equal(linked.length,1,word.word);
  assert.ok(linked[0].paragraphs.some(p=>p.includes(word.word)));
 }
 for(const [i,id] of grammarIds.entries()){
  const grammar=docs.find(d=>d.id===id),article=docs.find(d=>d.id===readingIds[i]);
  assert.equal(grammar.examples.length,4);assert.equal(grammar.exercises.length,5);
  assert.equal(article.questions.length,5);assert.equal(article.grammar[0].id,id);
  assert.deepEqual([...new Set(article.questions.map(q=>q.answer))].sort(),[0,1,2]);
 }
});

test('new N2 topic units enter the existing pinned daily flow and collected word SRS without duplicate records',()=>{
 let s=structuredClone(initialState);s.profile.level='N2';s.languageProfiles.ja.level='N2';
 s.completed=docs.filter(d=>d.kind==='grammar'&&!grammarIds.includes(d.id)).map(d=>d.id);
 s=beginCourseSession(s,catalog,Date.UTC(2026,9,12,12));const plan=storedCoursePlan(s);
 assert.ok(grammarIds.includes(plan.grammar.id));assert.ok(readingIds.includes(plan.reading.id));
 assert.ok(docs.find(d=>d.id===plan.reading.id).grammar.some(g=>g.id===plan.grammar.id));
 assert.deepEqual(storedCoursePlan(parseBackup(exportJSON(s))),plan);
 const article=docs.find(d=>d.id===plan.reading.id),word=additions.find(w=>article.vocabulary.includes(w.id));
 const source={articleId:article.id,title:article.title,sentence:article.paragraphs.find(p=>p.includes(word.word)),language:'ja'};
 s=collectReadingWord(s,word,source);s.reviews[word.id]=schedule(undefined,word.id,'Good',Date.UTC(2026,9,12,12));
 const once=structuredClone(s);s=collectReadingWord(s,word,source);
 assert.deepEqual(s,once);assert.equal(readingSources(s,word.id).length,1);
 assert.deepEqual(parseBackup(exportJSON(s)).reviews[word.id],once.reviews[word.id]);
});
