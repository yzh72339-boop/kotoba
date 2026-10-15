import {test} from 'node:test';import assert from 'node:assert/strict';
import {readerVocabularyRows,readerParagraphSource} from '../lib/adapters/reader-vocabulary.ts';
import {readerSegments,readerLexicon,readerLearningSummary} from '../lib/adapters/reader-language.ts';
import {analyzeEnglish} from '../lib/adapters/english-core.ts';
import {allCourseWords} from '../lib/course-library.ts';import {initialState} from '../lib/store.ts';
import {collectReadingWord,readingSources,readingSourceSnapshot} from '../lib/content-library/reading-collection.ts';
import {prepareMaterial,putMaterial,removeMaterial,snapshotById} from '../lib/personal-materials.ts';
import {parseBackup} from '../lib/backend/backup-schema.ts';import {exportJSON} from '../lib/export.ts';
const words=allCourseWords('en'),go=words.find(w=>w.word==='go'),read=words.find(w=>w.word==='read');
test('real morphology indexes changed forms and their exact paragraphs without inventing cards',()=>{
 const paragraphs=['They went home.','I go home; they went too. Unknownz.'];const parts=paragraphs.map(p=>readerSegments(p,'en',[go],[],analyzeEnglish(p)));
 const rows=readerVocabularyRows(paragraphs,parts,[go]);assert.equal(rows.length,1);assert.equal(rows[0].word.id,go.id);assert.deepEqual(rows[0].occurrences.map(p=>[p.surface,p.paragraphIndex]),[['went',0],['go',1],['went',1]]);
 const first=rows[0].occurrences[0];assert.equal(paragraphs[first.paragraphIndex].slice(first.start,first.end),first.surface);
 const nouns='two hours of reading';assert.equal(readerVocabularyRows([nouns],[readerSegments(nouns,'en',[read],[],analyzeEnglish(nouns))],[read]).length,0);
});
test('index omits unknown IDs, clipped or duplicated matches and grammar overlaps',()=>{
 const text='go home',base={start:0,end:2,surface:'go',wordId:go.id};const rows=readerVocabularyRows([text],[[base,base,{...base,start:1},{...base,wordId:'not-in-lexicon'},{...base,wordId:read.id,grammarId:'grammar-priority'},{...base,end:99}]],[go,read]);assert.equal(rows.length,1);assert.equal(rows[0].occurrences.length,1);
 assert.deepEqual(readerVocabularyRows([],[[base]],[go]),[]);
});
test('personal lexicon keeps collected IDs and actual review states for matching original text',()=>{
 const custom={...go,id:'personal-original-go'};const catalog=readerLexicon([],[custom,go]);assert.equal(catalog[0].id,custom.id);assert.equal(catalog.length,1);
 const rows=readerVocabularyRows(['went'],[readerSegments('went','en',catalog,[],analyzeEnglish('went'))],catalog);assert.equal(rows[0].word.id,custom.id);
 const s=structuredClone(initialState);assert.deepEqual(readerLearningSummary(s,rows.map(r=>r.word.id)),{new:1,learning:0,reviewed:0,marked:0});
 s.reviews[custom.id]={id:custom.id,due:123,interval:4,ease:2.5,repetitions:1,lapses:0};assert.equal(readerLearningSummary(s,[custom.id]).reviewed,1);s.notes['library-known-'+custom.id]='1';assert.equal(readerLearningSummary(s,[custom.id]).marked,1);
});
test('personal word source preserves original snapshot, paragraph, schedule and first encounter through edit/delete/backup',async()=>{
 const prepared=await prepareMaterial({title:'The original notes',language:'en',level:null,source:'Notebook',text:'They went home.\n\nI read a book.'});let s=putMaterial(structuredClone(initialState),prepared);
 const source=readerParagraphSource({id:prepared.material.id,title:prepared.material.title,paragraphs:['They went home.','I read a book.']},'en',0,{snapshotId:prepared.snapshot.id,version:1,paragraphIds:prepared.snapshot.paragraphs.map(p=>p.id)});
 assert.equal(source.sentence,'They went home.');assert.equal(source.paragraphId,prepared.snapshot.paragraphs[0].id);
 s.reviews[go.id]={id:go.id,due:123456,interval:7,ease:2.5,repetitions:3,lapses:1};const schedule=structuredClone(s.reviews[go.id]);s=collectReadingWord(collectReadingWord(s,go,source),go,source);
 const edited=await prepareMaterial({title:'Edited',language:'en',level:null,source:'Notebook',text:'Different text.'},prepared.material);s=removeMaterial(putMaterial(s,edited),prepared.material.id);s=parseBackup(exportJSON(s));
 const retained=readingSourceSnapshot(s,prepared.material.id,prepared.snapshot.id);assert.equal(retained.title,prepared.material.title);assert.equal(retained.sentence,source.sentence);assert.equal(snapshotById(s,retained.snapshotId).text,prepared.snapshot.text);assert.deepEqual(s.reviews[go.id],schedule);assert.equal(readingSources(s,go.id).length,1);assert.equal(Object.keys(s.dictionary).length,1);
 assert.equal(readingSourceSnapshot(initialState,prepared.material.id,prepared.snapshot.id),null);
});
test('legacy sources retain their format, invalid context and paragraph indices do not create invented source anchors',()=>{
 const article={id:'article-en-source',title:'Source',paragraphs:['go home']};assert.deepEqual(readerParagraphSource(article,'en',0),{articleId:article.id,title:article.title,sentence:'go home',language:'en'});
 assert.equal(readerParagraphSource(article,'en',2),null);assert.equal(readerParagraphSource(article,'en',0.5),null);
 const source=readerParagraphSource(article,'en',0,{snapshotId:'bad',version:0,paragraphIds:['bad']});assert.ok(!source.snapshotId);let s=collectReadingWord(structuredClone(initialState),go,source);s.notes['reading-source-fake--'+article.id]=JSON.stringify({...source,cardId:'wrong',snapshotId:'snapshot-fixture',paragraphId:'p-'+'a'.repeat(32),version:1});assert.equal(readingSourceSnapshot(s,article.id,'snapshot-fixture'),null);
});
test('Japanese fragment fences and grammar ownership survive the index',()=>{
 const book={...go,id:'ja-book',word:'本',pronunciation:'ほん'};const text='日本の本を読む。';const rows=readerVocabularyRows([text],[readerSegments(text,'ja',[book],[{id:'grammar-read',surface:'読む'}])],[book]);assert.deepEqual(rows.map(r=>r.occurrences.map(p=>p.surface)),[['本']]);
});
