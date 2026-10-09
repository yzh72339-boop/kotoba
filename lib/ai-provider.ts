import {supabase} from './supabase';
import {network} from './platform/network';
import {parseAIResult,type AIResult} from './ai-response';
export type {AIResult} from './ai-response';
export const aiProvider={async request(message:string,context:unknown,task='tutor',requestId=crypto.randomUUID()):Promise<AIResult>{
 if(!network.isOnline())throw new Error('AI requires an internet connection.');if(!supabase)throw new Error('AI 服务尚未连接。');
 const language=context&&typeof context==='object'&&'language' in context&&context.language==='en'?'en':'ja';
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),45000);
 try{
  const {data,error}=await supabase.functions.invoke('ai-tutor',{body:{message,task,languageCode:language,requestId},signal:controller.signal});
  if(controller.signal.aborted)throw new Error('AI 请求超时，问题已保留，可以重试。');
  if(error){const status=error.context instanceof Response?error.context.status:undefined;throw new Error(status===429?'今日 AI 使用次数已达上限，请稍后再试。':status===401||status===403?'AI 需要有效的私人登录，请重新登录。':'AI 暂时无法回答，请稍后重试。')}
  return parseAIResult(data);
 }finally{clearTimeout(timer)}
}};
