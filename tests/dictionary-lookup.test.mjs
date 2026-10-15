import {test} from 'node:test';import assert from 'node:assert/strict';
import {japaneseSearchKeys} from '../lib/adapters/kana.ts';
import {englishSearchKeys,isEnglishLookup,lookupScope} from '../lib/adapters/dictionary-lookup.ts';
import {analyzeEnglish} from '../lib/adapters/english-core.ts';
import {searchVocabulary} from '../lib/vocabulary-search.ts';
import {learningSignals} from '../lib/lexicon.ts';
import {allCourseWords} from '../lib/course-library.ts';import {initialState} from '../lib/store.ts';
import {collectReadingWord} from '../lib/content-library/reading-collection.ts';
import {parseBackup} from '../lib/backend/backup-schema.ts';import {exportJSON} from '../lib/export.ts';
const words=allCourseWords('ja'),english=allCourseWords('en');
test('real kana conversion finds course headwords from romanization, katakana and half-width input',async()=>{
 for(const query of ['gakkou','ガッコウ','ｶﾞｯｺｳ']){
  const keys=await japaneseSearchKeys(query);const found=searchVocabulary(words,query,keys);
  assert.ok(found.some(w=>w.word==='学校'));
 }
 assert.deepEqual(await japaneseSearchKeys('x'.repeat(101)),[]);assert.deepEqual(await japaneseSearchKeys(''),[]);
});
test('literal exact match outranks kana aliases; alias prefixes do not replace original dictionary IDs',()=>{
 const base=words.find(w=>w.word==='学校');const literal={...base,id:'literal',word:'gakkou',pronunciation:''};
 const result=searchVocabulary([base,literal],'gakkou',['がっこう','ガッコウ']);assert.equal(result[0].id,'literal');assert.equal(result[1].id,base.id);
 assert.equal(searchVocabulary([base],'gak',['がっ'])[0].id,base.id);
});
test('actual wink model supplies irregular lookup lemmas but preserves noun ambiguity and token boundaries',()=>{
 for(const [query,expected] of [['went','go'],['children','child'],['studied','study']]){
  const keys=englishSearchKeys(query,analyzeEnglish(query));assert.deepEqual(keys,[expected]);
  const actual=english.find(w=>w.word===expected);if(actual)assert.ok(searchVocabulary(english,query,keys,true).some(w=>w.id===actual.id));
 }
 assert.deepEqual(englishSearchKeys('reading',analyzeEnglish('reading')),[]);
 assert.deepEqual(englishSearchKeys(' went ',[{surface:'went',lemma:'go',pos:'VERB',start:1,end:5}]),[]);
 assert.deepEqual(englishSearchKeys('went home',analyzeEnglish('went home')),[]);
 assert.equal(isEnglishLookup('two words'),false);assert.equal(isEnglishLookup('a'.repeat(101)),false);
});
test('English lemma matching is exact and does not add unrelated prefixes',()=>{
 const base=english.find(w=>w.word==='go'),other={...base,id:'unrelated',word:'government',meaning:'治理',example:'',translation:''};
 assert.deepEqual(searchVocabulary([base,other],'went',['go'],true).map(w=>w.id),[base.id]);
});
test('lookup generations are scoped by user, language and raw query',()=>{
 const a=lookupScope('user-a','ja','学校');assert.notEqual(a,lookupScope('user-b','ja','学校'));assert.notEqual(a,lookupScope('user-a','en','学校'));assert.notEqual(a,lookupScope('user-a','ja','gakkou'));assert.notEqual(a,lookupScope(null,'ja','学校'));
});
test('learning evidence uses real same-language records and lexical boundaries, not substring guesses',()=>{
 const s=structuredClone(initialState),word=english.find(w=>w.word==='read');
 s.speakingHistory=[{id:'a',language:'en',text:'I read books.',feedback:'',at:1},{id:'b',language:'en',text:'already',feedback:'',at:2},{id:'c',language:'ja',text:'read',feedback:'',at:3}];
 s.sentences=[{id:'s',language:'en',sentence:'I read.',vocabulary:[],grammar:[],source:'fixture',translation:'阅读',date:1,notes:''}];
 const result=learningSignals(word,s,'en');assert.equal(result.speakingEvidence,1);assert.equal(result.sentenceEvidence,1);assert.equal(result.activeEvidence,2);assert.equal(result.stage,'new');assert.ok(!('passiveMastery' in result));
 const han={...word,id:'han',word:'本',pronunciation:'ほん'};s.speakingHistory=[{id:'d',language:'ja',text:'日本の本',feedback:'',at:4}];assert.equal(learningSignals(han,s,'ja').speakingEvidence,1);
});
test('truthful review state, latest event and sources survive backup without mutating schedules or manual knowledge',()=>{
 let s=structuredClone(initialState);const word=english.find(w=>w.word==='read');const source={articleId:'article-en-fixture',title:'A reader',sentence:'I read books.',language:'en'};
 s=collectReadingWord(collectReadingWord(s,word,source),word,source);s.reviews[word.id]={id:word.id,due:123456,interval:7,ease:2.5,repetitions:3,lapses:2};
 s.reviewHistory=[{id:'later',cardId:word.id,language:'en',at:200,rating:'Good'},{id:'earlier',cardId:word.id,language:'en',at:100,rating:'Good'},{id:'other',cardId:word.id,language:'ja',at:300,rating:'Good'}];s.notes['library-known-'+word.id]='1';
 s=parseBackup(exportJSON(s));const before=structuredClone(s),result=learningSignals(word,s,'en');
 assert.equal(result.reviewCount,2);assert.equal(result.lastReviewed,200);assert.equal(result.stage,'reviewed3');assert.equal(result.nextDue,123456);assert.equal(result.readingEvidence,1);assert.equal(result.manuallyKnown,true);assert.deepEqual(s,before);
 s.reviews[word.id].repetitions=0;assert.equal(learningSignals(word,s,'en').stage,'relearning');assert.equal(learningSignals(word,initialState,'en').reviewCount,0);
});
