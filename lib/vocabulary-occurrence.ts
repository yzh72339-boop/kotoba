import type {Language} from './content.ts';

// English links/highlights must match a word or phrase, not substrings such as
// `go` in `growing` or `read` in `already`. Preserve original text offsets.
export function vocabularyOccurrences(text:string,term:string,language:Language){
 const escaped=term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 if(!escaped)return [];
 const pattern=language==='en'?`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`:escaped;
 return [...text.matchAll(new RegExp(pattern,language==='en'?'giu':'gu'))].map(m=>({start:m.index,end:m.index+m[0].length}));
}
export function wordOccursInText(text:string,term:string,language:Language){return vocabularyOccurrences(text,term,language).length>0}
