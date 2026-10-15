import type {Word,Language} from '../content';
import type {AppState} from '../store';
import type {EnglishToken} from './english-core';
import type {JapaneseToken} from './japanese-types';
import {vocabularyOccurrences} from '../vocabulary-occurrence';
export type ReaderSegment={start:number;end:number;wordId?:string;grammarId?:string;surface:string;lemma?:string;pos?:string;reading?:string|null};
// Linked course IDs win; adding annotation never replaces a saved/SRS card identity.
export function readerLexicon(linked:Word[],catalog:Word[]){const seen=new Set<string>();return [...linked,...catalog].filter(w=>{const key=w.word.normalize('NFKC').toLowerCase();if(seen.has(key))return false;seen.add(key);return true})}
export function readerSegments(text:string,language:Language,words:Word[],grammar:{id:string;surface:string}[],tokens:EnglishToken[]=[],japanese:JapaneseToken[]=[]):ReaderSegment[]{
 const matches:(ReaderSegment&{priority:number})[]=[];
 for(const g of grammar)for(const p of vocabularyOccurrences(text,g.surface,language))matches.push({...p,grammarId:g.id,surface:text.slice(p.start,p.end),priority:0});
 for(const w of words)for(const p of vocabularyOccurrences(text,w.word,language)){
  // Catalog substring matching is not Japanese morphological segmentation.
  // Never treat 本 inside 日本/本当 or 人 inside 二人 as that standalone word.
  const han=/[\p{Script=Han}]/u;
  if(language==='ja'&&(han.test(w.word[0])&&han.test(text[p.start-1]??'')||han.test(w.word.at(-1)??'')&&han.test(text[p.end]??'')))continue;
  matches.push({...p,wordId:w.id,surface:text.slice(p.start,p.end),priority:1});
 }
 if(language==='en'){
  const lemmas=new Map(words.map(w=>[w.word.toLowerCase(),w]));
  for(const t of tokens){const w=lemmas.get(t.lemma.toLowerCase());if(w&&t.start>=0&&t.end<=text.length&&text.slice(t.start,t.end)===t.surface&&!['PUNCT','SPACE','SYM'].includes(t.pos))matches.push({...t,wordId:w.id,priority:2})}
 }
 if(language==='ja'){
  const lemmas=new Map(words.map(w=>[w.word,w]));
  for(const t of japanese)if(t.start>=0&&t.end<=text.length&&t.start<t.end&&text.slice(t.start,t.end)===t.surface)matches.push({...t,wordId:lemmas.get(t.lemma)?.id,priority:2});
 }
 // Grammar, exact phrases, then lemma matches; each original character stays once.
 const accepted:ReaderSegment[]=[];
 for(const m of matches.sort((a,b)=>a.priority-b.priority||(b.end-b.start)-(a.end-a.start)||a.start-b.start))if(!accepted.some(p=>m.start<p.end&&m.end>p.start))accepted.push(m);
 const result:ReaderSegment[]=[];let cursor=0;
 for(const m of accepted.sort((a,b)=>a.start-b.start)){if(m.start>cursor)result.push({start:cursor,end:m.start,surface:text.slice(cursor,m.start)});result.push(m);cursor=m.end}
 if(cursor<text.length)result.push({start:cursor,end:text.length,surface:text.slice(cursor)});return result;
}
export function readerWordStatus(state:AppState,id:string):'marked'|'reviewed'|'learning'|'new'{return state.notes['library-known-'+id]?'marked':(state.reviews[id]?.repetitions??0)>0?'reviewed':state.reviews[id]||state.dictionary[id]?'learning':'new'}
export function readerLearningSummary(state:AppState,ids:string[]){const result={marked:0,reviewed:0,learning:0,new:0};for(const id of new Set(ids))result[readerWordStatus(state,id)]++;return result}
const ambiguousCatalogForms=new Set(['生','上','下','中','方','日','月','今日','明日','一日','二日','十分','間','角','人気']);
export function catalogReading(word:Word,catalog:Word[]=[]){if(ambiguousCatalogForms.has(word.word)||new Set(catalog.filter(w=>w.word===word.word).map(w=>w.pronunciation)).size>1)return null;return /[\p{Script=Han}]/u.test(word.word)&&/^[\p{Script=Hiragana}\p{Script=Katakana}ー\s]+$/u.test(word.pronunciation)?word.pronunciation:null}
