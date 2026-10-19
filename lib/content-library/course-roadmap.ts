import type {AppState} from '../store';
import type {ContentEntry} from './schema';
import {coursePlan,scopedSession,storedCoursePlan} from './daily-course-plan';
import {courseInProgress,lastCourse} from './session-course';
import {prerequisitePath} from './prerequisite-path';

export type RoadmapLesson={entry:ContentEntry;status:'completed'|'continue'|'ready'|'prepare'|'unavailable';recommended:boolean;preparation:ContentEntry[];unavailable:string[];readings:ContentEntry[];reading:ContentEntry|null;completedReadings:number};
/** A read-only explanation of the existing planner; never writes pins or SRS. */
export function courseRoadmap(state:AppState,catalog:ContentEntry[]){
 const entries=catalog.filter(e=>e.kind==='grammar'&&e.language===state.profile.language&&e.level===state.profile.level);
 const saved=storedCoursePlan(state,scopedSession(state));
 const plan=saved??(catalog.length?coursePlan(state,catalog):null);
 const last=lastCourse(state),completed=new Set(state.completed);
 const lessons:RoadmapLesson[]=entries.map(entry=>{
  const path=prerequisitePath(entry,catalog,state.completed);
  const inProgress=courseInProgress(state,entry);
  let hasDraft=false;try{const draft=JSON.parse(state.notes[`library-grammar-draft-${entry.id}`]??'null');hasDraft=Boolean(draft&&typeof draft==='object'&&!Array.isArray(draft))}catch{}
  const status=!inProgress?'completed':path.unavailable.length?'unavailable':path.lessons.length?'prepare':hasDraft||last?.id===entry.id?'continue':'ready';
  const readings=catalog.filter(e=>e.kind==='reading'&&e.language===entry.language&&e.grammar.includes(entry.id)).sort((a,b)=>{
   const unfinished=(e:ContentEntry)=>Boolean(state.readingPositions[e.id]?.progress&&courseInProgress(state,e));
   return Number(unfinished(b))-Number(unfinished(a))||(unfinished(a)&&unfinished(b)?state.readingPositions[b.id].updatedAt-state.readingPositions[a.id].updatedAt:0)||Number(completed.has(a.id))-Number(completed.has(b.id))||Number(b.level===entry.level)-Number(a.level===entry.level)||a.id.localeCompare(b.id);
  });
  return {entry,status,recommended:plan?.grammar.id===entry.id,preparation:path.lessons,unavailable:path.unavailable,readings,reading:readings[0]??null,completedReadings:readings.filter(e=>completed.has(e.id)&&!courseInProgress(state,e)).length};
 });
 const order={continue:0,ready:1,prepare:2,unavailable:3,completed:4};
 lessons.sort((a,b)=>Number(b.recommended)-Number(a.recommended)||order[a.status]-order[b.status]||a.entry.id.localeCompare(b.entry.id));
 return {lessons,completed:lessons.filter(e=>e.status==='completed').length,total:lessons.length,plan,pinned:Boolean(saved),preparation:plan&&!plan.grammar.legacy&&plan.grammar.level!==state.profile.level?catalog.find(e=>e.id===plan.grammar.id&&e.kind==='grammar'&&e.language===state.profile.language)??null:null};
}
