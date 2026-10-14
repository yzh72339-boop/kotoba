'use client';
import {useEffect,useRef,useState} from 'react';
import {convertJapaneseInput} from '@/lib/adapters/kana';
export function JapaneseInputAssist({value,onChange,disabled=false}:{value:string;onChange:(value:string)=>void;disabled?:boolean}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');const request=useRef(0);const current=useRef(value);current.current=value;useEffect(()=>()=>{request.current++;},[]);
 async function convert(script:'hiragana'|'katakana'){
  const original=value,n=++request.current;setBusy(true);setError('');
  try{const converted=await convertJapaneseInput(original,script);if(n===request.current&&current.current===original)onChange(converted)}catch{if(n===request.current)setError('转换暂不可用，请联网加载一次后重试；原输入仍保留。')}finally{if(n===request.current)setBusy(false)}
 }
 return <div className="japanese-input-assist"><span>罗马字／假名辅助 · 点击才转换</span><div><button type="button" disabled={disabled||busy||!value.trim()} onClick={()=>void convert('hiragana')}>转为平假名</button><button type="button" disabled={disabled||busy||!value.trim()} onClick={()=>void convert('katakana')}>转为片假名</button></div>{busy&&<p role="status">正在转换…</p>}{error&&<p role="alert">{error}</p>}</div>;
}
