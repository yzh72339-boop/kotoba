'use client';
import {useEffect,useState,type ReactNode} from 'react';
import {ArrowRight,Clock,LoaderCircle} from 'lucide-react';
import {useStudy} from './study-context';
import {Button} from './ui/button';
import {coursePlan,scopedSession,storedCoursePlan} from '@/lib/content-library/daily-course-plan';
import type {ContentEntry} from '@/lib/content-library/schema';
import {fetchDocument} from '@/lib/content-library/client';
import type {LearningDocument} from '@/lib/content-library/schema';
import {todayCourseProgress} from '@/lib/content-library/today-progress';
import {CourseHero} from './course-hero';

export function DailyFocus({catalog,children}:{catalog:ContentEntry[];children:ReactNode}){
 const {state,startDailySession,startingSession}=useStudy();
 const session=scopedSession(state),finished=todayCourseProgress(state).session,plan=storedCoursePlan(state,session??finished)??(catalog.length?coursePlan(state,catalog):null);
 const nextPlan=!session&&finished?.done&&catalog.length?coursePlan(state,catalog):null;
 const task=session?.step===2?plan?.reading:plan?.grammar;
 const taskId=task?.id,taskLegacy=task?.legacy;
 const [document,setDocument]=useState<LearningDocument|null>(null);
 useEffect(()=>{setDocument(null);if(!taskId||taskLegacy)return;const c=new AbortController();fetchDocument(taskId,c.signal).then(setDocument).catch(()=>{});return()=>c.abort()},[taskId,taskLegacy]);
 return <div className="mobile-daily-focus"><CourseHero contextLabel="今日主线" title={task?.title??'今日学习'} level={task?.level??state.profile.level} language={state.profile.language} document={document?.id===task?.id?document:null} shared>
  {!plan&&<p className="focus-course-caption">课程准备中。已下载资料可继续使用。</p>}
  {task&&task.level!==state.profile.level&&<p className="focus-prerequisite">先补前置知识 · 当前目标 {state.profile.level}</p>}
  <div className="focus-duration"><Clock size={15}/>{plan?`约 ${plan.minutes} 分钟`:`每日目标 ${state.profile.dailyGoal} 分钟`}</div>
  {children}
  {nextPlan&&<p className="focus-next-course">下一组：{nextPlan.grammar.title} → {nextPlan.reading.title}</p>}
  <Button className="focus-start" disabled={startingSession} aria-busy={startingSession} onClick={()=>void startDailySession()}><span>{startingSession?'正在准备…':session?'继续学习':finished?.done?'再次学习':'开始学习'}</span>{startingSession?<LoaderCircle className="focus-loader" size={20}/>:<ArrowRight size={20}/>}</Button>
 </CourseHero></div>;
}
