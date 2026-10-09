'use client';
import type {ReactNode} from 'react';
import {ArrowRight,Clock,LoaderCircle} from 'lucide-react';
import {useStudy} from './study-context';
import {Button} from './ui/button';
import {coursePlan,scopedSession,storedCoursePlan} from '@/lib/content-library/daily-course-plan';
import type {ContentEntry} from '@/lib/content-library/schema';
import {minutesToday} from '@/lib/store';

export function DailyFocus({catalog,children}:{catalog:ContentEntry[];children:ReactNode}){
 const {state,startDailySession,startingSession}=useStudy();
 const session=scopedSession(state),plan=storedCoursePlan(state,session)??(catalog.length?coursePlan(state,catalog):null);
 const task=session?.step===2?plan?.reading:plan?.grammar;
 return <section className="mobile-daily-focus expressive-focus" aria-labelledby="daily-focus-title">
  <div className="focus-ambient" aria-hidden="true"><span/><span/></div>
  <div className="focus-masthead"><span className="eyebrow">TODAY / 今日学习</span><span className="focus-level">{state.profile.language==='ja'?'日本語':'English'} · {state.profile.level}</span></div>
  <p className="focus-intention">{session?'回到你的学习节奏':'让今天的知识，成为明天的直觉。'}</p>
  <h2 id="daily-focus-title" lang={task?.language==='ja'?'ja':undefined}>{task?.title??'从今天，向前一步。'}</h2>
  <p className="focus-course-caption">{plan?(session?.step===2?'继续阅读 · 在语境中理解':'语法 → 阅读 · 把规则用起来'):'正在准备课程，可开始学习或打开已下载资料。'}</p>
  <div className="focus-duration"><Clock size={16}/>{plan?`预计 ${plan.minutes} 分钟`:`每日目标 ${state.profile.dailyGoal} 分钟`}<span> · 复习 / 理解 / 运用</span></div>
  {children}
  <Button className="focus-start" disabled={startingSession} aria-busy={startingSession} onClick={()=>void startDailySession()}><span>{startingSession?'正在准备…':session?'继续学习':'开始今日学习'}</span>{startingSession?<LoaderCircle className="focus-loader" size={20}/>:<ArrowRight size={20}/>}</Button>
  <p className="daily-goal-caption">今天已学习 {Math.round(minutesToday(state))} / {state.profile.dailyGoal} 分钟 · 按自己的节奏</p>
 </section>;
}
