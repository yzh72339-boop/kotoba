import type {AppState} from '../store';
import type {Language} from '../content';
import {coursePack} from '../course-library';
import {reviewQueue} from '../review-queue';
import {DAILY_STEPS,type DailySession} from '../daily-session';
import {sessionCourse,pinSessionCourse,courseInProgress} from './session-course';
import {contentLevels,type ContentEntry} from './schema';

export type CourseTask={id:string;title:string;language:Language;level:string;minutes:number;legacy:boolean};
export type CoursePlan={version:1;language:Language;level:string;reviewIds:string[];grammar:CourseTask;reading:CourseTask;reason:string;minutes:number};
const key=(session:DailySession)=>`daily-course-plan-${session.startedAt}`;
const slot=(language:Language,level:string)=>`paused-course-session-${language}-${level}`;
export function storedCoursePlan(s:AppState,session=s.activeSession):CoursePlan|null{
 if(!session)return null;
 try{const p=JSON.parse(s.notes[key(session)]??'null');const task=(t:CourseTask,prefix:string)=>t&&typeof t.id==='string'&&(t.id.startsWith(prefix+`-${p.language}`)||t.legacy&&(prefix==='grammar'?coursePack(p.language,t.level).grammars:coursePack(p.language,t.level).readings).some(e=>e.id===t.id))&&/^[a-z0-9-]+$/.test(t.id)&&t.language===p.language&&typeof t.title==='string'&&t.title.length<=500&&typeof t.level==='string'&&(contentLevels[p.language as Language] as readonly string[]).includes(t.level)&&Number.isFinite(t.minutes)&&t.minutes>0&&typeof t.legacy==='boolean';
  return p?.version===1&&p.language===session.language&&(contentLevels[p.language as Language] as readonly string[]).includes(p.level)&&Array.isArray(p.reviewIds)&&p.reviewIds.length<=20&&p.reviewIds.every((id:unknown)=>typeof id==='string'&&/^[a-z0-9-]+$/.test(id))&&task(p.grammar,'grammar')&&task(p.reading,'article')&&Number.isFinite(p.minutes)&&p.minutes>0&&typeof p.reason==='string'?p:null;
 }catch{return null}
}
export function scopedSession(s:AppState):DailySession|null{
 if(s.activeSession?.done&&s.activeSession.language===s.profile.language&&(storedCoursePlan(s)?.level??s.profile.level)===s.profile.level)return null;
 const matches=(session:DailySession|null)=>session&&!session.done&&session.language===s.profile.language&&(storedCoursePlan(s,session)?.level??s.profile.level)===s.profile.level;
 if(matches(s.activeSession))return s.activeSession;
 try{const value=JSON.parse(s.notes[slot(s.profile.language,s.profile.level)]??'null');return value&&Number.isInteger(value.step)&&value.step>=0&&value.step<4&&Number.isFinite(value.startedAt)&&value.startedAt>0&&Array.isArray(value.completed)&&value.completed.every((v:unknown)=>typeof v==='string'&&(DAILY_STEPS as readonly string[]).includes(v))&&Number.isInteger(value.baseline)&&value.baseline>=0&&value.done===false&&matches(value)?value:null}catch{return null}
}
export function coursePlan(s:AppState,catalog:ContentEntry[],now=Date.now()):CoursePlan{
 const fresh={...s,activeSession:null};const language=s.profile.language,level=s.profile.level,pack=coursePack(language,level);
 const grammar=sessionCourse(fresh,'grammar',catalog);const eligible=catalog.filter(e=>e.kind==='reading'&&e.language===language);
 const unfinished=sessionCourse(fresh,'reading',eligible.filter(e=>{const p=s.readingPositions[e.id];return e.level===level&&p&&p.progress>0&&courseInProgress(s,e)}));
 const reading=unfinished??[...eligible].sort((a,b)=>Number(b.level===level)-Number(a.level===level)).find(e=>grammar&&e.grammar.includes(grammar.id)&&!s.completed.includes(e.id)&&(contentLevels[language] as readonly string[]).indexOf(e.level)<=(contentLevels[language] as readonly string[]).indexOf(level))??sessionCourse(fresh,'reading',catalog);
 const task=(entry:ContentEntry|null,kind:'grammar'|'reading'):CourseTask=>entry?{id:entry.id,title:entry.title,language,level:entry.level,minutes:entry.minutes,legacy:false}:{id:kind==='grammar'?pack.grammars[0].id:pack.readings[0].id,title:kind==='grammar'?pack.grammars[0].title:pack.readings[0].title,language,level,minutes:kind==='grammar'?6:4,legacy:true};
 const g=task(grammar,'grammar'),r=task(reading,'reading');
 // The daily session reviews enrolled/due items, while manual Review keeps its existing new-card queue.
 const reviewIds=reviewQueue(s,now).filter(w=>Boolean(s.reviews[w.id]||s.dictionary[w.id]||s.sentences.some(sentence=>sentence.id===w.id)||w.id.startsWith('sentence-mistake-'))).slice(0,20).map(w=>w.id);
 const reason=[g.legacy?'完整语法或必要前置资料缺失，使用已有基础课。':g.level!==level?`先补 ${g.level} 前置知识。`:s.completed.includes(g.id)?'本等级语法已完成，巩固已学课程。':'学习尚未完成的语法。',r.legacy?'完整阅读缺失，使用已有基础文章。':unfinished?'优先继续未完成阅读。':grammar&&reading?.grammar.includes(grammar.id)?'阅读包含本课语法。':'暂未找到本课关联文章，使用当前等级阅读。'].join(' ');
 return {version:1,language,level,reviewIds,grammar:g,reading:r,reason,minutes:Math.max(1,Math.ceil(reviewIds.length/3)+g.minutes+r.minutes)};
}
export function beginCourseSession(s:AppState,catalog:ContentEntry[],now=Date.now()):AppState{
 const resumed=scopedSession(s);if(resumed)return {...s,activeSession:resumed};
 const plan=coursePlan(s,catalog,now),session:DailySession={language:s.profile.language,step:0,startedAt:now,baseline:s.sessions.length,completed:[],done:false};
 let next:AppState={...s,activeSession:session,notes:{...s.notes,[key(session)]:JSON.stringify(plan)}};
 for(const [kind,task] of [['grammar',plan.grammar],['reading',plan.reading]] as const)if(!task.legacy)next=pinSessionCourse(next,{...task,kind});
 return next;
}
export function switchLearningScope(s:AppState,language:Language,requestedLevel=s.languageProfiles[language].level):AppState{
 const level=(contentLevels[language] as readonly string[]).includes(requestedLevel)?requestedLevel:contentLevels[language][0];
 if(language===s.profile.language&&level===s.profile.level)return s;
 const notes={...s.notes};if(s.activeSession&&!s.activeSession.done){const oldLevel=storedCoursePlan(s)?.level??s.profile.level;notes[slot(s.activeSession.language,oldLevel)]=JSON.stringify(s.activeSession)}
 return {...s,activeSession:null,notes,profile:{...s.profile,language,level,goal:s.languageProfiles[language].goal},languageProfiles:{...s.languageProfiles,[language]:{...s.languageProfiles[language],level}}};
}
export function sessionSteps(s:AppState){return storedCoursePlan(s)||!s.activeSession?DAILY_STEPS.slice(0,3):DAILY_STEPS}
export function scopedSessionProgress(s:AppState){
 const active=s.activeSession,plan=storedCoursePlan(s);
 const finished=active?.done&&active.language===s.profile.language&&(plan?.level??s.profile.level)===s.profile.level?active:null;
 const session=scopedSession(s)??finished;
 const steps=sessionSteps({...s,activeSession:session});
 return {session,steps,completed:session?.done?steps.length:session?.completed.filter(step=>steps.includes(step as typeof DAILY_STEPS[number])).length??0};
}
export function saveSessionProgress(s:AppState,session:DailySession):AppState{const level=storedCoursePlan(s,session)?.level??s.profile.level;return {...s,activeSession:session,notes:{...s.notes,[slot(session.language,level)]:JSON.stringify(session)}}}
export function sessionTask(s:AppState,step:string):CourseTask|null{const plan=storedCoursePlan(s);return plan?(step==='Grammar'?plan.grammar:step==='Reading'?plan.reading:null):null}
export function finishCoreStep(s:AppState,step:string,courseId?:string):AppState{
 const session=s.activeSession;if(!session||session.done||DAILY_STEPS[session.step]!==step)return s;
 const plan=storedCoursePlan(s),task=sessionTask(s,step);
 if(plan&&(plan.language!==s.profile.language||plan.level!==s.profile.level||task&&task.id!==courseId))return s;
 if(session.completed.includes(DAILY_STEPS[session.step]))return s;
 return {...s,activeSession:{...session,completed:[...session.completed,DAILY_STEPS[session.step]]}};
}
