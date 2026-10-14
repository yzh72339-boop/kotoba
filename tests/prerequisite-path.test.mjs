import {test} from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {prerequisitePath} from '../lib/content-library/prerequisite-path.ts';
import {initialState} from '../lib/store.ts';import {loadDocuments} from '../scripts/content-files.mjs';
import {contentEntry,documentLength} from '../lib/content-library/schema.ts';
import {beginCourseSession,coursePlan,pinPlannedCourse,storedCoursePlan,switchLearningScope} from '../lib/content-library/daily-course-plan.ts';
import {sessionCourse} from '../lib/content-library/session-course.ts';
import {exportJSON} from '../lib/export.ts';import {parseBackup} from '../lib/backend/backup-schema.ts';
const docs=await loadDocuments(),catalog=docs.map(d=>contentEntry(d)),batch=docs.filter(d=>d.tags.includes('v3-foundations-03'));
const target=catalog.find(e=>e.id==='grammar-ja-n4-volitional-to-omou');
test('preparation is topologically ordered and completed prerequisites do not trigger re-teaching',()=>{
 const p=prerequisitePath(target,catalog,[]);assert.deepEqual(p.lessons.map(e=>e.id),['grammar-ja-n5-masu-stem','grammar-ja-n4-volitional-form']);assert.deepEqual(p.unavailable,[]);
 const complete=prerequisitePath(target,catalog,['grammar-ja-n4-volitional-form']);assert.equal(complete.completed,1);assert.deepEqual(complete.lessons,[]);
});
test('shared dependencies appear once and foreign, missing or cyclic relations never appear ready',()=>{
 const base={...target,id:'test-target',prerequisites:['a','b']};const a={...target,id:'a',prerequisites:['c']},b={...target,id:'b',prerequisites:['c']},c={...target,id:'c',prerequisites:[]};
 assert.deepEqual(prerequisitePath(base,[a,b,c],[]).lessons.map(e=>e.id),['c','a','b']);
 for(const broken of [[a,b,{...c,language:'en'}],[a,b], [a,b,{...c,prerequisites:['a']}]]){const p=prerequisitePath(base,broken,[]);assert.ok(p.unavailable.length);assert.equal(p.lessons.length,0)}
});
test('browsing another grammar or article cannot replace the persisted daily task, even across backup and scope changes',()=>{
 let s=structuredClone(initialState);s.profile.level='N4';s.languageProfiles.ja.level='N4';s.completed=docs.filter(d=>d.kind==='grammar'&&d.level==='N5').map(d=>d.id);s=beginCourseSession(s,catalog,10000);const plan=storedCoursePlan(s);
 for(const kind of ['grammar','reading']){const assigned=plan[kind];const other=catalog.find(e=>e.kind===kind&&e.language==='ja'&&e.id!==assigned.id);assert.equal(pinPlannedCourse(s,other),s);assert.equal(sessionCourse(s,kind,catalog).id,assigned.id)}
 s=switchLearningScope(s,'en','C1');s=switchLearningScope(s,'ja','N4');s=beginCourseSession(parseBackup(exportJSON(s)),[],20000);assert.deepEqual(storedCoursePlan(s),plan);
});
test('legacy sessions without a structured plan retain the existing pin behavior',()=>{
 const s=structuredClone(initialState);s.activeSession={language:'ja',step:1,startedAt:10000,baseline:0,completed:['Review'],done:false};
 const e=catalog.find(d=>d.kind==='grammar'&&d.language==='ja');const pinned=pinPlannedCourse(s,e);assert.equal(sessionCourse(pinned,'grammar',catalog).id,e.id);
});
test('all 257 previous documents retain exact content and answer mappings',()=>{
 const baseline=JSON.parse(readFileSync(new URL('./fixtures/v31-preview-01-baseline.json',import.meta.url),'utf8'));const prior=docs.filter(d=>baseline.ids.includes(d.id));assert.equal(prior.length,257);assert.equal(createHash('sha256').update(JSON.stringify(prior)).digest('hex'),baseline.hash);
});
test('new N4 topics have four readings of examples, five explained tasks and linked original articles',()=>{
 assert.equal(batch.filter(d=>d.kind==='grammar').length,4);assert.equal(batch.filter(d=>d.kind==='reading').length,2);
 for(const g of batch.filter(d=>d.kind==='grammar')){assert.equal(g.examples.length,4);assert.ok(g.examples.every(e=>e.reading&&e.zh));assert.equal(g.exercises.length,5);assert.ok(g.prerequisites.length);assert.ok(batch.some(a=>a.kind==='reading'&&a.grammar.some(r=>r.id===g.id)));assert.deepEqual(prerequisitePath(g,catalog,[]).unavailable,[]);const s=structuredClone(initialState);s.profile.level='N4';s.completed=docs.filter(d=>d.kind==='grammar'&&d.id!==g.id).map(d=>d.id);const plan=coursePlan(s,catalog);assert.equal(plan.grammar.id,g.id);assert.ok(catalog.find(a=>a.id===plan.reading.id).grammar.includes(g.id))}
 for(const a of batch.filter(d=>d.kind==='reading')){assert.ok(documentLength(a)>=150);assert.equal(a.translation.length,a.paragraphs.length);assert.equal(a.questions.length,5);assert.ok(a.questions.every(q=>q.explanation.length>10&&q.options[q.answer]));assert.equal(a.estimatedMinutes,Math.ceil(documentLength(a)/200))}
});
