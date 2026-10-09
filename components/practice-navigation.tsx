'use client';
import {ArrowLeft,ArrowRight} from 'lucide-react';
import {transitionScene} from '@/lib/platform/scene-transition';
import {Button} from './ui/button';
export function PracticeNavigation({index,total,completed,ready,onChange}:{index:number;total:number;completed:number;ready:boolean;onChange:(index:number)=>void}){
 function move(next:number){transitionScene(()=>onChange(next));requestAnimationFrame(()=>requestAnimationFrame(()=>{const heading=document.querySelector<HTMLElement>('.library-question h3');if(heading&&heading.getBoundingClientRect().top<80)heading.scrollIntoView({block:'start',behavior:'instant'});heading?.focus({preventScroll:true})}))}
 return <nav className="mobile-practice-nav" aria-label="练习题目导航"><p role="status">第 {index+1} / {total} 题 · 已提交 {completed} 题</p><div><Button variant="outline" disabled={index===0} onClick={()=>move(index-1)}><ArrowLeft size={17}/>上一题</Button><Button disabled={!ready||index>=total-1} onClick={()=>move(index+1)}>下一题<ArrowRight size={17}/></Button></div>{!ready&&<small>提交此题后查看解析，再继续下一题。</small>}</nav>
}
