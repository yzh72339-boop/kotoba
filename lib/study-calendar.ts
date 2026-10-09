import type {Session} from './store';

const checkedZones=new Map<string,string>();
const dayFormatters=new Map<string,Intl.DateTimeFormat>();
export function validTimeZone(value?:string){
 const requested=value||Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';const cached=checkedZones.get(requested);if(cached)return cached;let zone=requested;try{new Intl.DateTimeFormat('en',{timeZone:zone}).format(0)}catch{zone=Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'}checkedZones.set(requested,zone);return zone;
}
export function calendarDay(at=Date.now(),timeZone?:string){
 const zone=validTimeZone(timeZone);let formatter=dayFormatters.get(zone);if(!formatter){formatter=new Intl.DateTimeFormat('en',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'});dayFormatters.set(zone,formatter)}const parts=formatter.formatToParts(at);
 const part=(type:string)=>parts.find(p=>p.type===type)?.value;
 return `${part('year')}-${part('month')}-${part('day')}`;
}
// Calendar arithmetic is independent of 23/25-hour daylight-saving days.
export function shiftDay(day:string,offset:number){const date=new Date(`${day}T12:00:00Z`);date.setUTCDate(date.getUTCDate()+offset);return date.toISOString().slice(0,10)}
export function sessionDay(session:Session,timeZone?:string){return typeof session.at==='number'&&Number.isFinite(session.at)&&session.at>0?calendarDay(session.at,timeZone):session.day}
export function weekDays(now=Date.now(),timeZone?:string){const day=calendarDay(now,timeZone);const weekday=new Date(`${day}T12:00:00Z`).getUTCDay();const monday=shiftDay(day,-((weekday+6)%7));return Array.from({length:7},(_,i)=>shiftDay(monday,i))}
