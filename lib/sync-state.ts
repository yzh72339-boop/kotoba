import type {AppState,ReviewEvent} from './store';
import {schedule} from './srs.ts';
import {newestAudio} from './audio-state.ts';
const maps=['reviews','notes','dictionary','readingPositions','listeningPositions','audioFiles','dailyPlans','languageProfiles'] as const;
const lists=['sessions','mistakes','sentences','speakingHistory','conversations','reviewHistory'] as const;
const sets=['saved','completed'] as const;
function equal(a:unknown,b:unknown){return JSON.stringify(a)===JSON.stringify(b)}
function winner<T>(a:T,b:T,ta:number,tb:number):T{if(ta===tb)return (JSON.stringify(a)??'')>(JSON.stringify(b)??'')?a:b;return ta>tb?a:b}
export function stampChanges(previous:AppState,next:AppState,now=Date.now()):AppState{
 const clock={...previous._clock,...next._clock},deleted={...previous._deleted,...next._deleted};
 function mark(key:string){clock[key]=Math.max(now,(clock[key]??0)+1);delete deleted[key]}
 for(const field of maps){const a=previous[field] as Record<string,unknown>,b=next[field] as Record<string,unknown>;for(const key of new Set([...Object.keys(a),...Object.keys(b)])){if(equal(a[key],b[key]))continue;const path=`${field}/${key}`;if(key in b)mark(path);else deleted[path]=Math.max(now,(clock[path]??0)+1)}}
 for(const field of lists){const a=new Map((previous[field] as {id:string}[]).map(x=>[x.id,x])),b=new Map((next[field] as {id:string}[]).map(x=>[x.id,x]));for(const key of new Set([...a.keys(),...b.keys()])){if(equal(a.get(key),b.get(key)))continue;const path=`${field}/${key}`;if(b.has(key))mark(path);else deleted[path]=Math.max(now,(clock[path]??0)+1)}}
 for(const field of sets){const a=new Set(previous[field]),b=new Set(next[field]);for(const key of new Set([...a,...b])){if(a.has(key)===b.has(key))continue;const path=`${field}/${key}`;if(b.has(key))mark(path);else deleted[path]=Math.max(now,(clock[path]??0)+1)}}
 for(const field of ['profile','settings'] as const){for(const key of Object.keys(next[field]))if(!equal((previous[field] as unknown as Record<string,unknown>)[key],(next[field] as unknown as Record<string,unknown>)[key]))mark(`${field}/${key}`)}
 if(previous.theme!==next.theme)mark('theme');if(!equal(previous.activeSession,next.activeSession))mark('activeSession');return {...next,_clock:clock,_deleted:deleted};
}
export function mergeStates(local:AppState,remote:AppState):AppState{
 const result={...local} as AppState;const clock:Record<string,number>={},deleted:Record<string,number>={};for(const key of new Set([...Object.keys(local._clock),...Object.keys(remote._clock)]))clock[key]=Math.max(local._clock[key]??0,remote._clock[key]??0);for(const key of new Set([...Object.keys(local._deleted),...Object.keys(remote._deleted)]))deleted[key]=Math.max(local._deleted[key]??0,remote._deleted[key]??0);
 const choose=(path:string,a:unknown,b:unknown)=>winner(a,b,local._clock[path]??0,remote._clock[path]??0);
 for(const field of maps){const a=local[field] as Record<string,unknown>,b=remote[field] as Record<string,unknown>,out:Record<string,unknown>={};for(const key of [...new Set([...Object.keys(a),...Object.keys(b)])].sort()){const path=`${field}/${key}`;if((deleted[path]??-1)>=(clock[path]??0))continue;out[key]=key in a&&key in b?field==='audioFiles'?newestAudio(local.audioFiles[key],remote.audioFiles[key]):choose(path,a[key],b[key]):a[key]??b[key]}(result as unknown as Record<string,unknown>)[field]=out;}
 for(const field of lists){const a=new Map((local[field] as {id:string}[]).map(x=>[x.id,x])),b=new Map((remote[field] as {id:string}[]).map(x=>[x.id,x]));const out=[];for(const key of new Set([...a.keys(),...b.keys()])){const path=`${field}/${key}`;if((deleted[path]??-1)>=(clock[path]??0))continue;out.push(a.has(key)&&b.has(key)?choose(path,a.get(key),b.get(key)):a.get(key)??b.get(key));}(result as unknown as Record<string,unknown>)[field]=out;}
 for(const field of sets){result[field]=[...new Set([...local[field],...remote[field]])].filter(key=>(deleted[`${field}/${key}`]??-1)<(clock[`${field}/${key}`]??0)).sort();}
 for(const field of ['profile','settings'] as const){const out={...local[field]} as Record<string,unknown>;for(const key of Object.keys(remote[field]))out[key]=choose(`${field}/${key}`,(local[field] as unknown as Record<string,unknown>)[key],(remote[field] as unknown as Record<string,unknown>)[key]);(result as unknown as Record<string,unknown>)[field]=out;}
 result.theme=choose('theme',local.theme,remote.theme) as AppState['theme'];result.activeSession=choose('activeSession',local.activeSession,remote.activeSession) as AppState['activeSession'];result._clock=clock;result._deleted=deleted;
 const reviews={...result.reviews};const events=result.reviewHistory.slice().sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id));const grouped=new Map<string,ReviewEvent[]>();for(const event of events)grouped.set(event.cardId,[...(grouped.get(event.cardId)??[]),event]);for(const [id,history] of grouped){let r;for(const e of history)r=schedule(r,id,e.rating,e.at);if(r)reviews[id]=r;}result.reviews=reviews;
 for(const field of lists)(result[field] as {id:string;at?:number;date?:number}[]).sort((a,b)=>(a.at??a.date??0)-(b.at??b.date??0)||a.id.localeCompare(b.id));
 return result;
}
