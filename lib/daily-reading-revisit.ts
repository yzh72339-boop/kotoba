import type {AppState,Mistake} from './store';
import type {ContentEntry} from './content-library/schema';
import {readingMistakeSource} from './reading-revisit';

const pointer=(s:AppState)=>`today-reading-revisit-${s.profile.language}`;
function practiced(s:AppState,m:Mistake){
 try{const d=JSON.parse(s.notes['reading-revisit-'+m.id]??'null'),signature=JSON.parse(d?.signature??'null');
  return d?.recorded===true&&d.checked===true&&typeof d.questionId==='string'&&/^[a-z0-9-]+$/.test(d.questionId)&&Number.isInteger(d.answer)&&Array.isArray(signature)&&Array.isArray(signature[0])&&signature[0].length>=2&&signature[0].every((option:unknown)=>typeof option==='string')&&Number.isInteger(signature[1])&&signature[1]>=0&&signature[1]<signature[0].length&&d.answer>=0&&d.answer<signature[0].length&&d.answer===signature[1]&&signature[0].includes(m.original)&&signature[0][signature[1]]===m.correction;
 }catch{return false}
}
export function dailyReadingRevisits(s:AppState,catalog:ContentEntry[]){
 const entries=new Map(catalog.filter(e=>e.kind==='reading'&&e.language===s.profile.language).map(e=>[e.id,e]));
 const groups=new Map<string,{mistake:Mistake;entry:ContentEntry;count:number;latest:number;practicedAt:number}>();
 for(const m of s.mistakes){if(m.language!==s.profile.language||m.resolved)continue;const source=readingMistakeSource(s,m),entry=source?entries.get(source.articleId):null;if(!entry)continue;
  const key=JSON.stringify([entry.id,m.pattern,m.correction]);const group=groups.get(key);const at=Number.isFinite(m.at)?m.at:0;
  if(group){group.count++;if(at>group.latest||at===group.latest&&m.id<group.mistake.id){group.mistake=m;group.latest=at}if(practiced(s,m))group.practicedAt=Math.max(group.practicedAt,at)}
  else groups.set(key,{mistake:m,entry,count:1,latest:at,practicedAt:practiced(s,m)?at:-1});
 }
 const pending=[...groups.values()].filter(g=>g.latest>g.practicedAt).sort((a,b)=>b.count-a.count||b.latest-a.latest||a.mistake.id.localeCompare(b.mistake.id));
 return {pending,total:groups.size,practiced:groups.size-pending.length};
}
export function activeReadingRevisit(s:AppState){
 try{const id=JSON.parse(s.notes[pointer(s)]??'null');return typeof id==='string'?s.mistakes.find(m=>m.id===id&&!m.resolved&&m.language===s.profile.language&&readingMistakeSource(s,m))??null:null}catch{return null}
}
export function selectReadingRevisit(s:AppState,mistake:Mistake|null):AppState{
 if(mistake&&!s.mistakes.some(m=>m.id===mistake.id&&!m.resolved&&m.language===s.profile.language&&readingMistakeSource(s,m)))return s;
 const value=JSON.stringify(mistake?.id??null);return s.notes[pointer(s)]===value?s:{...s,notes:{...s.notes,[pointer(s)]:value}};
}
