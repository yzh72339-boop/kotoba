'use client';
import {useState} from 'react';
import {ArrowRight,BookOpen,Check,ChevronDown} from 'lucide-react';
import {useStudy} from './study-context';
import {courseRoadmap} from '@/lib/content-library/course-roadmap';
import type {ContentEntry} from '@/lib/content-library/schema';
import {supabaseConfiguration} from '@/lib/supabase';

export function CourseRoadmap({catalog}:{catalog:ContentEntry[]|null}){
 const {state,navigate,userId}=useStudy();
 const scope=`${supabaseConfiguration.ok?supabaseConfiguration.url:''}/${userId??'local'}/${state.profile.language}/${state.profile.level}`;
 const [view,setView]=useState<{all:boolean;count:number}>(()=>{
  const saved=typeof window==='undefined'?null:history.state?.kotobaRoadmap;
  return saved?.scope===scope&&typeof saved.all==='boolean'&&Number.isInteger(saved.count)&&saved.count>=5&&saved.count<=1000?{all:saved.all,count:saved.count}:{all:false,count:5};
 });
 const {all,count}=view;
 function changeView(next:{all:boolean;count:number}){setView(next);history.replaceState({...history.state,kotobaRoadmap:{scope,...next}},'')}
 if(!catalog)return null;
 const roadmap=courseRoadmap(state,catalog),lessons=roadmap.lessons.filter(e=>all||e.status!=='completed');
 const labels={completed:'已完成课程',continue:'继续上次',ready:'可以开始',prepare:'先补基础',unavailable:'前置资料暂缺'};
 return <section className="course-roadmap" aria-labelledby="course-roadmap-title">
  <div className="learn-section-title"><h2 id="course-roadmap-title">学习路线</h2><span>{state.profile.level} · {roadmap.completed} / {roadmap.total} 课完成</span></div>
  <p className="subtle">从语法到真实阅读。课程完成不代表永久掌握，记忆仍由复习安排巩固。{roadmap.pinned?'今日任务已固定，自由浏览不会替换原计划。':'按前置知识和完成状态安排；开始每日学习后固定任务。'}</p>
  {roadmap.preparation&&<button className="roadmap-preparation" onClick={()=>navigate('Grammar',{content:roadmap.preparation!.id})}><span><small>今日先补 {roadmap.preparation.level} 基础</small><strong>{roadmap.preparation.title}</strong></span><ArrowRight size={18}/></button>}
  <button className="roadmap-filter" aria-pressed={all} onClick={()=>changeView({all:!all,count:5})}>{all?'收起已完成':'显示已完成课程'}</button>
  {!lessons.length&&<p role="status">{roadmap.total?'本等级课程已完成。可以回顾已学课程，或继续到期复习。':'当前等级暂无完整语法，请使用资料库中的基础课程。'}</p>}
  <ol className="roadmap-list">{lessons.slice(0,count).map(item=><li key={item.entry.id} data-course={item.entry.id}>
   <div className="roadmap-status"><span>{item.status==='completed'&&<Check size={14}/>} {labels[item.status]}</span>{item.recommended&&<span className="roadmap-recommended">今日推荐</span>}</div>
   <button className="roadmap-lesson" onClick={()=>navigate('Grammar',{content:item.entry.id})}><span><strong>{item.entry.title}</strong><small>{item.entry.summary}</small></span><ArrowRight size={18}/></button>
   {item.status==='prepare'&&<button className="roadmap-prerequisite" onClick={()=>navigate('Grammar',{content:item.preparation[0].id})}>先学：{item.preparation[0].title}{item.preparation.length>1?` · 共 ${item.preparation.length} 课`:''}<ArrowRight size={16}/></button>}
   {item.status==='unavailable'&&<p className="subtle" role="status">前置资料关联暂缺，仍可自由浏览本课；不会将它标为可直接开始。</p>}
   {item.reading?<button className="roadmap-reading" onClick={()=>navigate('Reading',{content:item.reading!.id})}><BookOpen size={17}/><span><strong>{item.reading.title}</strong><small>{state.readingPositions[item.reading.id]?.progress&&item.completedReadings<item.readings.length?`保留阅读位置 · ${Math.round(state.readingPositions[item.reading.id].progress)}%`:`${item.completedReadings} / ${item.readings.length} 篇关联阅读完成`}</small></span><ArrowRight size={16}/></button>:<p className="subtle">关联阅读尚在补充，本课仍可学习与练习。</p>}
  </li>)}</ol>
  {lessons.length>count&&<button className="roadmap-more" onClick={()=>changeView({all,count:count+5})}>再看 {Math.min(5,lessons.length-count)} 课<ChevronDown size={16}/></button>}
 </section>;
}
