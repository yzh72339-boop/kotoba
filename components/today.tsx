'use client';
import Image from 'next/image';
import {todayCourseProgress} from '@/lib/content-library/today-progress';
import {useState,useEffect} from 'react';
import {ArrowUpRight,ArrowRight,BookOpen,Repeat2,Check,Sparkles,Mic,Layers,Type,Headphones,ChevronDown} from 'lucide-react';
import {useStudy} from './study-context';
import {Button} from './ui/button';
import {Dialog} from './ui/dialog';
import {coursePack,levels} from '@/lib/course-library';
import {DAILY_STEPS} from '@/lib/daily-session';
import {reviewOverview} from '@/lib/review-queue';
import {weekDays,sessionDay,validTimeZone} from '@/lib/study-calendar';
import {latestReading,learningStatistics} from '@/lib/learning-statistics';
import {sessionCourse,lastCourse,courseInProgress} from '@/lib/content-library/session-course';
import {DailyFocus} from './daily-focus';
import {DailyPlanPreview} from './daily-plan-preview';
import {scopedSession,scopedSessionProgress} from '@/lib/content-library/daily-course-plan';
import {LearningSaveStatus} from './learning-save-status';
import {fetchCatalog} from '@/lib/content-library/client';
import type {ContentEntry} from '@/lib/content-library/schema';
import {minutesToday,today} from '@/lib/store';
export function SectionHeading({title,aside}:{title:string;aside?:React.ReactNode}){return <div className="section-heading"><h2>{title}</h2>{aside}</div>}
export function Activity({large=false}:{large?:boolean}){const {state}=useStudy();const day=today(state.profile.timezone);const activity=weekDays(Date.now(),state.profile.timezone).map(key=>({v:state.sessions.filter(s=>sessionDay(s,state.profile.timezone)===key).reduce((a,s)=>a+s.minutes,0),today:key===day}));return <div className={`activity ${large?'activity-large':''}`}>{activity.map((a,i)=><div key={i}><div className={`activity-bar ${a.today?'activity-today':''}`} title={`${a.v} min`}><span style={{height:`${Math.max(a.v>0?15:0,Math.min(100,a.v/45*100))}%`}}/></div><small>{['M','T','W','T','F','S','S'][i]}</small></div>)}</div>}
function greeting(timeZone?:string){const hour=Number(new Intl.DateTimeFormat('en',{timeZone:validTimeZone(timeZone),hour:'2-digit',hourCycle:'h23'}).format(Date.now()));return hour<12?'Good morning':hour<18?'Good afternoon':'Good evening'}
function ContinueReading(){const {state,navigate}=useStudy();const reading=latestReading(state);if(!reading)return null;return <section className="continue-reading"><SectionHeading title="Continue"/><button onClick={()=>navigate('Reading',reading.legacy?{legacy:true,content:reading.id}:{content:reading.id})}><BookOpen size={21}/><div><strong>{reading.title}</strong><span>Continue reading · {Math.round(reading.progress)}%</span></div><ArrowRight size={18}/></button></section>}
function FocusProgress(){const {state}=useStudy();const {session,steps,completed}=todayCourseProgress(state);const names:Record<string,string>={Review:'复习',Grammar:'语法',Reading:'阅读',Speaking:'口语'};return <div className="focus-progress"><div className="focus-progress-label"><span>{completed} / {steps.length} 步</span><span>{session?.done?'今日计划已完成':session?`下一步 · ${names[DAILY_STEPS[session.step]]}`:'复习 → 语法 → 阅读'}</span></div><div className="thin-progress" role="progressbar" aria-label="今日学习进度" aria-valuenow={completed} aria-valuemin={0} aria-valuemax={steps.length}><span style={{transform:`scaleX(${completed/steps.length})`}}/></div></div>}
export function Today({onSetup}:{onSetup:()=>void}){const {state,navigate,startDailySession,startingSession,dailySession}=useStudy();const [catalog,setCatalog]=useState<ContentEntry[]>([]);useEffect(()=>{const c=new AbortController();fetchCatalog(c.signal).then(setCatalog).catch(()=>{});return()=>c.abort()},[]);const plan=state.dailyPlans[`${today(state.profile.timezone)}-${state.profile.language}`];const focus=sessionCourse(state,'grammar',catalog)?.title??plan?.focus??'今日学习';const overview=reviewOverview(state);const stats=learningStatistics(state,'day');return <><MobileToday onSetup={onSetup} catalog={catalog}/><div className="desktop-today"><div className="greeting"><div className="eyebrow">YOUR PERSONAL LEARNING SPACE</div><h1>{greeting(state.profile.timezone)}, {state.profile.name}<span className="greeting-dot">.</span></h1><p>{state.profile.language==='ja'?'Japanese':'English'} · {state.profile.level} · A little progress, every day.</p></div><div className="today-summary"><span>Today <strong>{Math.round(stats.minutes)} min</strong></span><span>Reviewed <strong>{stats.reviews}</strong></span><span>New words <strong>{stats.newWords}</strong></span><span>Streak <strong>{stats.streak} days</strong></span></div><div className="today-grid"><div className="today-main"><SectionHeading title="Today’s focus" aside={<span className="subtle">{plan?.generatedBy==='ai'?'AI personalized':'Personal learning plan'}</span>}/><div className="lesson-card"><div className="lesson-card-content"><span className="eyebrow">{state.profile.dailyGoal} MIN · YOUR DAILY SESSION</span><h2>{focus}</h2><p>{plan?.reason??'Review, understand, read, and use.'}</p><FocusProgress/><div className="lesson-bottom"><Button disabled={startingSession} onClick={()=>void startDailySession()}>{(dailySession&&!dailySession.done)||scopedSession(state)?'继续学习':'开始今日学习'} <ArrowRight size={17}/></Button></div></div><div className="lesson-art" aria-hidden="true"><span className="art-outline"/><span className="art-kanji">{state.profile.language==='ja'?'言':'Aa'}</span></div></div><div className="plan-section"><SectionHeading title="A balanced little routine"/>{[{name:'Review',detail:overview.ready+' cards ready',icon:Repeat2,page:'Review' as const},{name:'Grammar',detail:coursePack(state.profile.language,state.profile.level).grammars[0].title,icon:BookOpen,page:'Grammar' as const},{name:'Reading',detail:'6 min · Read at your own pace',icon:BookOpen,page:'Reading' as const},{name:'Speaking',detail:coursePack(state.profile.language,state.profile.level).episodes[0].title,icon:Mic,page:'Speaking' as const}].map(n=><button className="plan-row" key={n.name} onClick={()=>navigate(n.page)}><span className="plan-icon"><n.icon size={19}/></span><div><h3>{n.name}</h3><p>{n.detail}</p></div><ArrowRight size={17}/></button>)}</div><ContinueReading/></div><aside className="today-aside"><div className="goal-card"><SectionHeading title="Daily goal"/><div className="goal-ring"><svg viewBox="0 0 140 140"><circle className="ring-track" cx="70" cy="70" r="60"/><circle className="ring-progress" cx="70" cy="70" r="60" strokeDasharray={`${Math.min(1,minutesToday(state)/state.profile.dailyGoal)*377} 377`} transform="rotate(-90 70 70)"/></svg><div><strong>{Math.round(minutesToday(state))}</strong><span>/ {state.profile.dailyGoal} min</span></div></div><p>Your pace. Your progress.</p></div><div className="weekly"><SectionHeading title="Learning rhythm"/><Activity/></div><button className="tutor-nudge" onClick={()=>navigate('Mistake Notebook')}><Sparkles size={20}/><h3>Learn from what felt tricky.</h3><p>{state.mistakes.filter(m=>m.language===state.profile.language&&!m.resolved).length} mistakes in your personal notebook.</p><span>Review your patterns <ArrowUpRight size={16}/></span></button></aside></div>{!state.profile.onboarded&&<button className="mobile-setup-link" onClick={onSetup}>设置我的学习偏好 <ArrowUpRight size={16}/></button>}</div></>}
export function Learn(){
 const {state,navigate,startDailySession,startingSession,changeLevel}=useStudy();
 const [catalog,setCatalog]=useState<ContentEntry[]|null>(null),[levelOpen,setLevelOpen]=useState(false),[catalogError,setCatalogError]=useState(false),[reload,setReload]=useState(0);
 useEffect(()=>{const controller=new AbortController();setCatalogError(false);fetchCatalog(controller.signal).then(setCatalog).catch(()=>{if(!controller.signal.aborted)setCatalogError(true)});return()=>controller.abort()},[reload]);
 const ja=state.profile.language==='ja',pack=coursePack(state.profile.language,state.profile.level);
 const progress=scopedSessionProgress(state),scoped=progress.session;const inProgress=Boolean(scoped&&!scoped.done);
 const entries=catalog?.filter(e=>e.language===state.profile.language&&e.level===state.profile.level);
 const grammarEntries=entries?.filter(e=>e.kind==='grammar'),readingEntries=entries?.filter(e=>e.kind==='reading');
 const due=reviewOverview(state).ready,continuedReading=latestReading(state);
 const last=lastCourse(state);const resumed=catalog?.find(e=>e.id===last?.id&&courseInProgress(state,e));const nextGrammar=resumed?.kind==='grammar'?resumed:catalog?sessionCourse(state,'grammar',catalog):undefined;
 const stepNames={Review:'复习',Grammar:'语法',Reading:'阅读',Speaking:'口语'};
 const completed=progress.completed;
 const libraryDetail=(count:number,newCount:number|undefined,unit:string)=>newCount===undefined?`${count} ${unit}基础资料 · ${catalogError?'目录暂不可用':'加载新资料中'}`:newCount?`${newCount} ${unit}完整资料 · ${count} ${unit}基础资料`:`${count} ${unit}基础资料`;
 const modules=[
  {page:'Vocabulary' as const,label:'词汇',english:'Vocabulary',icon:Layers,detail:`${pack.words.length} 个词汇 · 发音与例句`,legacy:false},
  {page:'Grammar' as const,label:'语法',english:'Grammar',icon:Type,detail:libraryDetail(pack.grammars.length,grammarEntries?.length,'个'),legacy:grammarEntries?.length===0},
  {page:'Reading' as const,label:'阅读',english:'Reading',icon:BookOpen,detail:libraryDetail(pack.readings.length,readingEntries?.length,'篇'),legacy:readingEntries?.length===0},
  {page:'Listening' as const,label:'听力',english:'Listening',icon:Headphones,detail:`${pack.episodes.length} 个片段 · 听读与跟读`,legacy:false},
  {page:'Speaking' as const,label:'口语',english:'Speaking',icon:Mic,detail:'场景练习与表达积累',legacy:false},
  {page:'Review' as const,label:'复习',english:'Review',icon:Repeat2,detail:due?`${due} 张卡片可复习`:'暂无待复习卡片，随时查看队列',legacy:false},
 ];
 function selectLevel(level:string){
  changeLevel(level);setLevelOpen(false);
 }
 return <div className="learn-workspace">
  <header className="learn-heading"><div><span className="eyebrow">YOUR LEARNING SPACE</span><h1>学习资料库</h1><p>{ja?'日本語':'English'} · {state.profile.goal}</p></div><button className="learn-level" aria-haspopup="dialog" aria-label={`调整学习等级，当前 ${state.profile.level}`} onClick={()=>setLevelOpen(true)}>{state.profile.level}<ChevronDown size={16}/></button></header>
  <section className="learn-session" aria-labelledby="learn-session-title">
   <div className="learn-session-top"><span className="eyebrow">TODAY’S SESSION</span>{inProgress&&<span className="learn-session-status">进行中</span>}</div>
   <h2 id="learn-session-title">{inProgress?'接着上次，继续学习。':'每天一点，稳步向前。'}</h2>
   <p>{state.profile.dailyGoal} 分钟 · {inProgress&&scoped?`下一步：${stepNames[DAILY_STEPS[scoped.step]]}`:'到期复习、语法、相关阅读与结果'}</p>
   <div className="learn-session-bottom"><Button disabled={startingSession} onClick={()=>void startDailySession()}>{startingSession?'正在准备课程…':(inProgress||scopedSession(state))?'继续学习':'开始今日学习'}<ArrowRight size={18}/></Button>{inProgress&&<span className="learn-step-count">已完成 {completed} / {progress.steps.length} 步</span>}</div>
  </section>
  <button className="learn-due" onClick={()=>navigate('Review')}><Repeat2 size={19}/><span>{due?`${due} 张到期卡片 · 立即复习`:'复习队列 · 暂无到期卡片'}</span><ArrowRight size={18}/></button>
  <DailyPlanPreview catalog={catalog}/><section className="learn-resources" aria-labelledby="learn-resources-title"><div className="learn-section-title"><h2 id="learn-resources-title">按内容学习</h2><span>{ja?'日本語':'English'} · {state.profile.level}</span></div>
   <div className="learn-module-grid">{modules.map(item=><button key={item.page} className="learn-module" onClick={()=>navigate(item.page,{legacy:item.legacy})}><span className="learn-module-icon"><item.icon size={21} strokeWidth={1.6}/></span><span className="learn-module-copy"><strong>{item.label}<small>{item.english}</small></strong><span>{item.detail}</span></span><ArrowRight className="learn-module-arrow" size={18}/></button>)}</div>
   {catalogError&&<div className="learn-catalog-error" role="status"><span>新资料目录暂未加载，基础课程仍可使用。</span><button onClick={()=>setReload(n=>n+1)}>重试</button></div>}
  </section>
  {(continuedReading||nextGrammar)&&<section className="learn-next" aria-labelledby="learn-next-title"><div className="learn-section-title"><h2 id="learn-next-title">接下来</h2><span>从当前进度出发</span></div>{continuedReading&&<button className="learn-next-row" onClick={()=>navigate('Reading',continuedReading.legacy?{legacy:true,content:continuedReading.id}:{content:continuedReading.id})}><span><small>继续阅读 · {Math.round(continuedReading.progress)}%</small><strong>{continuedReading.title}</strong></span><ArrowRight size={18}/></button>}{nextGrammar&&<button className="learn-next-row" onClick={()=>navigate('Grammar',{content:nextGrammar.id})}><span><small>{resumed?.id===nextGrammar.id?'继续语法':'下一课语法'} · {nextGrammar.level}</small><strong>{nextGrammar.title}</strong></span><ArrowRight size={18}/></button>}</section>}
  <Dialog open={levelOpen} onOpenChange={setLevelOpen} title="学习等级" sheet><p className="subtle">随时选择学习等级。切换后资料会按新等级显示，原等级的计划会暂停保留；每个语言和等级独立恢复，复习记录不变。</p><div className="learn-level-options">{levels[state.profile.language].map(level=><button key={level} aria-pressed={level===state.profile.level} onClick={()=>selectLevel(level)}><span>{level}</span>{level===state.profile.level&&<Check size={17}/>}</button>)}</div>{inProgress&&<Button className="learn-resume-action" onClick={()=>{setLevelOpen(false);startDailySession()}}>继续当前学习<ArrowRight size={17}/></Button>}</Dialog>
 </div>
}

