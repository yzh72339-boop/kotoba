'use client';
import {useEffect,useRef,useState} from 'react';
import type {Language} from '@/lib/content';
import {japaneseSearchKeys} from '@/lib/adapters/kana';
import {EnglishAnalysisClient} from '@/lib/adapters/english-client';
import {englishSearchKeys,isEnglishLookup,lookupScope} from '@/lib/adapters/dictionary-lookup';
const emptyKeys:string[]=[];
type Expansion={scope:string;keys:string[]};
export function useDictionaryExpansion(query:string,language:Language,userId:string|null,composing:boolean){
 const scope=lookupScope(userId,language,query),[expansion,setExpansion]=useState<Expansion>({scope:'',keys:[]});
 const [feedback,setFeedback]=useState<{scope:string;text:string;error:boolean}>({scope:'',text:'',error:false});
 const [loading,setLoading]=useState(''),generation=useRef(0),client=useRef<EnglishAnalysisClient|null>(null),busy=useRef(false);
 useEffect(()=>{
  const request=++generation.current;client.current?.dispose();client.current=null;busy.current=false;setLoading('');
  const timer=!composing&&query.trim()&&query.length<=100&&language==='ja'?setTimeout(()=>{void japaneseSearchKeys(query).then(keys=>{if(request!==generation.current)return;setExpansion({scope,keys});setFeedback({scope,text:keys.length?'假名候选：'+keys.join(' / '):'',error:false})}).catch(()=>{if(request===generation.current)setFeedback({scope,text:'假名辅助暂不可用。可直接搜汉字或读音，联网加载后重试。',error:true})})},150):undefined;
  const cleanup=()=>{clearTimeout(timer);generation.current++;client.current?.dispose();client.current=null;busy.current=false};
  return cleanup;
 },[query,language,userId,composing,scope]);
 async function analyze(){
  if(busy.current||composing||!isEnglishLookup(query))return;
  const request=++generation.current;busy.current=true;setLoading(scope);client.current??=new EnglishAnalysisClient();
  try{const tokens=await client.current.analyze(query.trim());if(request!==generation.current)return;const keys=englishSearchKeys(query,tokens);setExpansion({scope,keys});setFeedback({scope,text:keys.length?`${query.trim()} → ${keys.join(' / ')} · 本机词形分析`:'未识别出不同原形，继续显示原始查询。',error:false})}
  catch{if(request===generation.current)setFeedback({scope,text:'词形模型暂不可用。请联网加载一次后重试；原始搜索仍可使用。',error:true})}
  finally{if(request===generation.current){busy.current=false;setLoading('')}}
 }
 return {keys:!composing&&expansion.scope===scope?expansion.keys:emptyKeys,feedback:!composing&&feedback.scope===scope?feedback:null,loading:loading===scope,analyze};
}
