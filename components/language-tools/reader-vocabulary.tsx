'use client';
import {useEffect,useState} from 'react';
import type {AppState} from '@/lib/store';
import type {ReaderVocabularyRow} from '@/lib/adapters/reader-vocabulary';
import {readerWordStatus} from '@/lib/adapters/reader-language';
import {searchVocabulary} from '@/lib/vocabulary-search';
import {Button} from '../ui/button';
const labels={new:'尚未学习',learning:'学习中',reviewed:'已有成功复习',marked:'自行标记认识'};
export function ReaderVocabularyList({rows,state,hidden,onLookup,dueCount,onReview}:{rows:ReaderVocabularyRow[];state:AppState;hidden:boolean;onLookup:(row:ReaderVocabularyRow)=>void;dueCount:number;onReview:()=>void}){
 const [query,setQuery]=useState(''),[filter,setFilter]=useState('all'),[page,setPage]=useState(0);
 useEffect(()=>setPage(0),[query,filter]);
 const byId=new Map(rows.map(row=>[row.word.id,row]));const filtered=searchVocabulary(rows.map(row=>row.word),query).map(w=>byId.get(w.id)!).filter(row=>filter==='all'||readerWordStatus(state,row.word.id)===filter);
 const pages=Math.max(1,Math.ceil(filtered.length/40)),current=Math.min(page,pages-1);
 return <div className="reader-vocabulary-pane" hidden={hidden}><Button variant="outline" disabled={dueCount===0} onClick={onReview}>复习本文收集 · {dueCount} 张</Button><p className="subtle">仅列出原文中实际匹配的词条。变化词形需先运行本机分析；未收录词不编造释义或复习卡。</p><label>查找本文词汇<input className="input" type="search" aria-label="查找本文词汇" value={query} maxLength={100} onChange={e=>setQuery(e.target.value)}/></label><div className="reader-vocabulary-filters" role="group" aria-label="本文词汇状态筛选">{(['all','new','learning','reviewed','marked'] as const).map(key=><button key={key} aria-pressed={filter===key} onClick={()=>setFilter(key)}>{key==='all'?'全部':labels[key]}</button>)}</div><p role="status">{filtered.length} 个词条 · {current+1} / {pages}</p><div className="reader-vocabulary-list">{filtered.slice(current*40,(current+1)*40).map(row=><button key={row.word.id} data-reader-card={row.word.id} aria-label={'查看本文词汇：'+row.word.word} onClick={()=>onLookup(row)}><span><strong>{row.word.word}</strong><small>{row.word.pronunciation}</small></span><span>{row.word.meaning}</span><small>{[...new Set(row.occurrences.map(p=>p.surface))].slice(0,3).join(' / ')} · {row.occurrences.length} 处 · {labels[readerWordStatus(state,row.word.id)]}</small></button>)}</div>{!filtered.length&&<p className="empty-state">没有匹配词条。可调整筛选，或先运行正文的词形分析。</p>}{pages>1&&<div className="dictionary-pager"><Button variant="ghost" disabled={current===0} onClick={()=>setPage(current-1)}>上一页</Button><Button variant="ghost" disabled={current===pages-1} onClick={()=>setPage(current+1)}>下一页</Button></div>}</div>;
}
