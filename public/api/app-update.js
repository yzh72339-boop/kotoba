/* Network-only recovery works even when an older shell still owns the page. */
import {checkAppUpdate,activateSavedUpdate,updateMessage,canActivateSnapshot,UpdateError} from './update-core.js';
const check=document.getElementById('check'),activate=document.getElementById('activate');
const confirmation=document.getElementById('confirmation'),confirmed=document.getElementById('confirmed');
const status=document.getElementById('status'),build=document.getElementById('build');
const current=document.getElementById('current-build'),waiting=document.getElementById('waiting-build');
let registration=null,snapshot=null,busy=false;
function show(value){
 snapshot=value;status.textContent=updateMessage(value);
 build.textContent='服务器最新：'+(value.server?.buildId??'未联网确认');
 current.textContent='当前运行：'+(value.currentBuild??'未确认');
 waiting.textContent='已下载待激活：'+(value.waitingBuild??'无已确认的下载');
 const ready=canActivateSnapshot(value);
 confirmation.hidden=!ready;activate.hidden=!ready;activate.disabled=!confirmed.checked||busy;
 if(value.status==='update-available'&&!value.waitingBuild)status.textContent='新版服务已激活；确认本地记录已保存后可重新打开应用。';
}
async function inspect(){
 if(busy)return;busy=true;check.disabled=true;confirmed.checked=false;activate.disabled=true;
 try{
  const result=await checkAppUpdate({registration,onRegistration:r=>{registration=r},onState:show});if(result.status==='waiting'&&new URL(location.href).searchParams.get('reason')==='other-windows')show({...result,error:'other-windows'});else show(result);
 }catch{show({...snapshot,status:'error',error:'check-timeout'})}
 finally{busy=false;check.disabled=false;activate.disabled=!confirmed.checked}
}
confirmed.addEventListener('change',()=>{activate.disabled=!confirmed.checked||busy});
check.addEventListener('click',()=>void inspect());
activate.addEventListener('click',async()=>{
 if(busy||!confirmed.checked)return;busy=true;activate.disabled=true;check.disabled=true;
 try{
  const expected=snapshot?.waitingBuild??snapshot?.server?.buildId;
  if(!expected)throw new UpdateError('worker-unresponsive');
  if(registration?.waiting)await activateSavedUpdate(registration.waiting,async()=>{}, {expectedBuild:expected,recovery:true});
  else if(snapshot.activeBuild!==expected)throw new UpdateError('download-mismatch');
  status.textContent='更新完成，已确认构建：'+expected+'。正在返回 Kotoba…';
  try{sessionStorage.setItem('kotoba-last-update',expected)}catch{status.textContent='新版已激活，但浏览器未允许保存提示标记；正在返回。'}
  location.replace('/#Settings');
 }catch(error){show({...snapshot,status:'error',error:error instanceof UpdateError?error.code:'activation-rejected'})}
 finally{busy=false;check.disabled=false;activate.disabled=!confirmed.checked}
});
// Reload reconstructs pending identity from the worker, never a cached flag.
void inspect();
