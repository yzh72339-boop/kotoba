import type {Word,Language} from '../content';
import type {ReaderSegment} from './reader-language';
import type {ReadingSource} from '../content-library/reading-collection';
import {searchVocabulary} from '../vocabulary-search';
export type ReaderOccurrence={paragraphIndex:number;start:number;end:number;surface:string;lemma?:string};
export type ReaderVocabularyRow={word:Word;occurrences:ReaderOccurrence[]};
export type ReaderSnapshot={snapshotId:string;version:number;paragraphIds:string[]};
/** Search only the already matched article rows, including their actual source forms.
 * Kana aliases come from the existing lazy WanaKana adapter; no new cards or guessed lemmas. */
export function searchReaderVocabulary(rows:ReaderVocabularyRow[],query:string,aliases:string[]=[]):ReaderVocabularyRow[]{
 const normalized=query.normalize('NFKC').trim().toLowerCase();if(normalized.length>100)return [];
 const byId=new Map(rows.map(row=>[row.word.id,row]));
 const direct=searchVocabulary(rows.map(row=>row.word),query,aliases).map(word=>byId.get(word.id)!);
 if(!normalized)return direct;
 const found=new Set(direct.map(row=>row.word.id));
 return [...direct,...rows.filter(row=>!found.has(row.word.id)&&row.occurrences.some(occurrence=>occurrence.surface.normalize('NFKC').toLowerCase().includes(normalized)))];
}
// Index only real, source-aligned matches; retain the matched card's original ID.
export function readerVocabularyRows(paragraphs:string[],segments:ReaderSegment[][],words:Word[]):ReaderVocabularyRow[]{
 const catalog=new Map(words.map(word=>[word.id,word])),rows=new Map<string,ReaderVocabularyRow>();
 segments.forEach((parts,paragraphIndex)=>{const text=paragraphs[paragraphIndex];if(typeof text!=='string')return;
  for(const part of parts){const word=part.wordId?catalog.get(part.wordId):undefined;if(!word||part.grammarId||!Number.isInteger(part.start)||!Number.isInteger(part.end)||part.start<0||part.end<=part.start||part.end>text.length||text.slice(part.start,part.end)!==part.surface)continue;
   const row=rows.get(word.id)??{word,occurrences:[]};if(row.occurrences.some(p=>p.paragraphIndex===paragraphIndex&&p.start===part.start&&p.end===part.end))continue;
   row.occurrences.push({paragraphIndex,start:part.start,end:part.end,surface:part.surface,...(part.lemma?{lemma:part.lemma}:{})});rows.set(word.id,row);
  }
 });return [...rows.values()];
}
export function readerParagraphSource(article:{id:string;title:string;paragraphs:string[]},language:Language,index:number,snapshot?:ReaderSnapshot):ReadingSource|null{
 if(!Number.isInteger(index)||index<0||typeof article.paragraphs[index]!=='string')return null;
 const paragraphId=snapshot?.paragraphIds[index];const context=snapshot&&/^snapshot-[a-z0-9-]+$/.test(snapshot.snapshotId)&&Number.isInteger(snapshot.version)&&snapshot.version>0&&typeof paragraphId==='string'&&/^p-[a-f0-9]{32}$/.test(paragraphId)?{snapshotId:snapshot.snapshotId,version:snapshot.version,paragraphId}:{};
 return {articleId:article.id,title:article.title,sentence:article.paragraphs[index],language,...context};
}
