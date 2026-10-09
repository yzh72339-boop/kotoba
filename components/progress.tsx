'use client';
import {useState} from 'react';
import {Clock,Layers,BookOpen,Headphones,ArrowUpRight} from 'lucide-react';
import {useStudy} from './study-context';
import {Activity,SectionHeading} from './today';
import {Button} from './ui/button';
import {learningStatistics,type StatsPeriod} from '@/lib/learning-statistics';

export function Progress(){
 const {state,navigate}=useStudy();const [period,setPeriod]=useState<StatsPeriod>('week');
 const stats=learningStatistics(state,period),today=learningStatistics(state,'day');
 const labels={day:'Today',week:'Last 7 days',month:'Last 30 days'};
 const metrics=[{title:'Study time',value:`${Math.round(stats.minutes)}m`,note:labels[period],icon:Clock},{title:'Vocabulary',value:stats.familiar,note:`${stats.mastered} familiar after ≥ 3 recalls`,icon:Layers},{title:'Grammar',value:stats.grammar,note:'Learned patterns · legacy completion is coarse',icon:BookOpen},{title:'Listening',value:`${Math.round(stats.listeningMinutes)}m`,note:labels[period],icon:Headphones}];
 const max=Math.max(1,...stats.trend.map(t=>t.minutes));
 const growthMax=Math.max(1,...stats.vocabularyTrend.map(t=>t.count));
 const growth=stats.vocabularyTrend.map((t,i)=>`${i/Math.max(1,stats.vocabularyTrend.length-1)*800},${130-t.count/growthMax*110}`).join(' ');
 const weak=state.mistakes.filter(m=>m.language===state.profile.language&&!m.resolved);

 return <>
 <div className="page-intro"><span className="eyebrow">EVERY SMALL STEP ADDS UP</span><h1>Look how far you’ve come.</h1><p>{state.profile.language==='ja'?'日本語':'English'} · {state.profile.level} · 你的真实学习记录。</p></div>
 <div className="tabs stats-period" role="group" aria-label="统计时间范围">{(['day','week','month'] as const).map(p=><button key={p} aria-pressed={period===p} className={period===p?'active':''} onClick={()=>setPeriod(p)}>{labels[p]}</button>)}</div>
 <div className="today-summary"><span>Today <strong>{Math.round(today.minutes)} min</strong></span><span>Reviews <strong>{today.reviews}</strong></span><span>New words <strong>{today.newWords}</strong></span><span>Recall <strong>{today.accuracy===null?'—':today.accuracy+'%'}</strong></span></div>
 <div className="progress-metrics">{metrics.map(m=><div key={m.title}><span><m.icon size={18}/>{m.title}</span><strong>{m.value}</strong><small>{m.note}</small></div>)}</div>
 <div className="progress-grid"><div className="panel"><SectionHeading title="Weekly activity" aside={<span className="tag">{stats.streak} day streak</span>}/><Activity large/><p className="subtle">连续学习按个人时区计算；英语与日语共同计入连续天数。</p></div>
 <div className="panel"><SectionHeading title={`${state.profile.level} vocabulary`} aside={<strong className="accent">{stats.vocabularyProgress}%</strong>}/><div className="thin-progress" role="progressbar" aria-label="当前等级词汇学习进度" aria-valuenow={stats.vocabularyProgress} aria-valuemin={0} aria-valuemax={100}><span style={{width:`${stats.vocabularyProgress}%`}}/></div><div className="stat-detail-list"><span>Learning <strong>{stats.learning}</strong></span><span>Due now <strong>{stats.due.due}</strong></span><span>Overdue <strong>{stats.due.overdue}</strong></span><span>Upcoming <strong>{stats.due.upcoming}</strong></span><span>Readings completed <strong>{stats.readingCompleted}</strong></span></div><p className="subtle">词汇进度以当前内容包中至少成功回忆一次的词为准；不代表 JLPT / CEFR 能力认证。“熟悉”依据复习次数，不是自动证明主动运用能力。</p><Button variant="outline" onClick={()=>navigate('Review')}>Start review <ArrowUpRight size={16}/></Button></div></div>
 <div className="panel study-trend"><SectionHeading title="Learning time" aside={<span className="subtle">{labels[period]}</span>}/>{stats.minutes>0?<><div className="study-trend-bars" role="img" aria-label={`${labels[period]}，共学习 ${Math.round(stats.minutes)} 分钟`}>
 {stats.trend.map(t=><div key={t.key} title={`${t.key} · ${t.minutes.toFixed(1)} min`}><span style={{height:`${t.minutes/max*100}%`}}/></div>)}</div><div className="chart-labels"><span>{stats.trend[0].key}{period==='day'?':00':''}</span><span>{stats.trend.at(-1)?.key}{period==='day'?':00':''}</span></div></>:<div className="empty-state">这个时段还没有学习记录。完成一次练习后，数据会显示在这里。<Button variant="outline" onClick={()=>navigate('Learn')}>Start learning <ArrowUpRight size={16}/></Button></div>}{period==='day'&&stats.legacyUndated&&<p className="subtle">部分旧记录没有时间戳，计入当天总时长，但不猜测它们发生的小时。</p>}<p className="subtle">柱状图记录学习时长；Again 以外的评分计入回忆正确率。旧记录未标注语言时保留在统计中。</p></div>
 <div className="vocab-growth panel"><SectionHeading title="Vocabulary growth" aside={<span className="subtle">{labels[period]} · {stats.vocabularyTrend.at(-1)?.count??0} words ever recalled</span>}/><svg viewBox="0 0 800 140" role="img" aria-label="累计曾成功回忆的词汇数量"><g className="chart-grid"><path d="M0 30H800 M0 70H800 M0 110H800"/></g><polyline className="chart-line" points={growth}/></svg><div className="chart-labels"><span>{stats.vocabularyTrend[0].key}</span><span>{stats.vocabularyTrend.at(-1)?.key}</span></div><p className="subtle">按首次成功回忆时间累计；重新学习不会重复增加新词。累计学习量与当前记忆熟练度分别展示。</p></div>
 <div className="focus-card"><BookOpen size={23}/><div><span className="eyebrow">YOUR NEXT SMALL STEP</span><h2>{weak.length?'Return to what felt tricky.':'Make listening part of your day.'}</h2><p>{weak.length?`${weak.length} 个未解决的错误值得结合语境再练习。`:'听一段日常对话，先抓住整体意思，再留意细节。'}</p><Button variant="outline" onClick={()=>navigate(weak.length?'Review':'Listening')}>Start a focused session <ArrowUpRight size={16}/></Button></div></div>
 </>;
}
