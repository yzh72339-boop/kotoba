import {supabase} from './supabase';
import type {AppState} from './store';
import {SyncCoordinator,type SyncStatus} from './sync-coordinator';
import {entries,write,remove} from './platform/storage';
import {persistLearningState} from './learning-storage';
import {backend} from './backend/repository';
import {initialAccountState} from './account-state';
export type {SyncStatus} from './sync-coordinator';
export class SyncEngine extends SyncCoordinator{
 constructor(userId:string,getState:()=>AppState,apply:(state:AppState)=>void,status:(status:SyncStatus)=>void){
  super({
   isOnline:()=>navigator.onLine&&Boolean(supabase),
   queueIds:async()=>(await entries('queue')).map(entry=>String(entry.key)),
   remote:async()=>{const account=await backend.account();if(account.profile.id!==userId)throw new Error('Private account identity mismatch');return account.progress??{revision:0,state:initialAccountState(account,window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}},
   submit:async(revision,batchId,state)=>{const {data,error}=await supabase!.rpc('sync_personal_state',{expected_revision:revision,batch_id:batchId,p_state:state});if(error||!data)throw error??new Error('Invalid synchronization response');return data},
   batchId:async ids=>{const source=ids.length?ids.slice().sort().join('|'):crypto.randomUUID();const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(source));return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')},
   persist:async state=>{const committed=await persistLearningState(state);await write('meta','lastSync',Date.now());return committed},
   acknowledge:async ids=>{for(const id of ids)await remove('queue',id)}
  },getState,apply,status);
 }
}
