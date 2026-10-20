'use client';
import {useEffect,useRef,useState} from 'react';
import {useStudy} from './study-context';
import {Button} from './ui/button';
import {Dialog} from './ui/dialog';
import {LearningSaveStatus} from './learning-save-status';
import {fetchDocument} from '@/lib/content-library/client';
import {readingMistakeSource,readingRevisit,revisitDraft,saveRevisitDraft} from '@/lib/reading-revisit';
import type {Mistake} from '@/lib/store';

export function ReadingRevisit({mistake,onClose}:{mistake:Mistake;onClose:()=>void}){
 const {state,setState,navigate,record}=useStudy(),current=useRef(state);current.current=state;
 const [lesson,setLesson]=useState<ReturnType<typeof readingRevisit>>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);const lock=useRef(false);
 useEffect(()=>{const c=new AbortController();setError('');setLesson(null);const source=readingMistakeSource(current.current,mistake);
  if(!source){setError('原题关联不完整，暂不猜测题目。原错题与来源仍保留，可从来源入口回顾。');return()=>c.abort()}
  void fetchDocument(source.articleId,c.signal).then(doc=>{if(c.signal.aborted)return;const value=doc.kind==='reading'?readingRevisit(current.current,doc,mistake):null;if(!value)throw new Error('原题或答案已变化，暂不自动重练。原学习记录保留。');setLesson(value)}).catch(e=>{if(!c.signal.aborted)setError(e instanceof Error?e.message:'文章读取失败，请联网重试或先下载资料。')});return()=>c.abort();
 },[mistake,retry]);
 const draft=lesson?revisitDraft(state,mistake.id,lesson.question):null;
 function finish(){if(!lesson||!draft?.checked||draft.recorded||lock.current)return;lock.current=true;record('Practice',1,mistake.language,`reading-revisit-${mistake.id}-${lesson.question.id}`);setState(s=>saveRevisitDraft(s,mistake.id,{...revisitDraft(s,mistake.id,lesson.question),recorded:true}));}
 return <Dialog open onOpenChange={v=>{if(!v)onClose()}} title="回到原文再练习" sheet>
  {error?<div role="alert"><p>{error}</p><Button variant="outline" onClick={()=>setRetry(n=>n+1)}>重新读取</Button></div>:!lesson||!draft?<p role="status">正在读取原题与文章…</p>:<div className="reading-revisit">
   <p className="subtle">{lesson.article.level} · {lesson.article.title}</p><p className="subtle">这是已保存错题的原题重练，不是新的阅读测验；不会覆盖文章成绩或改变复习日期。</p>
   <details><summary>重读原文</summary><div className="revisit-text" lang={mistake.language==='ja'?'ja':'en'}>{lesson.article.paragraphs.map((p,i)=><p key={i}>{p}</p>)}</div></details>
   <Button variant="outline" onClick={()=>{onClose();navigate('Reading',{content:lesson.article.id})}}>打开原文章（保留阅读位置）</Button>
   <h3>{lesson.question.prompt}</h3><p>上次答案：{mistake.original}</p>
   <div className="quiz-options">{lesson.question.options.map((option,i)=><button key={i} className={`${draft.answer===i?'selected ':''}${draft.checked&&i===lesson.question.answer?'correct':''}`} disabled={draft.checked} aria-pressed={draft.answer===i} onClick={()=>setState(s=>saveRevisitDraft(s,mistake.id,{...revisitDraft(s,mistake.id,lesson.question),answer:i,checked:false}))}>{option}</button>)}</div>
   <Button disabled={draft.answer===null||draft.checked} onClick={()=>setState(s=>saveRevisitDraft(s,mistake.id,{...revisitDraft(s,mistake.id,lesson.question),checked:true}))}>提交并查看解析</Button>
   {draft.checked&&<div className={`question-feedback ${draft.answer===lesson.question.answer?'is-correct':'is-incorrect'}`} role="status"><p>{draft.answer===lesson.question.answer?'本次回答正确':'再结合原文看看'}</p><p>本次答案：{draft.answer===null?'未作答':lesson.question.options[draft.answer]}</p><p>正确答案：{lesson.question.options[lesson.question.answer]}</p><p>{lesson.question.explanation}</p><Button disabled={draft.recorded} onClick={finish}>{draft.recorded?'本次巩固已记录':'完成这次巩固'}</Button>{!draft.recorded&&<Button variant="ghost" onClick={()=>setState(s=>saveRevisitDraft(s,mistake.id,{...revisitDraft(s,mistake.id,lesson.question),answer:null,checked:false}))}>重新作答</Button>}</div>}
   <LearningSaveStatus/>
  </div>}
 </Dialog>;
}
