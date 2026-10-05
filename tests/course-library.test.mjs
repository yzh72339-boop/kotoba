import {test} from 'node:test';
import assert from 'node:assert/strict';
import {coursePack,levels,allCourseWords} from '../lib/course-library.ts';
import {supplementalWords} from '../lib/vocabulary-supplement.ts';
import {expandedCoreWords} from '../lib/vocabulary-core-expansion.ts';
import {completionWords} from '../lib/vocabulary-level-completion.ts';
import {canonicalVocabulary,lexiconMeta} from '../lib/lexicon.ts';

for(const language of ['ja','en']){
 test(`${language} has usable content at every level`,()=>{
  for(const level of levels[language]){
   const pack=coursePack(language,level);
   assert.equal(pack.level,level);
   assert.ok(pack.words.length>=50,`${level} vocabulary`);
   assert.ok(new Set(pack.words.map(w=>w.word.toLowerCase())).size>=50,`${level} unique vocabulary`);
   assert.ok(pack.grammars.length>=1,`${level} grammar`);
   assert.ok(pack.readings.length>=1,`${level} reading`);
   assert.ok(pack.episodes.length>=1,`${level} listening`);
   for(const word of pack.words)for(const key of ['word','pronunciation','meaning','example','translation'])assert.ok(word[key],`${level} ${word.id} ${key}`);
   for(const lesson of pack.grammars)assert.ok(lesson.answer>=0&&lesson.answer<lesson.options.length);
   for(const article of pack.readings){assert.equal(article.paragraphs.length,article.translations.length);assert.ok(article.answer>=0&&article.answer<article.options.length)}
   for(const episode of pack.episodes)assert.ok(episode.lines.every(line=>line.text&&line.translation));
  }
  const ids=allCourseWords(language).map(word=>word.id);
  assert.equal(new Set(ids).size,ids.length,'word IDs must remain unique across levels');
 });
}

test('supplement keeps existing card IDs and adds distinct, complete vocabulary',()=>{
 for(const language of ['ja','en'])for(const level of levels[language]){
  const added=supplementalWords(language,level);
  if((language==='ja'&&level==='N3')||(language==='en'&&level==='B1')){assert.equal(added.length,0);continue}
  assert.equal(added.length,16,`${level} supplement size`);
  const pack=coursePack(language,level);
  assert.equal(pack.words[0].id,`course-${language}-${level.toLowerCase()}-1`);
  const newWords=new Set();
  for(const word of added){
   assert.ok(word.pronunciation&&word.meaning&&word.example&&word.translation);
   assert.ok(word.example.length>word.word.length,`${word.id} contextual example`);
   const key=word.word.toLowerCase();
   assert.ok(!newWords.has(key),`${level} duplicate supplement word: ${key}`);
   newWords.add(key);
  }
  const base=pack.words.filter(word=>!word.id.startsWith('supp-')).map(word=>word.word.toLowerCase());
  for(const word of newWords)assert.ok(!base.includes(word),`${level} supplement duplicates an existing word: ${word}`);
 }
});


test('V2.5.1 core vocabulary expansion is complete, stable and non-duplicating',()=>{
 for(const language of ['ja','en'])for(const level of levels[language]){
  const added=expandedCoreWords(language,level);
  assert.equal(added.length,10,`${level} core expansion size`);
  const ids=new Set();
  const words=new Set();
  for(const word of added){
   for(const key of ['id','word','pronunciation','meaning','example','translation','tag','related'])assert.ok(word[key],`${level} ${word.id} ${key}`);
   assert.ok(word.id.startsWith(`lex-${language}-${level.toLowerCase()}-`),`${word.id} stable semantic id`);
   assert.ok(!ids.has(word.id),`${level} duplicate expansion id: ${word.id}`);
   ids.add(word.id);
   const key=word.word.toLowerCase();
   assert.ok(!words.has(key),`${level} duplicate expansion word: ${key}`);
   words.add(key);
  }
  const full=coursePack(language,level).words;
  const base=full.filter(word=>!word.id.startsWith('lex-')).map(word=>word.word.toLowerCase());
  for(const word of words)assert.ok(!base.includes(word),`${level} expansion duplicates existing word: ${word}`);
  assert.ok(full.length>=38,`${level} should expose at least 38 vocabulary cards after expansion`);
 }
});


test('V2.5.2 level completion reaches a balanced 50+ unique-word floor',()=>{
 for(const language of ['ja','en'])for(const level of levels[language]){
  const added=completionWords(language,level);
  for(const word of added){
   for(const key of ['id','word','pronunciation','meaning','example','translation','tag','related','pos','senses','collocations','frequency','register','sourceRef'])assert.ok(word[key],`${level} ${word.id} ${key}`);
   assert.ok(word.id.startsWith(`complete-${language}-${level.toLowerCase()}-`));
  }
  const pack=coursePack(language,level).words;
  assert.ok(new Set(pack.map(w=>w.word.toLowerCase())).size>=50,`${level} unique floor`);
 }
});

test('normalized lexicon metadata is complete for every course word',()=>{
 for(const language of ['ja','en']){
  const words=allCourseWords(language);
  const canonical=canonicalVocabulary(words);
  assert.ok(canonical.length>0);
  for(const word of canonical){
   const meta=lexiconMeta(word);
   assert.ok(meta.level&&meta.partOfSpeech&&meta.senses.length&&meta.frequency&&meta.register&&meta.source,word.id);
  }
 }
});
