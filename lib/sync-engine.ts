import {supabase} from './supabase';
import type {AppState} from './store';
import {SyncCoordinator,type SyncStatus} from './sync-coordinator';
import {entries,write,remove} from './platform/storage';
import {persistLearningState} from './learning-storage';
import {backend} from './backend/repository';
import {initialAccountState} from './account-state';
import {storageIdentity,assertStorageIdentity} from './storage-identity';
import {createClient} from '@supabase/supabase-js';
import {supabaseConfiguration} from './supabase';
export type {SyncStatus} from './sync-coordinator';
export class SyncEngine extends SyncCoordinator{
 constructor(userId:string,getState:()=>AppState,apply:(state:AppState)=>void,status:(status:SyncStatus)=>void){
  const lease=storageIdentity();
  super({
   isOnline:()=>navigator.onLine&&Boolean(supabase)&&lease===storageIdentity(),
   queueIds:async()=>(await entries('queue',lease)).map(entry=>String(entry.key)),
   remote:async()=>{assertStorageIdentity(lease);const account=await backend.account();assertStorageIdentity(lease);if(account.profile.id!==userId)throw new Error('Account identity mismatch');return account.progress??{revision:0,state:initialAccountState(account,window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}},
   submit:async(revision,batchId,state)=>{
    assertStorageIdentity(lease);const {data:{session}}=await supabase!.auth.getSession();assertStorageIdentity(lease);
    if(!session||session.user.id!==userId||!supabaseConfiguration.ok)throw new Error('Account identity changed');
    // Pin this request to the verified session. A later login cannot substitute
    // another user's JWT while a snapshot submission is still in flight.
    const bound=createClient(supabaseConfiguration.url,supabaseConfiguration.publishableKey,{global:{headers:{Authorization:'Bearer '+session.access_token}},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    const {data,error}=await bound.rpc('sync_personal_state',{expected_revision:revision,batch_id:batchId,p_state:state});if(error||!data)throw error??new Error('Invalid synchronization response');return data;
   },
   batchId:async ids=>{const source=ids.length?ids.slice().sort().join('|'):crypto.randomUUID();const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(source));return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')},
   persist:async state=>{const committed=await persistLearningState(state,undefined,lease);await write('meta','lastSync',Date.now(),lease);return committed},
   acknowledge:async ids=>{for(const id of ids)await remove('queue',id,lease)}
  },getState,apply,status);
 }
}
