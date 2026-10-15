import type {EnglishToken} from './english-core';
export const isEnglishLookup=(query:string)=>query.length<=100&&/^[a-z]+(?:['’-][a-z]+)*$/i.test(query.trim());
// Keep noun/verb ambiguity from the actual model; never force reading → read.
export function englishSearchKeys(query:string,tokens:EnglishToken[]){
 if(!isEnglishLookup(query))return [];
 const value=query.trim(),words=tokens.filter(t=>!['SPACE','PUNCT','SYM'].includes(t.pos));
 if(words.length!==1)return [];
 const token=words[0];if(token.start!==0||token.end!==value.length||token.surface!==value||!isEnglishLookup(token.lemma))return [];
 return token.lemma.toLowerCase()===value.toLowerCase()?[]:[token.lemma.toLowerCase()];
}
export function lookupScope(userId:string|null,language:string,query:string){return JSON.stringify([userId,language,query])}
