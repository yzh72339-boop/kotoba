import {today,type AppState} from '../store';
import type {DailySession} from '../daily-session';
import {scopedSessionProgress,storedCoursePlan} from './daily-course-plan';

// Presentation only: completed plans remain visible after the result is closed.
// The learning engine still decides independently whether to start a new plan.
export function todayCourseProgress(state:AppState,now=Date.now()){
 const current=scopedSessionProgress(state);
 if(current.session)return current;
 try{
  const session:DailySession=JSON.parse(state.notes[`paused-course-session-${state.profile.language}-${state.profile.level}`]??'null');
  const plan=storedCoursePlan(state,session);
  if(session?.done===true&&session.language===state.profile.language&&plan?.level===state.profile.level&&
   Number.isFinite(session.startedAt)&&today(state.profile.timezone,session.startedAt)===today(state.profile.timezone,now)&&
   Array.isArray(session.completed)&&['Review','Grammar','Reading'].every(step=>session.completed.includes(step as 'Review'|'Grammar'|'Reading'))){
   return {session,steps:current.steps,completed:current.steps.length};
  }
 }catch{/* Invalid legacy/draft data never fabricates completion. */}
 return current;
}
