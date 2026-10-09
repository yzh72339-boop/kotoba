import {writeFile} from 'node:fs/promises';
import {loadDocuments} from './content-files.mjs';
import {documentLength,contentLevels} from '../lib/content-library/schema.ts';
import {allCourseWords,coursePack} from '../lib/course-library.ts';
import {wordOccursInText} from '../lib/vocabulary-occurrence.ts';
const targets={ja:{grammar:[70,100,150,180,180],reading:[50,60,70,60,50]},en:{grammar:[60,80,100,120,120,100],reading:[40,50,60,60,50,40]}};
const minimum={ja:[80,150,300,500,800],en:[80,150,250,400,600,800]};
const issues=[],warnings=[];const answerPositions={grammar:{},reading:{}};let documents=[];
try{documents=await loadDocuments()}catch(error){issues.push(error.message)}
const ids=new Set(),signatures=new Map(),grammarIds=new Set(documents.filter(d=>d.kind==='grammar').map(d=>d.id));
const vocab=Object.fromEntries(['ja','en'].map(lang=>[lang,new Map(allCourseWords(lang).map(w=>[w.id,w]))]));
for(const lang of ['ja','en'])for(const level of contentLevels[lang])for(const g of coursePack(lang,level).grammars)grammarIds.add(g.id);
const grammarLanguages=new Map(documents.filter(d=>d.kind==='grammar').map(d=>[d.id,d.language]));for(const language of ['ja','en'])for(const level of contentLevels[language])for(const g of coursePack(language,level).grammars)grammarLanguages.set(g.id,language);
for(const d of documents){
 if(ids.has(d.id))issues.push(`${d.id}: duplicate ID`);ids.add(d.id);
 const signature=d.kind==='grammar'?`${d.language}:${d.pattern.replace(/[\s〜～]/g,'').toLowerCase()}`:`${d.language}:${d.paragraphs.join('').replace(/\s/g,'').toLowerCase()}`;
 if(signatures.has(signature))issues.push(`${d.id}: duplicate content of ${signatures.get(signature)}`);signatures.set(signature,d.id);
 if(/\b(?:lorem ipsum|TODO|TBD|placeholder)\b/i.test(JSON.stringify(d)))issues.push(`${d.id}: placeholder text`);
 const questions=d.kind==='grammar'?d.exercises:d.questions;const questionIds=new Set();const prompts=new Set();for(const q of questions){if(questionIds.has(q.id))issues.push(`${d.id}: duplicate exercise/question ID ${q.id}`);questionIds.add(q.id);if(prompts.has(q.prompt))issues.push(`${d.id}: duplicate prompt ${q.id}`);prompts.add(q.prompt);if(q.options){if(new Set(q.options).size!==q.options.length)issues.push(`${d.id}: duplicate options ${q.id}`);const answer=d.kind==='grammar'?q.options.indexOf(q.acceptedAnswers[0]):q.answer;answerPositions[d.kind][answer]=(answerPositions[d.kind][answer]??0)+1}}
 if(questions.length<5)warnings.push(`${d.id}: only ${questions.length} exercises/questions; 2.6 qualification requires 5`);
 if(d.kind==='grammar'){
  for(const ref of [...d.prerequisites,...d.relatedGrammar,...d.comparison.map(c=>c.grammarId)])if(!grammarIds.has(ref)||grammarLanguages.get(ref)!==d.language||ref===d.id)issues.push(`${d.id}: invalid grammar relation ${ref}`);
 }else{
  for(const ref of d.vocabulary)if(!vocab[d.language].has(ref))issues.push(`${d.id}: unknown vocabulary ${ref}`);
  for(const g of d.grammar){if(!grammarIds.has(g.id)||grammarLanguages.get(g.id)!==d.language)issues.push(`${d.id}: unknown grammar ${g.id}`);if(!d.paragraphs.some(p=>p.includes(g.surface)))issues.push(`${d.id}: grammar surface missing: ${g.surface}`)}
  for(const ref of d.vocabulary){const word=vocab[d.language].get(ref);if(word&&!d.paragraphs.some(p=>wordOccursInText(p,word.word,d.language)))issues.push(`${d.id}: linked word absent: ${word.word}`)}
  const length=documentLength(d),floor=minimum[d.language][contentLevels[d.language].indexOf(d.level)];if(length<floor)warnings.push(`${d.id}: length ${length}, expected at least ${floor}`);
 }
}
const readings=documents.filter(d=>d.kind==='reading');const shingles=d=>{const t=d.paragraphs.join('').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');return new Set(Array.from({length:Math.max(0,t.length-3)},(_,i)=>t.slice(i,i+4)))};const fingerprints=new Map(readings.map(d=>[d.id,shingles(d)]));for(let i=0;i<readings.length;i++)for(let j=i+1;j<readings.length;j++){const a=readings[i],b=readings[j];if(a.language!==b.language)continue;const x=fingerprints.get(a.id),y=fingerprints.get(b.id);const shared=[...x].filter(t=>y.has(t)).length;if(shared/(x.size+y.size-shared)>.9)issues.push(`${a.id}: near-duplicate reading of ${b.id}`)}
const graph=new Map(documents.filter(d=>d.kind==='grammar').map(d=>[d.id,d.prerequisites]));const visiting=new Set(),visited=new Set();
function visit(id){if(visiting.has(id)){issues.push(`Prerequisite cycle: ${id}`);return}if(visited.has(id))return;visiting.add(id);for(const child of graph.get(id)??[])visit(child);visiting.delete(id);visited.add(id)}for(const id of graph.keys())visit(id);
const linkedGrammar=new Set(readings.flatMap(d=>d.grammar.map(g=>g.id)));const unlinked=documents.filter(d=>d.kind==='grammar'&&!linkedGrammar.has(d.id));
const lines=['# CONTENT AUDIT','','Counts include only schema-validated V3 lessons. Legacy lessons remain available but are not counted as complete V3 material.','','| Language | Level | Grammar / target | Reading / target | Examples | Reading length min–max | 2.6 qualified grammar / minimum | 2.6 qualified reading / minimum |','|---|---|---:|---:|---:|---|---:|---:|'];let remaining=0,stageRemaining=0;
for(const lang of ['ja','en'])for(const [i,level] of contentLevels[lang].entries()){
 const g=documents.filter(d=>d.kind==='grammar'&&d.language===lang&&d.level===level),r=documents.filter(d=>d.kind==='reading'&&d.language===lang&&d.level===level),lengths=r.map(documentLength);
 const qualifiedG=g.filter(d=>d.exercises.length>=5),qualifiedR=r.filter(d=>d.questions.length>=5&&documentLength(d)>=minimum[lang][i]);const stageG=lang==='ja'&&level==='N2'?50:10,stageR=lang==='ja'&&level==='N2'?10:5;stageRemaining+=Math.max(0,stageG-qualifiedG.length)+Math.max(0,stageR-qualifiedR.length);
 const gt=targets[lang].grammar[i],rt=targets[lang].reading[i];remaining+=Math.max(0,gt-qualifiedG.length)+Math.max(0,rt-qualifiedR.length);
 lines.push(`| ${lang} | ${level} | ${g.length} / ${gt} | ${r.length} / ${rt} | ${g.reduce((sum,d)=>sum+d.examples.length,0)} | ${lengths.length?`${Math.min(...lengths)}–${Math.max(...lengths)}`:'—'} | ${qualifiedG.length} / ${stageG} | ${qualifiedR.length} / ${stageR} |`);
}
lines.push('',`2.6 stage status: **${stageRemaining?'NOT MET':'MET'}**. Remaining stage units: ${stageRemaining}.`,`Correct-option position distribution (zero-based): ${JSON.stringify(answerPositions)}. Frozen option ordering is preserved in the compiled documents.`, '',`Target status: **${remaining?'NOT MET':'MET'}**. Remaining units: ${remaining}.`,`Quality errors: ${issues.length}. Length warnings: ${warnings.length}.`,'',`Grammar with explicit reading links: ${documents.filter(d=>d.kind==='grammar').length-unlinked.length}. Unlinked grammar: ${unlinked.length} (follow-up association work, including existing N2 lessons and conjugation foundations).`, '','## Errors',...(issues.length?issues.map(x=>`- ${x}`):['None.']),'','## Length warnings',...(warnings.length?warnings.map(x=>`- ${x}`):['None.']),'','Automated checks cannot certify naturalness, factual accuracy, or pedagogy. Human content review is still necessary.');
await writeFile('CONTENT-AUDIT.md',lines.join('\n')+'\n');
console.log(`Content audit: ${documents.length} units; ${issues.length} errors; ${warnings.length} length warnings; ${remaining} units below full targets; ${stageRemaining} units below 2.6 stage.`);
if(issues.length||(process.argv.includes('--require-stage')&&(stageRemaining||warnings.length))||(process.argv.includes('--require-targets')&&(remaining||warnings.length)))process.exitCode=1;
