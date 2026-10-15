'use client';
import {APP_VERSION,runningAppBuild} from '@/lib/version';
import {createContext,useContext,useEffect,useState,useRef} from 'react';
import {Download,RefreshCw,WifiOff,Check,Cloud} from 'lucide-react';
import {useStudy} from './study-context';
import {isStandalone,isIOS,installPlatform,getCapturedInstallPrompt,clearCapturedInstallPrompt,type InstallEvent} from '@/lib/platform/install';
import {watchAppUpdates,checkAppUpdate,activateSavedUpdate,updateMessage,createUpdateGate,canActivateSnapshot,UpdateError,type UpdateSnapshot} from '@/lib/platform/app-updates';
import {Button} from './ui/button';
import {Dialog} from './ui/dialog';
type PWAContext={installed:boolean;canInstall:boolean;install:()=>Promise<void>;updateReady:boolean;update:()=>Promise<void>;checkUpdates:()=>Promise<void>;checkingUpdates:boolean;updating:boolean;version:string;updateState:UpdateSnapshot;updateMessage:string};
const Context=createContext<PWAContext|null>(null);
export function usePWA(){return useContext(Context)}
export function PWAProvider({children}:{children:React.ReactNode}){const {flush,online,syncStatus,syncNow,notify,localSaveStatus,pendingCount}=useStudy();const [installed,setInstalled]=useState(false),[canInstall,setCanInstall]=useState(false),[updateReady,setUpdateReady]=useState(false),[installHelp,setInstallHelp]=useState(false),[showSynced,setShowSynced]=useState(false),[retrying,setRetrying]=useState(false),[helpPlatform,setHelpPlatform]=useState<'ios'|'android'|'desktop'>('desktop');const [checkingUpdates,setCheckingUpdates]=useState(false),[updating,setUpdating]=useState(false),[confirmUpdate,setConfirmUpdate]=useState(false),[updateState,setUpdateState]=useState<UpdateSnapshot>({status:'checking',currentBuild:null,activeBuild:null,waitingBuild:null,server:null,error:null,checkedAt:0});const checking=useRef(false);const event=useRef<InstallEvent|null>(null),registration=useRef<ServiceWorkerRegistration|null>(null),reloading=useRef(false);const updater=useRef<()=>void>(()=>{}),gate=useRef(createUpdateGate()),lastAttempt=useRef(0),updatingRef=useRef(false),latest=useRef(updateState);latest.current=updateState;const alive=useRef(true);const watcher=useRef(()=>{});const study=useRef({flush,notify});study.current={flush,notify};
 useEffect(()=>{if(syncStatus!=='synced'){setShowSynced(false);return}setShowSynced(true);const timer=setTimeout(()=>setShowSynced(false),1300);return()=>clearTimeout(timer)},[syncStatus]);
 useEffect(()=>{setInstalled(isStandalone());event.current=getCapturedInstallPrompt();if(event.current)setCanInstall(true);const prompt=(e:Event)=>{e.preventDefault();event.current=e as InstallEvent;setCanInstall(true)};const complete=()=>{setInstalled(true);setCanInstall(false);event.current=null};window.addEventListener('beforeinstallprompt',prompt);window.addEventListener('appinstalled',complete);if(isIOS()&&!isStandalone())setCanInstall(true);
 alive.current=true;
 const refresh=()=>{if(document.visibilityState!=='hidden')updater.current()};
 const connected=()=>{if(Date.now()-lastAttempt.current>=30000){gate.current=createUpdateGate();updater.current()}};
 const changed=()=>{if(!updatingRef.current)updater.current()};
 document.addEventListener('visibilitychange',refresh);window.addEventListener('pageshow',refresh);window.addEventListener('online',connected);window.addEventListener('offline',refresh);
 if('serviceWorker' in navigator)navigator.serviceWorker.addEventListener('controllerchange',changed);
 updater.current();
 return()=>{alive.current=false;watcher.current();window.removeEventListener('beforeinstallprompt',prompt);window.removeEventListener('appinstalled',complete);document.removeEventListener('visibilitychange',refresh);window.removeEventListener('pageshow',refresh);window.removeEventListener('online',connected);window.removeEventListener('offline',refresh);if('serviceWorker' in navigator)navigator.serviceWorker.removeEventListener('controllerchange',changed)}},[]);
 async function runCheck(manual=false){
  if(checking.current||updatingRef.current){if(manual)notify('正在处理更新，请稍候。');return}
  if(navigator.onLine&&!gate.current.take(Date.now(),manual))return;
  checking.current=true;setCheckingUpdates(true);if(navigator.onLine)lastAttempt.current=Date.now();
  try{
   const result=await checkAppUpdate({registration:registration.current,currentBuild:runningAppBuild(),onState:value=>{if(alive.current)setUpdateState(value)},onRegistration:r=>{
    if(!alive.current||registration.current===r)return;registration.current=r;watcher.current();watcher.current=watchAppUpdates(r,()=>{if(!checking.current)void runCheck(true)},error=>{if(alive.current)setUpdateState(s=>({...s,status:'error',error:error.code}))});
   }});
   if(!alive.current)return;setUpdateState(result);setUpdateReady(canActivateSnapshot(result));
   let installed:string|null=null;try{installed=sessionStorage.getItem('kotoba-last-update')}catch{notify('构建检查已完成，但浏览器未允许读取更新提示标记。')}
   if(installed&&result.currentBuild===installed&&result.activeBuild===installed){try{sessionStorage.removeItem('kotoba-last-update')}catch{notify('新版构建已确认，但浏览器无法移除更新提示标记。')}setUpdateState({...result,status:'updated'});notify('更新完成，已确认构建：'+installed)}else if(manual)notify(updateMessage(result));
  }catch(error){if(alive.current){const code=error instanceof UpdateError?error.code:'check-timeout';setUpdateState(s=>({...s,status:'error',error:code}));if(manual)notify(updateMessage({status:'error',error:code}))}}finally{checking.current=false;if(alive.current)setCheckingUpdates(false)}
 }
 updater.current=()=>{void runCheck()};
 async function install(){const pending=event.current??getCapturedInstallPrompt();if(pending){try{await pending.prompt();await pending.userChoice;event.current=null;clearCapturedInstallPrompt();setCanInstall(false);return}catch{event.current=null;clearCapturedInstallPrompt();setCanInstall(false)}}setHelpPlatform(installPlatform());setInstallHelp(true)}
 async function checkUpdates(){await runCheck(true)}
 async function update(){if(updatingRef.current||checking.current){notify('正在处理更新，请稍候。');return}setConfirmUpdate(true)}
 async function installUpdate(){
  if(updatingRef.current||checking.current)return;updatingRef.current=true;setUpdating(true);
  const snapshot=latest.current;
  try{
   const expected=snapshot.waitingBuild??snapshot.server?.buildId;
   if(!expected)throw new UpdateError('worker-unresponsive');
   setUpdateState(s=>({...s,status:'activating',error:null}));
   const worker=registration.current?.waiting;
   if(worker)await activateSavedUpdate(worker,()=>study.current.flush(),{expectedBuild:expected});
   else{
    // A new controller may already be active while the old page is still running.
    await study.current.flush();const probe=await checkAppUpdate({registration:registration.current,currentBuild:runningAppBuild()});
    if(probe.error||probe.activeBuild!==expected)throw new UpdateError(probe.error??'download-mismatch');
   }
   try{sessionStorage.setItem('kotoba-last-update',expected)}catch{notify('新版已激活，浏览器未允许保存更新提示标记；正在重新打开。')}reloading.current=true;window.location.reload();
  }catch(error){const code=error instanceof UpdateError?error.code:'save-failed';setUpdateState(s=>({...s,status:'error',error:code}));notify(updateMessage({status:'error',error:code}));setConfirmUpdate(false)}
  finally{if(!reloading.current){updatingRef.current=false;setUpdating(false)}}
 }
 return <Context.Provider value={{installed,canInstall,install,updateReady,update,checkUpdates,checkingUpdates,updating,version:APP_VERSION,updateState,updateMessage:updateMessage(updateState)}}>{children}<div className="connection-strip" role="status" aria-live="polite">{!online?<><WifiOff size={14}/><span>离线学习中 · 进度已保存在此设备，联网后同步。</span></>:syncStatus==='failed'?<><Cloud size={14}/><span>进度已保存在此设备，云端同步失败。</span><button className="sync-retry" disabled={retrying} onClick={()=>{setRetrying(true);void syncNow().catch(()=>notify('同步仍未完成，进度已保存在此设备。')).finally(()=>setRetrying(false))}}>{retrying?'重试中…':'重试'}</button></>:showSynced?<><Check size={14}/><span>Synced</span></>:null}</div>{updateReady&&<div className="update-banner"><RefreshCw size={17}/><span>新版本已准备好。<small>{updateState.waitingBuild??updateState.server?.buildId}</small></span><Button size="sm" disabled={updating||checkingUpdates} onClick={()=>void update()}>{updating?'安装中…':'确认更新'}</Button></div>}<Dialog open={confirmUpdate} onOpenChange={v=>{if(!updating)setConfirmUpdate(v)}} title="安装 Kotoba 更新" sheet><p>将先等待本地写入完成，再激活新版并重新打开。</p><p className="subtle">当前本地状态：{localSaveStatus} · 待同步 {pendingCount} 项。未同步的离线队列会保留；无需清除数据或退出账号。</p><p className="subtle">请关闭其他 Kotoba 窗口。安装前会再次检查窗口和构建号。</p><p className="subtle">目标构建：{updateState.waitingBuild??updateState.server?.buildId??'未确认'}</p>{updateState.error&&<p role="alert">{updateMessage(updateState)}</p>}<div className="modal-actions"><Button variant="outline" disabled={updating} onClick={()=>setConfirmUpdate(false)}>取消</Button><Button disabled={updating||checkingUpdates} onClick={()=>void installUpdate()}>{updating?'保存并安装中…':'保存并安装更新'}</Button></div></Dialog><Dialog open={installHelp} onOpenChange={setInstallHelp} title="Install Kotoba" sheet>{helpPlatform==='android'?<><p className="body-copy">Android：请使用 Chrome 打开本网站，点击右上角 ⋮，选择「安装应用」或「添加到主屏幕」。</p><p className="subtle mt">当前浏览器尚未提供直接安装入口。部分浏览器只能创建网页快捷方式；安装后请从主屏幕打开，确认应用隐藏地址栏。</p></>:helpPlatform==='ios'?<><p className="body-copy">iPhone / iPad：请在 Safari 中打开本网站，点击分享，然后选择「添加到主屏幕」。</p><p className="subtle mt">完成后，从主屏幕的 Kotoba 图标打开应用。</p></>:<><p className="body-copy">电脑：在 Chrome / Edge 中，使用地址栏的安装入口，或浏览器菜单中的「安装应用」。</p><p className="subtle mt">macOS Safari 可在「文件」菜单中选择「添加到程序坞」。</p></>}</Dialog></Context.Provider>
}
export function PWAControls(){const pwa=usePWA();return pwa?.installed?<span className="standalone-marker" aria-label="已安装应用"/>:null}
export function InstallAppButton(){const pwa=usePWA();if(!pwa)return null;return <Button variant="outline" onClick={()=>void pwa.install()} disabled={pwa.installed}>{pwa.installed?<Check size={16}/>:<Download size={16}/>} {pwa.installed?'Installed':'Install App'}</Button>}
