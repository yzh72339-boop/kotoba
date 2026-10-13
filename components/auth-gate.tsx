'use client';
import {Fragment,useEffect,useState} from 'react';
import {Loader2} from 'lucide-react';
import {supabase,supabaseConfiguration} from '@/lib/supabase';
import {read,write,remove} from '@/lib/platform/storage';
import {AUTH_STORAGE_KEY,PRIVATE_LOCK_EVENT,storedAuthUserId} from '@/lib/private-session';
import {isPrivateAppLocked} from '@/lib/platform/auth';
import {readInitializedSession} from '@/lib/auth-callback';
import {verifiedOwnerForProject} from '@/lib/private-access';
import {selectStorageIdentity,lockStorageIdentity,storageIdentity} from '@/lib/storage-identity';
import {missingBetaCapability} from '@/lib/beta-auth';
import {EmailAuthScreen} from './email-auth';
export function AuthGate({children}:{children:React.ReactNode}){
 const [authorized,setAuthorized]=useState<string|null>(null),[checking,setChecking]=useState(true),[message,setMessage]=useState('');
 useEffect(()=>{
  if(!supabase||!supabaseConfiguration.ok){setChecking(false);return}
  let alive=true,generation=0;const client=supabase,project=supabaseConfiguration.url,adminKey='kotoba.admin-scope:'+encodeURIComponent(project);
  const lock=()=>{generation++;setAuthorized(null);setChecking(false);lockStorageIdentity()};
  async function verify(){
   const request=++generation,current=()=>alive&&request===generation;
   try{
    if(isPrivateAppLocked()){if(current()){setAuthorized(null);setChecking(false)}return}
    if(!navigator.onLine){
     const uid=storedAuthUserId(localStorage.getItem(AUTH_STORAGE_KEY));
     if(!uid){if(current()){setAuthorized(null);setMessage('首次登录需要联网。')}return}
     selectStorageIdentity(project,uid,localStorage.getItem(adminKey)===uid);
     let cached=verifiedOwnerForProject(await read('meta','verifiedOwner').catch(()=>undefined),project);
     if(!current())return;
     // One-time compatibility with the original, single-owner offline cache.
     if(!cached&&!localStorage.getItem(adminKey)){
      selectStorageIdentity(project,uid,true);const old=verifiedOwnerForProject(await read('meta','verifiedOwner').catch(()=>undefined),project);
      if(!current())return;
      if(old?.id===uid){cached=old;localStorage.setItem(adminKey,uid)}else selectStorageIdentity(project,uid,false);
     }
     if(current()){setAuthorized(cached?.id===uid?uid:null);setMessage(cached?.id===uid?'':'此账号还没有在本设备完成联网验证。');if(cached?.id===uid)delete document.documentElement.dataset.authHidden}return;
    }
    const {session,error}=await readInitializedSession(client.auth);if(!current())return;
    if(error||!session){setAuthorized(null);setMessage(error?'登录会话暂时不可用，请重新登录。':'');return}
    const uid=session.user.id;
    const {data:member,error:accessError,status:accessStatus}=await client.rpc('has_learning_access');if(!current())return;
    if(accessError&&accessStatus===0){
     selectStorageIdentity(project,uid,localStorage.getItem(adminKey)===uid);
     let cached=verifiedOwnerForProject(await read('meta','verifiedOwner').catch(()=>undefined),project);if(!current())return;
     if(!cached&&!localStorage.getItem(adminKey)){
      selectStorageIdentity(project,uid,true);const old=verifiedOwnerForProject(await read('meta','verifiedOwner').catch(()=>undefined),project);if(!current())return;
      if(old?.id===uid){cached=old;localStorage.setItem(adminKey,uid)}else selectStorageIdentity(project,uid,false);
     }
     if(cached?.id===uid){setAuthorized(uid);setMessage('网络验证暂时不可用，使用本账号已验证的本地记录。');delete document.documentElement.dataset.authHidden;return}
    }
    const {data:admin,error:adminError}=await client.rpc('is_private_owner');if(!current())return;
    const allowed=missingBetaCapability(accessError)?!adminError&&admin===true:!accessError&&member===true;
    if(!allowed){
     setAuthorized(null);setMessage(accessError&&!missingBetaCapability(accessError)?'无法验证学习权限，请稍后重试。':'请验证邮箱，或确认此账号仍有内测访问权限。');
     if(!accessError||accessStatus===401||accessStatus===403){selectStorageIdentity(project,uid,localStorage.getItem(adminKey)===uid);await remove('meta','verifiedOwner').catch(()=>{});if(!current())return;await client.auth.signOut({scope:'local'})}
     return;
    }
    const originalAdmin=!adminError&&admin===true;
    if(originalAdmin){
     // Pin the original legacy database to one project and server-verified UUID.
     const known=localStorage.getItem('kotoba.legacy-project');
     if(!known||known===project){localStorage.setItem('kotoba.legacy-project',project);localStorage.setItem(adminKey,uid)}
    }
    selectStorageIdentity(project,uid,originalAdmin&&localStorage.getItem(adminKey)===uid);
    const lease=storageIdentity();await write('meta','verifiedOwner',{id:uid,projectUrl:project,verifiedAt:Date.now()},lease).catch(()=>{});
    if(current()&&storageIdentity()===lease){setAuthorized(uid);setMessage('');delete document.documentElement.dataset.authHidden}
   }catch{if(current()){setAuthorized(null);setMessage('账户验证暂时不可用，请稍后重试。')}}
   finally{if(current())setChecking(false)}
  }
  void verify();
  const {data}=client.auth.onAuthStateChange((event,session)=>{
   if(event==='SIGNED_OUT'){lock();return}
   if(event==='SIGNED_IN'&&session?.user.id!==storageIdentity().userId){const previous=storageIdentity().userId;lock();if(previous){location.replace('/');return}}
   setTimeout(()=>void verify(),0);
  });
  const online=()=>void verify(),storage=(event:StorageEvent)=>{if(event.key===AUTH_STORAGE_KEY){lock();location.reload()}},foreground=()=>{
   if(document.hidden)return;const prior=storageIdentity().userId;
   if(prior&&storedAuthUserId(localStorage.getItem(AUTH_STORAGE_KEY))!==prior){lock();location.reload();return}
   void verify();
  },hide=()=>{document.documentElement.dataset.authHidden='true'};
  window.addEventListener('online',online);window.addEventListener(PRIVATE_LOCK_EVENT,lock);window.addEventListener('storage',storage);window.addEventListener('pagehide',hide);window.addEventListener('pageshow',foreground);document.addEventListener('visibilitychange',foreground);
  return()=>{alive=false;generation++;data.subscription.unsubscribe();window.removeEventListener('online',online);window.removeEventListener(PRIVATE_LOCK_EVENT,lock);window.removeEventListener('storage',storage);window.removeEventListener('pagehide',hide);window.removeEventListener('pageshow',foreground);document.removeEventListener('visibilitychange',foreground)};
 },[]);
 if(authorized)return <Fragment key={authorized}>{children}</Fragment>;
 if(checking)return <main className="private-gate auth-loading"><Loader2 className="spin" size={24}/><p>正在验证账户…</p></main>;
 return <>{message&&<p className="gate-status" role="status">{message}</p>}<EmailAuthScreen/></>;
}
