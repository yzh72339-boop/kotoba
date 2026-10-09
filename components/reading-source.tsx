'use client';
import {useState} from 'react';
import {BookOpen,ArrowRight} from 'lucide-react';
import {useStudy} from './study-context';
import {readingSources} from '@/lib/content-library/reading-collection';
import {Button} from './ui/button';
import {Dialog} from './ui/dialog';
export function ReadingSourceButton({cardId}:{cardId:string}){
 const {state,navigate,changeLanguage}=useStudy();const [open,setOpen]=useState(false);const sources=readingSources(state,cardId);if(!sources.length)return null;
 return <><Button className="reading-source-button" variant="ghost" onClick={()=>setOpen(true)}><BookOpen size={17}/><span>来源 · {sources[0].title}</span></Button><Dialog open={open} onOpenChange={setOpen} title="阅读来源" sheet><div className="reading-sources">{sources.map(source=><section key={source.articleId}><h3>{source.title}</h3>{source.prompt&&<p className="subtle">练习：{source.prompt}</p>}<blockquote>{source.sentence}</blockquote><Button variant="outline" onClick={()=>{setOpen(false);if(state.profile.language!==source.language)changeLanguage(source.language);navigate('Reading',{content:source.articleId,legacy:source.legacy})}}>返回文章<ArrowRight size={17}/></Button></section>)}</div></Dialog></>;
}
