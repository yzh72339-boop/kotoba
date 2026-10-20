'use client';
import dynamic from 'next/dynamic';
import {ArrowRight,RotateCcw} from 'lucide-react';
import {useStudy} from './study-context';
import {Button} from './ui/button';
import {dailyReadingRevisits,activeReadingRevisit,selectReadingRevisit} from '@/lib/daily-reading-revisit';
import type {ContentEntry} from '@/lib/content-library/schema';
const ReadingRevisit=dynamic(()=>import('./reading-revisit').then(m=>m.ReadingRevisit),{ssr:false,loading:()=> <p role="status">正在打开原题…</p>});
export function DailyReadingRevisit({catalog}:{catalog:ContentEntry[]}){
 const {state,setState,navigate}=useStudy();const queue=dailyReadingRevisits(state,catalog),active=activeReadingRevisit(state),next=queue.pending[0];
 if(!queue.total&&!active)return null;
 return <section className="daily-reading-revisit" aria-labelledby="daily-revisit-title">
  <div className="section-heading"><h2 id="daily-revisit-title">今日错题重练</h2><span className="tag">{queue.pending.length} 组待巩固</span></div>
  {next?<><span className="eyebrow">{next.entry.level} · 同题记录 {next.count} 次</span><h3>{next.entry.title}</h3><p>{next.mistake.pattern}</p><p className="subtle">按重复次数、最近出错排序。答错保留待巩固，答对并记录后移出本轮；复习日期不变。</p><Button onClick={()=>setState(s=>selectReadingRevisit(s,active??next.mistake))}><RotateCcw size={17}/>{active?'继续错题巩固':'开始错题巩固'}<ArrowRight size={17}/></Button></>:queue.total?<p className="subtle">已完成本轮 {queue.practiced} 组原题重练。原错题仍保留，可在错题本继续回顾；这不代表永久掌握。</p>:<p role="status" className="subtle">正在恢复所选原题，原记录保持不变。</p>}
  <Button variant="ghost" onClick={()=>navigate('Mistake Notebook')}>查看全部错题</Button>
  {active&&<ReadingRevisit key={active.id} mistake={active} onClose={reason=>{if(reason!=='source')setState(s=>selectReadingRevisit(s,null))}}/>}
 </section>;
}
