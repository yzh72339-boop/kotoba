import {supabase} from '../supabase';
import {read,write} from '../platform/storage';
import {readinessResult,readinessCacheKey,type LibraryReadiness} from './readiness-state';
// Owner protection stays in Auth/RLS. Cached capability is usable only offline.
export async function checkLibraryReadiness(userId:string|null):Promise<LibraryReadiness>{
 if(!userId)return {status:'auth-error',writable:false};
 const key=readinessCacheKey(process.env.NEXT_PUBLIC_SUPABASE_URL??'unconfigured',userId);
 const cached=Boolean(await read<boolean>('meta',key).catch(()=>false));
 if(!navigator.onLine||!supabase)return readinessResult({online:navigator.onLine,configured:Boolean(supabase),cached});
 try{
  const {data,error}=await supabase.rpc('content_library_ready').abortSignal(AbortSignal.timeout(12000));
  const result=readinessResult({online:true,configured:true,cached,data,error});
  if(result.writable||['denied','auth-error','migration-required'].includes(result.status))await write('meta',key,result.writable).catch(()=>{});
  return result;
 }catch{return {status:'network-error',writable:false}}
}
export async function libraryReady(userId:string){return (await checkLibraryReadiness(userId)).writable}
