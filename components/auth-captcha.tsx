'use client';
import Script from 'next/script';
import {useCallback,useEffect,useRef,useState} from 'react';
type HCaptcha={render:(element:HTMLElement,options:{sitekey:string;size:'compact';callback:(token:string)=>void;'expired-callback':()=>void;'error-callback':()=>void})=>string;remove:(id:string)=>void};
declare global{interface Window{hcaptcha?:HCaptcha}}
export function AuthCaptcha({siteKey,onToken}:{siteKey:string;onToken:(token:string)=>void}){
 const node=useRef<HTMLDivElement>(null),widget=useRef<string|null>(null),tokenCallback=useRef(onToken);const [failed,setFailed]=useState(false);
 useEffect(()=>{tokenCallback.current=onToken},[onToken]);
 const render=useCallback(()=>{if(!node.current||!window.hcaptcha||widget.current!==null)return;widget.current=window.hcaptcha.render(node.current,{sitekey:siteKey,size:'compact',callback:token=>tokenCallback.current(token),'expired-callback':()=>tokenCallback.current(''),'error-callback':()=>{tokenCallback.current('');setFailed(true)}})},[siteKey]);
 useEffect(()=>{render();return()=>{if(widget.current!==null){window.hcaptcha?.remove(widget.current);widget.current=null}}},[render]);
 return <div className="auth-captcha"><Script src="https://js.hcaptcha.com/1/api.js?render=explicit" strategy="afterInteractive" onReady={render} onError={()=>setFailed(true)}/><div ref={node}/>{failed&&<p role="alert">机器人验证暂时无法加载，请重试或检查此浏览器是否阻止了 hCaptcha。</p>}</div>;
}
