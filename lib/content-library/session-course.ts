import type {AppState} from '../store';
import type {ContentEntry} from './schema';
export type CourseKind='grammar'|'reading';
const pinKey=(s:AppState)=>s.activeSession&&!s.activeSession.done?`library-session-${s.activeSession.startedAt}-${s.profile.language}-${s.profile.level}`:null;
export function courseInProgress(s:AppState,e:ContentEntry):boolean{
 if(!s.completed.includes(e.id))return true;
 try{const d=JSON.parse(s.notes[`library-${e.kind==='reading'?'reading':'grammar'}-draft-${e.id}`]??'null');return e.kind==='reading'?d?.phase==='practice'&&Boolean(d.attemptId):d?.section==='practice'&&Object.values(d.accepted??{}).some(v=>v===false)}catch{return false}
}
export function sessionCourse(s:AppState,kind:CourseKind,catalog:ContentEntry[]):ContentEntry|null{
 const entries=catalog.filter(e=>e.kind===kind&&e.language===s.profile.language&&e.level===s.profile.level);
 const key=pinKey(s);let pinned:unknown;try{pinned=JSON.parse(key?s.notes[key]??'{}':'{}')[kind]}catch{}
 const existing=catalog.find(e=>e.id===pinned&&e.kind===kind&&e.language===s.profile.language);if(existing)return existing;
 if(kind==='reading'){
  const unfinished=entries.filter(e=>{const p=s.readingPositions[e.id];return p&&p.progress>0&&courseInProgress(s,e)}).sort((a,b)=>s.readingPositions[b.id].updatedAt-s.readingPositions[a.id].updatedAt);if(unfinished[0])return unfinished[0];
  let grammar:unknown;try{grammar=JSON.parse(key?s.notes[key]??'{}':'{}').grammar}catch{}
  const linked=entries.find(e=>!s.completed.includes(e.id)&&e.grammar.includes(String(grammar)));if(linked)return linked;
 }
 const ready=entries.find(e=>courseInProgress(s,e)&&e.prerequisites.every(id=>s.completed.includes(id)));if(ready)return ready;
 // Teach the earliest available missing prerequisite, rather than silently ignoring it.
 if(kind==='grammar'){
  const byId=new Map(catalog.filter(e=>e.kind==='grammar'&&e.language===s.profile.language).map(e=>[e.id,e]));
  const find=(e:ContentEntry,visited=new Set<string>()):ContentEntry|null=>{if(visited.has(e.id))return null;visited.add(e.id);for(const id of e.prerequisites){if(s.completed.includes(id))continue;const child=byId.get(id);if(!child)return null;const next=find(child,visited);if(next)return next;return null}return e};
  for(const e of entries.filter(e=>!s.completed.includes(e.id))){const prerequisite=find(e);if(prerequisite)return prerequisite}
  if(entries.some(e=>!s.completed.includes(e.id)))return null;
 }
 const lastReviewed=new Map<string,number>();for(const event of s.reviewHistory)if(event.language===s.profile.language)lastReviewed.set(event.cardId,Math.max(lastReviewed.get(event.cardId)??0,event.at));
 return [...entries].sort((a,b)=>(lastReviewed.get(a.id)??0)-(lastReviewed.get(b.id)??0)||a.id.localeCompare(b.id))[0]??null;
}
export function pinSessionCourse(s:AppState,entry:Pick<ContentEntry,'id'|'kind'|'language'|'level'>):AppState{
 const key=pinKey(s);if(!key||s.profile.language!==entry.language)return s;
 let previous:Record<string,unknown>={};try{const value=JSON.parse(s.notes[key]??'{}');if(value&&typeof value==='object'&&!Array.isArray(value))previous=value}catch{}
 if(previous[entry.kind]===entry.id)return s;
 return {...s,notes:{...s.notes,[key]:JSON.stringify({...previous,[entry.kind]:entry.id})}};
}
export function lastCourse(s:AppState):{id:string;kind:CourseKind;language:'ja'|'en';level:string}|null{
 try{const value=JSON.parse(s.notes['library-last-course']??'null');return value&&/^((grammar)|(article))-(ja|en)-[a-z0-9-]+$/.test(value.id)&&['grammar','reading'].includes(value.kind)&&value.language===s.profile.language&&(value.targetLevel??value.level)===s.profile.level&&value.id.startsWith(value.kind==='grammar'?'grammar-':'article-')?value:null}catch{return null}
}
