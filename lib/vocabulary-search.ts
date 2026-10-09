import type {Word} from './content';
const normalize=(s:string)=>s.normalize('NFKC').trim().toLocaleLowerCase();
function withinOneEdit(a:string,b:string){
 if(Math.abs(a.length-b.length)>1)return false;
 let i=0,j=0,edits=0;
 while(i<a.length&&j<b.length){if(a[i]===b[j]){i++;j++;continue}if(++edits>1)return false;
  if(a.length===b.length&&i+1<a.length&&a[i]===b[j+1]&&a[i+1]===b[j]){i+=2;j+=2;continue}
  if(a.length>=b.length)i++;if(b.length>=a.length)j++;
 }return edits+(a.length-i)+(b.length-j)<=1;
}
export function searchVocabulary<T extends Word>(words:T[],query:string){
 const q=normalize(query);if(!q)return words;
 return words.map(word=>{const term=normalize(word.word),reading=normalize(word.pronunciation);const body=normalize([word.meaning,word.example,word.translation,word.related,word.tag,word.pos,...(word.senses??[]),...(word.collocations??[]),...(word.topics??[])].filter(Boolean).join(' '));
  const rank=term===q?0:reading===q?1:term.startsWith(q)||reading.startsWith(q)?2:term.includes(q)||reading.includes(q)||body.includes(q)?3:/^[a-z]{4,32}$/.test(q)&&term.length<=32&&withinOneEdit(term,q)?4:Infinity;
  return {word,rank};
 }).filter(r=>Number.isFinite(r.rank)).sort((a,b)=>a.rank-b.rank||a.word.word.localeCompare(b.word.word)).map(r=>r.word);
}
export function searchHistory(value:string|undefined):string[]{try{const parsed:unknown=JSON.parse(value??'[]');return Array.isArray(parsed)?parsed.filter((v):v is string=>typeof v==='string'&&v.length>0&&v.length<=100).slice(0,8):[]}catch{return []}}
