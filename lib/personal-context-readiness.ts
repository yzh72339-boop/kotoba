import {supabase,supabaseConfiguration} from './supabase';
import {read,write} from './platform/storage';
import {type LibraryReadiness} from './content-library/readiness-state';
import {personalContextResult} from './personal-context-state';
export async function checkPersonalContextReady(userId:string|null):Promise<LibraryReadiness>{
 if(!userId)return {status:'auth-error',writable:false};const project=supabaseConfiguration.ok?supabaseConfiguration.url:'';const key='personal-context-ready-'+project+'-'+userId;
 const cached=await read<boolean>('meta',key).catch(()=>false)===true;
 if(!navigator.onLine||!supabase)return personalContextResult({online:navigator.onLine,configured:Boolean(supabase),cached});
 try{const {data,error}=await supabase.rpc('personal_context_ready').abortSignal(AbortSignal.timeout(12000));const result=personalContextResult({online:true,configured:true,cached,data,error});if(result.writable||['denied','auth-error','migration-required'].includes(result.status))await write('meta',key,result.writable).catch(()=>{});return result}catch(error){return personalContextResult({online:true,configured:true,cached,error:{message:error instanceof Error?error.message:'网络异常'}})}
}
