import {supabase} from './supabase';
import {network} from './platform/network';
export type AIResult={answer:string;plan?:{focus:string;reason:string;weak:string[]};mistakes?:{area:string;pattern:string;original:string;correction:string}[]};
export const aiProvider={async request(message:string,context:unknown,task='tutor',requestId=crypto.randomUUID()):Promise<AIResult>{if(!network.isOnline())throw new Error('AI requires an internet connection.');if(!supabase)throw new Error('AI 服务尚未连接。');const {data,error}=await supabase.functions.invoke('ai-tutor',{body:{message,task,languageCode:(context as {language?:string})?.language??'ja',requestId}});if(error||!data?.answer)throw new Error('AI 暂时无法回答，请稍后重试。');return data as AIResult;}};
