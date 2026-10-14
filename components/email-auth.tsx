'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {ArrowRight,LockKeyhole,Loader2,Mail,KeyRound} from 'lucide-react';
import {supabase} from '@/lib/supabase';
import {readInitializedSession} from '@/lib/auth-callback';
import {beginPrivateSignIn,beginGoogleSignIn} from '@/lib/platform/auth';
import {betaRegistration,betaPassword,emailInput,betaStatusSchema,betaRegistrationAvailable,safeAuthMessage,directSignup,type BetaStatus} from '@/lib/beta-auth';
import {Button} from './ui/button';
import {AuthCaptcha} from './auth-captcha';
export type AuthMode='login'|'register'|'forgot'|'reset'|'confirm';
const titles:Record<AuthMode,string>={login:'继续你的学习。',register:'建立你的学习空间。',forgot:'找回登录密码。',reset:'设置新密码。',confirm:'验证你的邮箱。'};
export function EmailAuthScreen({initialMode='login',onSignedIn}:{initialMode?:AuthMode;onSignedIn?:()=>void}){
 const [mode,setMode]=useState(initialMode),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirmPassword,setConfirmPassword]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[status,setStatus]=useState<BetaStatus|null>(null),[checking,setChecking]=useState(true),[captcha,setCaptcha]=useState(''),[captchaEpoch,setCaptchaEpoch]=useState(0),[recoveryReady,setRecoveryReady]=useState(false);
 const siteKey=directSignup?'':process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY??'';
 const submitting=useRef(false);
 useEffect(()=>{let alive=true;async function refresh(){if(!supabase){if(alive)setChecking(false);return}try{const {data,error}=await supabase.rpc('beta_signup_status');const parsed=betaStatusSchema.safeParse(data);if(alive)setStatus(!error&&parsed.success?parsed.data:null)}catch{if(alive)setStatus(null)}finally{if(alive)setChecking(false)}}void refresh();window.addEventListener('online',refresh);window.addEventListener('focus',refresh);return()=>{alive=false;window.removeEventListener('online',refresh);window.removeEventListener('focus',refresh)}},[]);
 useEffect(()=>{if(mode!=='reset'&&mode!=='confirm')return;let alive=true;async function inspect(){if(!supabase)return;const initialized=await supabase.auth.initialize();if(!alive)return;if(initialized.error){setMessage('此邮件链接未能在当前浏览器建立会话。请尝试邮箱密码登录，或在申请邮件的同一浏览器重新申请链接。');return}const {session,error}=await readInitializedSession(supabase.auth);if(!alive)return;if(error||!session){setMessage('邮件链接无效或已过期。请在申请邮件的同一浏览器重新申请链接。');return}const {data,error:verified}=await supabase.auth.getUser();if(!alive)return;if(verified||!data.user.email_confirmed_at){setMessage('邮箱验证尚未完成，请重新打开确认邮件。');return}setRecoveryReady(true);if(mode==='confirm')setMessage('当前账号邮箱已验证。可以登录并开始学习。')}void inspect().catch(()=>{if(alive)setMessage('无法确认邮件链接，请重新申请。')});return()=>{alive=false}},[mode]);
 function change(next:AuthMode){setMode(next);setMessage('');setPassword('');setConfirmPassword('');setCaptcha('');setCaptchaEpoch(v=>v+1)}
 async function resend(){
  if(!supabase||submitting.current)return;const parsed=emailInput.safeParse(email);
  if(!parsed.success){setMessage('请先填写需要验证的邮箱。');return}
  if(siteKey&&!captcha){setMessage('请先完成机器人验证。');return}
  submitting.current=true;setBusy(true);setMessage('');beginPrivateSignIn();
  try{const {error}=await supabase.auth.resend({type:'signup',email:parsed.data,options:{emailRedirectTo:location.origin+'/auth/confirm/',...(captcha?{captchaToken:captcha}:{})}});if(error)throw error;setMessage('如该账号需要验证，确认邮件已重新发送。请检查收件箱与垃圾邮件。')}
  catch(error){setMessage(safeAuthMessage(error,directSignup))}
  finally{submitting.current=false;setBusy(false);setCaptcha('');setCaptchaEpoch(v=>v+1)}
 }
 async function submit(){
  if(!supabase||submitting.current)return;
  let normalized=email.trim();
  if(mode==='register'){const parsed=betaRegistration.safeParse({email,password,confirmPassword});if(!parsed.success){setMessage(parsed.error.issues[0].message);return}normalized=parsed.data.email;if(!betaRegistrationAvailable(status,Boolean(captcha),!directSignup)){setMessage(status?.remaining===0?'内测名额已满，暂不接受新用户注册。':(directSignup?'注册尚未开放或名额检查未完成，请稍后重试。':'注册尚未准备好，请完成机器人验证或稍后重试。'));return}}
  else if(mode==='reset'){const parsed=betaPassword.safeParse(password);if(!parsed.success){setMessage(parsed.error.issues[0].message);return}if(password!==confirmPassword){setMessage('两次密码不一致。');return}if(!recoveryReady){setMessage('请先打开有效的密码找回链接。');return}}
  else{const parsed=emailInput.safeParse(email);if(!parsed.success){setMessage('请输入有效邮箱。');return}normalized=parsed.data}
  if(siteKey&&mode!=='reset'&&!captcha){setMessage('请先完成机器人验证。');return}
  submitting.current=true;setBusy(true);setMessage('');beginPrivateSignIn();
  try{
   if(mode==='register'){
    const {data,error}=await supabase.auth.signUp({email:normalized,password,options:{emailRedirectTo:location.origin+'/auth/confirm/',...(captcha?{captchaToken:captcha}:{})}});if(error)throw error;
    if(data.session?.user.email_confirmed_at){if(onSignedIn)onSignedIn();else location.replace('/');return}
    if(directSignup){setMessage('服务器仍要求邮箱确认。请联系管理员关闭 Confirm email；此次请求可能已创建账号并占用名额，请勿反复注册。');return}
    setMessage('如注册符合条件，确认邮件已发送。请在此浏览器打开邮件链接完成验证；未验证账号暂时占用一个名额。');
   }else if(mode==='forgot'){
    const {error}=await supabase.auth.resetPasswordForEmail(normalized,{redirectTo:location.origin+'/auth/reset/',...(captcha?{captchaToken:captcha}:{})});if(error)throw error;
    setMessage('如果该邮箱已注册，密码找回邮件将发送到你的邮箱。请在此浏览器打开邮件链接。');
   }else if(mode==='reset'){
    const {error}=await supabase.auth.updateUser({password});if(error)throw error;
    await supabase.auth.signOut({scope:'local'});setRecoveryReady(false);change('login');setMessage('密码已更新，请使用新密码登录。');
   }else{
    const {data,error}=await supabase.auth.signInWithPassword({email:normalized,password,options:captcha?{captchaToken:captcha}:undefined});if(error)throw error;
    if(!data.user.email_confirmed_at){await supabase.auth.signOut({scope:'local'});setMessage(directSignup?'账号尚未激活，请联系管理员。':'请先验证邮箱。');return}
    if(onSignedIn)onSignedIn();else location.replace('/');
   }
  }catch(error){setMessage(safeAuthMessage(error,directSignup))}
  finally{submitting.current=false;setPassword('');setConfirmPassword('');setCaptcha('');setCaptchaEpoch(v=>v+1);setBusy(false);const {data,error}=await supabase.rpc('beta_signup_status');const p=betaStatusSchema.safeParse(data);setStatus(!error&&p.success?p.data:null)}
 }
 async function googleMigration(){if(!supabase||busy)return;setBusy(true);beginGoogleSignIn();const {error}=await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+'/'}});if(error){setMessage(safeAuthMessage(error,directSignup));setBusy(false)}}
 const captchaRequired=Boolean(siteKey)&&mode!=='reset'&&mode!=='confirm';
 return <main className="private-gate expressive-experience beta-auth"><Link href="/" className="private-brand"><span className="gate-symbol">k</span><span>kotoba.</span></Link><section className="private-login"><span className="private-lock"><LockKeyhole size={25}/></span><span className="eyebrow">2.9.1 · LIMITED BETA</span><h1>{titles[mode]}</h1><p>英语与日语，一步一步。你的学习记录独立保存。</p>
 {mode==='register'&&<div className="beta-capacity" role="status">{checking?'正在检查注册名额…':!status?'注册服务尚未就绪，请稍后重试。':!status.enabled||!status.open?'注册尚未开放。已有账号可以继续登录。':status.remaining===0?'内测名额已满，暂不接受新用户注册。':`当前剩余 ${status.remaining} / ${status.total} 个注册名额。`}<small>显示仅供参考，最终名额由数据库原子校验。</small></div>}
 {mode==='confirm'?<div className="auth-confirm"><Mail size={24}/><p role="status">{message||'正在确认邮件链接…'}</p><Link className="button" href="/">{recoveryReady?'进入 Kotoba':'返回登录'}</Link><button onClick={()=>change('forgot')}>重新申请密码邮件</button></div>:directSignup&&mode==='forgot'?<div className="auth-confirm"><KeyRound size={24}/><p role="status">本内测采用直接注册，暂未配置邮件找回密码。请联系管理员核对账号；不要发送密码。已登录时可在个人设置中修改密码。</p><Link className="button" href="/login/">返回登录</Link></div>:<form className="personal-login" onSubmit={e=>{e.preventDefault();void submit()}}>
 {mode!=='reset'&&<label>邮箱<input className="input" type="email" required autoComplete="username" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>}
 {mode!=='forgot'&&<label>{mode==='reset'?'新密码':'密码'}<input className="input" type="password" required autoComplete={mode==='login'?'current-password':'new-password'} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)}/></label>}
 {(mode==='register'||mode==='reset')&&<><small className="password-rule">至少 12 位，包含大小写字母、数字和符号。</small><label>确认密码<input className="input" type="password" required autoComplete="new-password" maxLength={128} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}/></label></>}
 {captchaRequired&&<AuthCaptcha key={captchaEpoch} siteKey={siteKey} onToken={setCaptcha}/>}
 {mode==='register'&&!directSignup&&!siteKey&&<p className="private-config-note">注册机器人防护尚未配置，暂不能创建新账号。</p>}
 <Button disabled={!supabase||busy||mode==='register'&&!betaRegistrationAvailable(status,Boolean(captcha),!directSignup)||mode==='reset'&&!recoveryReady}>{busy?<Loader2 className="spin" size={17}/>:<KeyRound size={17}/>}{{login:'登录',register:directSignup?'注册并进入学习':'注册并发送验证邮件',forgot:'发送密码找回邮件',reset:'保存新密码'}[mode]}<ArrowRight size={17}/></Button>
 {message&&<p role="alert" className="auth-message">{message}</p>}</form>}
 <nav className="auth-links" aria-label="账户操作">{mode==='login'?<><a href="/register/">前往注册</a><button onClick={()=>change('forgot')}>{directSignup?'密码找回说明':'忘记密码'}</button></>:<a href="/login/">已有账号？登录</a>}</nav>
 {!directSignup&&(mode==='login'||mode==='register')&&<Button variant="ghost" disabled={busy||!supabase} onClick={()=>void resend()}>重新发送确认邮件</Button>}
 {mode==='login'&&!status?.enabled&&<details className="legacy-auth-migration"><summary>原管理员的登录迁移</summary><p>{directSignup?'仅供原管理员使用原 Google 身份进入，在个人设置中修改密码；保持原账号 UUID。':'仅在原账号尚未设置密码时使用原 Google 身份，再通过密码找回设置密码。保持原账号 UUID。'}</p><Button variant="outline" disabled={!supabase||busy} onClick={()=>void googleMigration()}>继续原 Google 账号</Button></details>}
 {!supabase&&<p className="private-config-note">Supabase 公开连接配置未完成。</p>}<small className="private-access-note">{directSignup?'直接注册 · 每个账号独立数据 · 最多 10 个普通账号':'邮箱验证 · 每个账号独立数据 · 无需邀请码'}</small></section><footer>Small steps. A lifetime of learning.</footer></main>;
}
