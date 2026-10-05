'use client';
import {useEffect,useState} from 'react';
import {LockKeyhole,ArrowRight,Loader2,KeyRound} from 'lucide-react';
import {supabase,supabaseConfiguration} from '@/lib/supabase';
import {read,write,remove} from '@/lib/platform/storage';
import {AUTH_STORAGE_KEY,PRIVATE_LOCK_EVENT} from '@/lib/private-session';
import {beginPrivateSignIn,beginGoogleSignIn,clearGoogleSignIn,googleSignInPending,isPrivateAppLocked} from '@/lib/platform/auth';
import {readInitializedSession,authCallbackMessage} from '@/lib/auth-callback';
import {privateAccessAllowed,verifiedOwnerForProject} from '@/lib/private-access';
import {Button} from './ui/button';
export function AuthGate({children}:{children:React.ReactNode}){
 const [authorized,setAuthorized]=useState(false),[checking,setChecking]=useState(true),[mode,setMode]=useState<'google'|'personal'>('google'),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{
  if(!supabase||!supabaseConfiguration.ok){setChecking(false);return}let alive=true,verification=0;
  const projectUrl=supabaseConfiguration.url;
  async function verify(){
   const check=++verification;const current=()=>alive&&check===verification;
   const cached=verifiedOwnerForProject(await read('meta','verifiedOwner').catch(()=>undefined),projectUrl);
   try{
    if(!current())return;
    if(isPrivateAppLocked()){setAuthorized(false);setChecking(false);return;}
    // An expired online session can try refreshing before getSession resolves.
    // Offline access uses only the previously verified owner on this device.
    if(!navigator.onLine){setAuthorized(privateAccessAllowed({online:false,locked:false,cached}));setChecking(false);if(!cached)setMessage('首次登录需要联网验证私人账户。');return;}
    const {session,error:sessionError}=await readInitializedSession(supabase!.auth);
    if(!current())return;
    if(sessionError||!session){setAuthorized(false);setChecking(false);if(sessionError)setMessage(authCallbackMessage(sessionError));else if(googleSignInPending())setMessage('Google 登录尚未建立会话（OAUTH_SESSION_MISSING）。请从此页重新发起登录；若仍返回此页，请提供这条提示。');return;}
    clearGoogleSignIn();
    const {data,error}=await supabase!.rpc('is_private_owner');if(!current())return;
    if(!error&&data===true){await write('meta','verifiedOwner',{id:session.user.id,projectUrl,verifiedAt:Date.now()}).catch(()=>{});if(current()){setAuthorized(true);setMessage('')}}
    else{setAuthorized(privateAccessAllowed({online:true,locked:false,cached,sessionId:session.user.id,owner:error?undefined:false,requestFailed:Boolean(error)}));setMessage(error?'无法验证私人账户，请稍后重试。':'此账户没有访问这个私人学习空间的权限。');if(!error){await remove('meta','verifiedOwner');await supabase!.auth.signOut({scope:'local'})}}
   }catch{if(current()){setAuthorized(!navigator.onLine&&Boolean(cached));setMessage(navigator.onLine?'登录验证暂时不可用，请稍后重试。':'正在使用本设备已验证的私人学习空间。')}}
   finally{if(current())setChecking(false)}
  }
  const lock=()=>{verification++;setAuthorized(false);setChecking(false)};
  void verify();const {data}=supabase.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){lock();void remove('meta','verifiedOwner')}else setTimeout(()=>void verify(),0)});
  const online=()=>void verify(),storage=(event:StorageEvent)=>{if(event.key===AUTH_STORAGE_KEY&&event.newValue===null){lock();void remove('meta','verifiedOwner')}};
  window.addEventListener('online',online);window.addEventListener(PRIVATE_LOCK_EVENT,lock);window.addEventListener('storage',storage);
  return()=>{alive=false;data.subscription.unsubscribe();window.removeEventListener('online',online);window.removeEventListener(PRIVATE_LOCK_EVENT,lock);window.removeEventListener('storage',storage)}
 },[]);
 async function google(){if(!supabase)return;setBusy(true);setMessage('');try{beginGoogleSignIn();const {error}=await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:`${location.origin}/`,queryParams:{prompt:'select_account'}}});if(error){clearGoogleSignIn();setMessage(authCallbackMessage(error));setBusy(false)}}catch(error){setMessage(authCallbackMessage(error));setBusy(false)}}
 async function personal(){if(!supabase)return;setBusy(true);setMessage('');try{beginPrivateSignIn();const {error}=await supabase.auth.signInWithPassword({email:email.trim(),password});if(error)setMessage('登录失败，请检查私人账号和密码。')}catch{setMessage('登录需要网络连接。')}finally{setPassword('');setBusy(false)}}
 if(authorized)return <>{children}</>;
 return <main className="private-gate"><div className="private-brand"><span className="gate-symbol">k</span><span>kotoba.</span></div><section className="private-login"><span className="private-lock"><LockKeyhole size={25}/></span><span className="eyebrow">PRIVATE. PERSONAL. YOURS.</span><h1>A space to keep growing.</h1><p>一个只属于你的英语与日语学习空间。</p>{checking?<div className="auth-check"><Loader2 className="spin" size={19}/>正在读取私人会话…</div>:<><div className="login-methods"><button className={mode==='google'?'active':''} onClick={()=>setMode('google')}>Google 登录</button><button className={mode==='personal'?'active':''} onClick={()=>setMode('personal')}>个人账户</button></div>{mode==='google'?<Button className="google-login" disabled={!supabase||busy} onClick={()=>void google()}><span className="auth-g">G</span>Continue with Google<ArrowRight size={17}/></Button>:<form className="personal-login" onSubmit={e=>{e.preventDefault();void personal()}}><label>私人账户邮箱<input className="input" type="email" required autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Your private email"/></label><label>密码<input className="input" type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password"/></label><Button disabled={!supabase||busy}>{busy?<Loader2 className="spin" size={17}/>:<KeyRound size={17}/>}Sign in<ArrowRight size={17}/></Button></form>}{!supabase&&<p className="private-config-note">Supabase 连接配置未完成。请配置项目根 URL 和公开 Publishable Key。</p>}{message&&<p role="alert" className="auth-message">{message}</p>}<small className="private-access-note">仅限指定账户 · 不开放注册 · 学习数据完全私密</small></>}</section><footer>Small steps. A lifetime of learning.</footer></main>
}