function MobileToday({onSetup,catalog}:{onSetup:()=>void;catalog:ContentEntry[]}){
 const {state,navigate}=useStudy();const ja=state.profile.language==='ja';const due=reviewOverview(state).due;
 const stats=learningStatistics(state,'day'),reading=latestReading(state),nextReading=sessionCourse(state,'reading',catalog),grammar=sessionCourse(state,'grammar',catalog);
 const days=weekDays(Date.now(),state.profile.timezone);
 const date=new Intl.DateTimeFormat('zh-CN',{timeZone:validTimeZone(state.profile.timezone),month:'long',day:'numeric',weekday:'short'}).format(Date.now());
 return <div className="mobile-today">
  <div className="mobile-intro"><time>{date}</time><span className="tag">{ja?'日本語':'English'} · {state.profile.level}</span></div>
  <div className="mobile-greeting"><h1>{ja?'日语，渐入佳境。':'Make room for English.'}</h1></div>
  <DailyFocus catalog={catalog}><FocusProgress/></DailyFocus>
  <div className="today-quick-stats"><button onClick={()=>navigate('Review')}><Repeat2 size={19}/><span><strong>{due}</strong><small>待复习</small></span><ArrowRight size={16}/></button><button onClick={()=>navigate('Vocabulary')}><Layers size={19}/><span><strong>{stats.newWords}</strong><small>今日已学新词</small></span><ArrowRight size={16}/></button></div>
  <LearningSaveStatus/>
  {(reading||nextReading)&&<section className="mobile-next"><SectionHeading title={reading?'继续阅读':'关联阅读'} aside={<button className="text-link" onClick={()=>navigate('Reading')}>查看全部 <ArrowRight size={14}/></button>}/><button className="linked-reading-row" onClick={()=>navigate('Reading',{content:reading?.id??nextReading?.id,legacy:reading?.legacy})}><span className="reading-cover-mini" aria-hidden="true">{ja?<Image src="/images/reading-japan.jpg" width={124} height={120} alt="" unoptimized/>:<BookOpen size={24}/>}</span><span><strong>{reading?.title??nextReading?.title}</strong><small>{state.profile.level} · {reading?`已读 ${Math.round(reading.progress)}%`:`约 ${nextReading?.minutes} 分钟`}</small></span><ArrowRight size={18}/></button></section>}
  <section className="mobile-next"><SectionHeading title="按内容学习" aside={<span className="subtle">{state.profile.level}</span>}/>{[{name:'语法',detail:grammar?.title??'查看当前等级资料',icon:Type,page:'Grammar' as const,content:grammar?.id},{name:'听力',detail:'听读与跟读',icon:Headphones,page:'Listening' as const,content:undefined}].map(n=><button key={n.name} onClick={()=>navigate(n.page,n.content?{content:n.content}:undefined)}><span className="plan-icon"><n.icon size={19}/></span><div><strong>{n.name}</strong><small>{n.detail}</small></div><ArrowRight size={17}/></button>)}</section>
  <DailyPlanPreview catalog={catalog}/>
  <section className="mobile-week"><SectionHeading title="本周学习"/><div className="week-dots">{days.map((day,i)=><div key={day}><span className={state.sessions.some(s=>sessionDay(s,state.profile.timezone)===day)?'filled':''}/><small>{['一','二','三','四','五','六','日'][i]}</small></div>)}</div></section>
  {!state.profile.onboarded&&<button className="mobile-setup-link" onClick={onSetup}>设置学习目标 <ArrowUpRight size={16}/></button>}
 </div>
}
