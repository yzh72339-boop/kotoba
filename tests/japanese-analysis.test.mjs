import {test} from 'node:test';import assert from 'node:assert/strict';
import {resolve} from 'node:path';import {readFileSync} from 'node:fs';
import {createJapaneseAnalyzer} from '../lib/adapters/japanese-core.ts';
import {japaneseTokens,japaneseRubyPieces,validateJapaneseParagraphs} from '../lib/adapters/japanese-types.ts';
import {readerSegments,readerWordStatus} from '../lib/adapters/reader-language.ts';
import {allCourseWords} from '../lib/course-library.ts';
import {collectReadingWord,readingSources} from '../lib/content-library/reading-collection.ts';
import {initialState} from '../lib/store.ts';import {exportJSON} from '../lib/export.ts';import {parseBackup} from '../lib/backend/backup-schema.ts';
const analyze=await createJapaneseAnalyzer(resolve('node_modules/kuromoji/dict'));
test('actual Kuroshiro/Kuromoji gives contextual readings and inflected dictionary forms',async()=>{
 const [tokens]=await analyze(['図書館で本を読んでいます。先生は寿司を食べました。']);
 for(const [surface,lemma,reading] of [['図書館','図書館','としょかん'],['読ん','読む','よん'],['先生','先生','せんせい'],['食べ','食べる','たべ']])assert.deepEqual(tokens.filter(t=>t.surface===surface).map(t=>[t.lemma,t.reading]),[[lemma,reading]]);
});
test('surrogates, whitespace, punctuation and markup preserve original offsets and plaintext',async()=>{
 const text='😀  図書館\n「本」を読んでいます。<script>alert(1)</script>𠮷';const [tokens]=await analyze([text]);
 for(const t of tokens)assert.equal(text.slice(t.start,t.end),t.surface);
 const parts=readerSegments(text,'ja',[],[],[],tokens);assert.equal(parts.map(p=>p.surface).join(''),text);assert.equal(tokens.find(t=>t.surface==='𠮷')?.reading,null);
});
test('unrecognized dictionary entries and invalid readings are not invented',()=>{
 const tokens=japaneseTokens('未知名 書', [{surface_form:'未知名',reading:'ミチメイ',verbose:{word_type:'UNKNOWN'}},{surface_form:'書',reading:'<img>',verbose:{word_type:'KNOWN'}}],s=>s);
 assert.deepEqual(tokens.map(t=>t.reading),[null,null]);assert.deepEqual(japaneseTokens('A',[{surface_form:'not-in-source'}],s=>s),[]);
 assert.throws(()=>validateJapaneseParagraphs(['x'.repeat(10001)]));assert.throws(()=>validateJapaneseParagraphs(Array(101).fill('')));assert.throws(()=>validateJapaneseParagraphs(Array(4).fill('x'.repeat(10000))));
});
test('morphology reuses stable course IDs; grammar priority and changed-form readings stay intact',async()=>{
 const word=allCourseWords('ja').find(w=>w.word==='読む');assert.ok(word);
 const text='本を読んでいます。';const [tokens]=await analyze([text]);const segments=readerSegments(text,'ja',[word],[],[],tokens);
 const part=segments.find(p=>p.surface==='読ん');assert.equal(part.wordId,word.id);assert.equal(part.reading,'よん');assert.equal(part.lemma,'読む');assert.equal(segments.map(p=>p.surface).join(''),text);
 const grammar=readerSegments(text,'ja',[word],[{id:'kept-grammar',surface:'読んでいます'}],[],tokens);assert.equal(grammar.find(p=>p.grammarId)?.surface,'読んでいます');
});
test('collecting a changed form is idempotent, retains schedule/source, backup and account isolation',()=>{
 const word=allCourseWords('ja').find(w=>w.word==='読む');let state=structuredClone(initialState);state.reviews[word.id]={id:word.id,due:1234567890,interval:7,ease:2.5,repetitions:3,lapses:1};
 const schedule=structuredClone(state.reviews[word.id]);const source={articleId:'article-ja-n4-library-reading',title:'図書館',sentence:'本を読んでいます。',language:'ja'};
 state=collectReadingWord(collectReadingWord(state,word,source),word,source);state=parseBackup(exportJSON(state));assert.deepEqual(state.reviews[word.id],schedule);assert.equal(readingSources(state,word.id).length,1);assert.equal(readingSources(state,word.id)[0].sentence,source.sentence);assert.equal(state.dictionary[word.id].word,'読む');assert.equal(readerWordStatus(initialState,word.id),'new');
});
test('optional dictionary cache routes never cache user responses; worker remains outside precache',()=>{
 const sw=readFileSync('public/sw.js','utf8');assert.match(sw,/language\/kuromoji-0\.1\.2\/dict/);assert.match(sw,/LANGUAGE_ASSETS/);
 const build=readFileSync('scripts/finalize-pwa.mjs','utf8');assert.ok(build.includes("bytes.includes('kuroshiro-kuromoji-1.1.0')"));assert.ok(!sw.match(/const PRECACHE=\[[^\]]*kuromoji/));
});
test('personal sentence annotations preserve source, boundaries and clipped-token safety',async()=>{
 const text='😀 私は本を読みます。先生は寿司を食べました。';const [tokens]=await analyze([text]);const start=text.indexOf('先生'),sentence=text.slice(start);
 const pieces=japaneseRubyPieces(sentence,start,tokens);assert.equal(pieces.map(p=>p.surface).join(''),sentence);assert.equal(pieces.find(p=>p.surface==='先生').reading,'せんせい');
 assert.deepEqual(japaneseRubyPieces('生',start+1,tokens),[{surface:'生'}]);
});
