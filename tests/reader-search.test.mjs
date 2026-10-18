import {test} from 'node:test';
import assert from 'node:assert/strict';
import {searchReaderVocabulary,readerVocabularyRows} from '../lib/adapters/reader-vocabulary.ts';
import {japaneseSearchKeys} from '../lib/adapters/kana.ts';
import {analyzeEnglish} from '../lib/adapters/english-core.ts';
import {readerSegments} from '../lib/adapters/reader-language.ts';
const word=(id,term,pronunciation)=>({id,word:term,pronunciation,meaning:'释义',example:'Example.',translation:'例句',tag:'Catalog'});
test('article search uses lazy real WanaKana aliases while preserving the matched private ID',async()=>{
 const w=word('private-original','読む','よむ'),paragraph='本を読んでいます。';
 const rows=[{word:w,occurrences:[{paragraphIndex:0,start:2,end:4,surface:'読ん'}]}];const before=structuredClone(rows);
 assert.equal(searchReaderVocabulary(rows,'yomu').length,0);
 const result=searchReaderVocabulary(rows,'yomu',await japaneseSearchKeys('yomu'));
 assert.deepEqual(result.map(row=>row.word.id),['private-original']);assert.equal(result[0],rows[0]);assert.deepEqual(rows,before);
 assert.equal(paragraph.slice(result[0].occurrences[0].start,result[0].occurrences[0].end),'読ん');
 assert.equal(searchReaderVocabulary([], 'yomu',await japaneseSearchKeys('yomu')).length,0);
});
test('real wink source forms find original headwords without analyzing or inventing query lemmas',()=>{
 const paragraphs=['They went home. She was reading books.'],go=word('original-go','go','ɡəʊ'),read=word('original-read','read','riːd');
 const words=[go,read],parts=paragraphs.map(p=>readerSegments(p,'en',words,[],analyzeEnglish(p)));
 const rows=readerVocabularyRows(paragraphs,parts,words);assert.equal(rows.length,2);
 assert.deepEqual(searchReaderVocabulary(rows,'went').map(r=>r.word.id),['original-go']);
 assert.deepEqual(searchReaderVocabulary(rows,'READING').map(r=>r.word.id),['original-read']);
 assert.equal(searchReaderVocabulary(rows,'walked').length,0);
 assert.equal(searchReaderVocabulary(rows,'goes').length,0);
});
test('reader search remains scoped, unique and empty-safe; homographic noun reading is not forced to read',()=>{
 const go=word('same-id','go','ɡəʊ'),rows=[{word:go,occurrences:[{paragraphIndex:0,start:0,end:2,surface:'go'},{paragraphIndex:1,start:0,end:2,surface:'go'}]}];
 assert.equal(searchReaderVocabulary(rows,'go').length,1);assert.equal(searchReaderVocabulary(rows,'').length,1);
 assert.equal(searchReaderVocabulary([], 'went').length,0);assert.equal(searchReaderVocabulary(rows,'a'.repeat(101)).length,0);
 const p='two hours of reading',read=word('read','read','riːd');
 const segments=readerSegments(p,'en',[read],[],analyzeEnglish(p));assert.equal(readerVocabularyRows([p],[segments],[read]).length,0);
});
