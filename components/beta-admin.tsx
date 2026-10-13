'use client';
import {useEffect,useState} from 'react';
import {z} from 'zod';
import {supabase} from '@/lib/supabase';
import {betaStatusSchema} from '@/lib/beta-auth';
import {Button} from './ui/button';
import {Dialog} from './ui/dialog';
const reportSchema=z.object({status:betaStatusSchema,accounts:z.array(z.object({id:z.string().uuid(),seat:z.number().int().min(1).max(10),email:z.string().nullable(),confirmed:z.boolean(),createdAt:z.string()})).max(10)});
type Report=z.infer<typeof reportSchema>;
export function BetaAdminPanel(){
 const [report,setReport]=useState<Report|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[target,setTarget]=useState<Report['accounts'][number]|null>(null),[confirmation,setConfirmation]=useState(''),[configured,setConfigured]=useState(false),[capacity,setCapacity]=useState(10);
 useEffect(()=>{let alive=true;async function load(){if(!supabase)return;const {data:admin,error}=await supabase.rpc('is_private_owner');if(error||admin!==true)return;const response=await supabase.rpc('beta_admin_accounts');const p=reportSchema.safeParse(response.data);if(alive&&p.success){setReport(p.data);setCapacity(p.data.status.total)}}void load();return()=>{alive=false}},[]);
 async function refresh(){if(!supabase)return;const {data,error}=await supabase.rpc('beta_admin_accounts');const p=reportSchema.safeParse(data);if(error||!p.success)throw new Error('管理状态暂时不可用。');setReport(p.data)}
 async function registration(open:boolean){if(!supabase||busy)return;setBusy(true);setMessage('');try{const {error}=await supabase.rpc('beta_set_registration',{p_open:open,p_capacity:capacity});if(error)throw new Error('无法修改注册状态。请确认原管理员已设置并验证密码，名额上限不能超过 10 或低于已分配席位。');await refresh();setMessage(open?'注册已开放。数据库仍强制最多 10 个普通账号。':'新注册已暂停；现有账号仍可登录和同步。')}catch(error){setMessage((error as Error).message)}finally{setBusy(false)}}
 async function remove(){if(!supabase||!target||confirmation!=='DELETE TEST ACCOUNT'||busy)return;const uid=target.id;setBusy(true);setMessage('');try{const {data,error}=await supabase.functions.invoke('beta-admin',{body:{action:'delete',userId:uid,confirmation}});if(error||data?.deleted!==true)throw new Error('删除未确认，不能声称名额已释放。请检查 beta-admin 部署及该账号的 Storage 文件，再刷新状态。');setTarget(null);setConfirmation('');await refresh();setMessage('Auth 删除已确认，名额按数据库结果更新。')}catch(error){setMessage((error as Error).message)}finally{setBusy(false)}}
 if(!report)return null;
 return <section className="settings-section beta-admin"><h2>内测名额管理</h2><p>普通账号 {report.accounts.length} / {report.status.total} · 剩余 {report.status.remaining} · {report.status.open?'注册开放':'新注册暂停'}</p><small>管理员不占名额。此管理页仅显示账号和验证状态，不授予读取他人学习记录的权限。</small>
 <label className="settings-field">普通账号上限<select className="input" value={capacity} onChange={e=>setCapacity(Number(e.target.value))}>{Array.from({length:10},(_,i)=><option key={i+1}>{i+1}</option>)}</select></label>
 <label className="setting-row"><span>已在 Dashboard 配置 Hook、邮箱确认、CAPTCHA、速率限制、SMTP，并实际验证原管理员密码登录</span><input type="checkbox" checked={configured} onChange={e=>setConfigured(e.target.checked)}/></label>
 <div className="settings-actions"><Button disabled={busy||!configured||!process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY} onClick={()=>void registration(true)}>开放注册</Button><Button variant="outline" disabled={busy} onClick={()=>void registration(false)}>暂停新注册</Button><Button variant="ghost" disabled={busy} onClick={()=>void refresh().catch(()=>setMessage('管理状态暂时不可用。'))}>刷新名额</Button></div>
 {!process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY&&<p className="subtle">尚未配置公开 hCaptcha Site Key，开放按钮保持关闭。</p>}
 {report.accounts.map(account=><article key={account.id} className="beta-account"><strong>{account.email??'无邮箱账号'}</strong><small>席位 {account.seat} · {account.confirmed?'邮箱已验证':'等待邮箱验证'} · {new Date(account.createdAt).toLocaleDateString()}</small><Button variant="outline" disabled={busy} onClick={()=>{setTarget(account);setConfirmation('')}}>删除测试账号并释放名额</Button></article>)}
 {message&&<p role="status">{message}</p>}
 <Dialog open={Boolean(target)} onOpenChange={open=>{if(!busy&&!open)setTarget(null)}} title="永久删除测试账号" sheet><p>将删除 {target?.email} 的 Auth 账号及其关联云端学习数据。原管理员受数据库保护。若 Auth 删除失败，名额不会释放。</p><label className="settings-field">确认这是可以删除的测试账号，请输入 DELETE TEST ACCOUNT<input className="input" autoComplete="off" value={confirmation} onChange={e=>setConfirmation(e.target.value)}/></label><div className="modal-actions"><Button variant="outline" disabled={busy} onClick={()=>setTarget(null)}>取消</Button><Button disabled={busy||confirmation!=='DELETE TEST ACCOUNT'} onClick={()=>void remove()}>{busy?'正在确认删除…':'永久删除'}</Button></div></Dialog></section>;
}
