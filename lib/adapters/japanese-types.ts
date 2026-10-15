export type JapaneseToken={start:number;end:number;surface:string;lemma:string;pos:string;reading:string|null};
export type MorphToken={surface_form:string;basic_form?:string;pos?:string;reading?:string;verbose?:{word_type?:string}};
// Align against the untouched UTF-16 source, not the upstream character offset.
// Unknown dictionary entries and malformed readings never receive guessed ruby.
export function japaneseTokens(text:string,raw:MorphToken[],toHiragana:(value:string)=>string):JapaneseToken[]{
 let cursor=0;const result:JapaneseToken[]=[];
 for(const token of raw){
  if(!token.surface_form)continue;
  const start=text.indexOf(token.surface_form,cursor);if(start<0)continue;
  cursor=start+token.surface_form.length;
  const trusted=token.verbose?.word_type==='KNOWN'&&typeof token.reading==='string'&&/^[\p{Script=Hiragana}\p{Script=Katakana}ー]+$/u.test(token.reading);
  result.push({start,end:cursor,surface:token.surface_form,lemma:token.basic_form&&token.basic_form!=='*'?token.basic_form:token.surface_form,pos:token.pos??'',reading:trusted&&/[\p{Script=Han}]/u.test(token.surface_form)?toHiragana(token.reading!):null});
 }
 return result;
}
export function validateJapaneseParagraphs(paragraphs:string[]){
 if(!Array.isArray(paragraphs)||paragraphs.length>100||paragraphs.some(p=>typeof p!=='string'||p.length>10000)||paragraphs.reduce((n,p)=>n+p.length,0)>30000)throw new Error('请将日语正文分成总计不超过 30,000 字符的段落。');
}
// Safe React-text fragments for sentence buttons/grammar spans: no HTML output,
// nested controls or partial-token readings, and original punctuation is retained.
export function japaneseRubyPieces(text:string,start:number,tokens:JapaneseToken[]){
 const pieces:{surface:string;reading?:string}[]=[];let cursor=0;
 for(const token of tokens){const a=token.start-start,b=token.end-start;
  if(!token.reading||a<cursor||a<0||b>text.length||text.slice(a,b)!==token.surface)continue;
  if(a>cursor)pieces.push({surface:text.slice(cursor,a)});
  pieces.push({surface:token.surface,reading:token.reading});cursor=b;
 }
 if(cursor<text.length)pieces.push({surface:text.slice(cursor)});return pieces;
}
