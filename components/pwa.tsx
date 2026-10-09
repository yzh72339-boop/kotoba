'use client';
import {APP_VERSION} from '@/lib/version';
import {createContext,useContext,useEffect,useState,useRef} from 'react';
import {Download,RefreshCw,WifiOff,Check,Cloud} from 'lucide-react';
import {useStudy} from './study-context';
import {isStandalone,isIOS,installPlatform,getCapturedInstallPrompt,clearCapturedInstallPrompt,type InstallEvent} from '@/lib/platform/install';
import {watchAppUpdates,checkAppUpdate,readAppBuild,activateSavedUpdate} from '@/lib/platform/app-updates';
import {Button} from './ui/button';
import {Dialog} from './ui/dialog';
type PWAContext={installed:boolean;canInstall:boolean;install:()=>Promise<void>;updateReady:boolean;update:()=>Promise<void>;checkUpdates:()=>Promise<void>;checkingUpdates:boolean;updating:boolean;version:string};
const Context=createContext<PWAContext|null>(null);
export function usePWA(){return useContext(Context)}
export function PWAProvider({children}:{children:React.ReactNode}){const {flush,online,syncStatus,dailySession,syncNow,notify}=useStudy();const [installed,setInstalled]=useState(false),[canInstall,setCanInstall]=useState(false),[updateReady,setUpdateReady]=useState(false),[installHelp,setInstallHelp]=useState(false),[showSynced,setShowSynced]=useState(false),[retrying,setRetrying]=useState(false),[helpPlatform,setHelpPlatform]=useState<'ios'|'android'|'desktop'>('desktop');const [checkingUpdates,setCheckingUpdates]=useState(false),[updating,setUpdating]=useState(false),[version,setVersion]=useState(APP_VERSION),[build,setBuild]=useState<string|null>(null);const checking=useRef(false);const event=useRef<InstallEvent|null>(null),registration=useRef<ServiceWorkerRegistration|null>(null),reloading=useRef(false);
 useEffect(()=>{if(syncStatus!=='synced'){setShowSynced(false);return}setShowSynced(true);const timer=setTimeout(()=>setShowSynced(false),1300);return()=>clearTimeout(timer)},[syncStatus]);
 useEffect(()=>{setInstalled(isStandalone());event.current=getCapturedInstallPrompt();if(event.current)setCanInstall(true);const prompt=(e:Event)=>{e.preventDefault();event.current=e as InstallEvent;setCanInstall(true)};const complete=()=>{setInstalled(true);setCanInstall(false);event.current=null};window.addEventListener('beforeinstallprompt',prompt);window.addEventListener('appinstalled',complete);if(isIOS()&&!isStandalone())setCanInstall(true);
 if('serviceWorker' in navigator){
  let disposed=false,stopWatching=()=>{};
  const refreshBuild=()=>{void readAppBuild(navigator.serviceWorker.controller??registration.current?.active??null).then(value=>{if(!disposed&&value){setBuild(value);setVersion(value.replace(/^kotoba-/,''))}})};
  const checkQuietly=()=>{const r=registration.current;if(!r||document.visibilityState==='hidden'||!navigator.onLine||checking.current)return;checking.current=true;void checkAppUpdate(r).then(found=>{if(!disposed)setUpdateReady(found)}).catch(()=>{}).finally(()=>{checking.current=false})};
  void navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).then(r=>{
   if(disposed)return;registration.current=r;
   stopWatching=watchAppUpdates(r,()=>{if(!disposed&&navigator.serviceWorker.controller)setUpdateReady(true)});
   refreshBuild();checkQuietly();
  }).catch(()=>{});
  const changed=()=>{if(reloading.current)window.location.reload();else refreshBuild()};
  navigator.serviceWorker.addEventListener('controllerchange',changed);
  document.addEventListener('visibilitychange',checkQuietly);window.addEventListener('online',checkQuietly);
  return()=>{disposed=true;stopWatching();window.removeEventListener('beforeinstallprompt',prompt);window.removeEventListener('appinstalled',complete);navigator.serviceWorker.removeEventListener('controllerchange',changed);document.removeEventListener('visibilitychange',checkQuietly);window.removeEventListener('online',checkQuietly)};
 }
 return()=>{window.removeEventListener('beforeinstallprompt',prompt);window.removeEventListener('appinstalled',complete)}},[]);
 async function install(){const pending=event.current??getCapturedInstallPrompt();if(pending){try{await pending.prompt();await pending.userChoice;event.current=null;clearCapturedInstallPrompt();setCanInstall(false);return}catch{event.current=null;clearCapturedInstallPrompt();setCanInstall(false)}}setHelpPlatform(installPlatform());setInstallHelp(true)}
 async function checkUpdates(){
  if(!online){notify('请联网后检查更新。');return}
  if(!registration.current){notify('更新服务尚未就绪，请重新打开应用后重试。');return}
  if(checking.current){notify('正在检查更新，请稍候。');return}
  checking.current=true;setCheckingUpdates(true);
  try{const found=await checkAppUpdate(registration.current);setUpdateReady(found);notify(found?'新版本已下载，可以点击 Update。':build?'未发现待安装更新。当前构建：'+version:'未发现待安装更新；当前构建标识暂不可用。')}
  catch{notify('检查更新未完成，请保持联网后重试。')}
  finally{checking.current=false;setCheckingUpdates(false)}
 }
 async function update(){
  if(updating)return;setUpdating(true);
  try{
   const worker=registration.current?.waiting;
   if(!worker){setUpdateReady(false);notify('尚无待安装更新，请先检查更新。');return}
   await activateSavedUpdate(worker,async()=>{await flush();reloading.current=true});
  }catch{reloading.current=false;notify('更新未完成：请检查本地存储权限后重试，学习数据未清除。')}
  finally{setUpdating(false)}
 }
 return <Context.Provider value={{installed,canInstall,install,updateReady,update,checkUpdates,checkingUpdates,updating,version}}>{children}<div className="connection-strip" role="status" aria-live="polite">{!online?<><WifiOff size={14}/><span>离线学习中 · 进度已保存在此设备，联网后同步。</span></>:syncStatus==='failed'?<><Cloud size={14}/><span>进度已保存在此设备，云端同步失败。</span><button className="sync-retry" disabled={retrying} onClick={()=>{setRetrying(true);void syncNow().catch(()=>notify('同步仍未完成，进度已保存在此设备。')).finally(()=>setRetrying(false))}}>{retrying?'重试中…':'重试'}</button></>:showSynced?<><Check size={14}/><span>Synced</span></>:null}</div>{updateReady&&<div className="update-banner"><RefreshCw size={17}/><span>A new version is available.<small>{dailySession?'学习状态会先保存，再更新。':'Ready when you are.'}</small></span><Button size="sm" disabled={updating} onClick={()=>void update()}>{updating?'Saving…':'Update'}</Button></div>}<Dialog open={installHelp} onOpenChange={setInstallHelp} title="Install Kotoba" sheet>{helpPlatform==='android'?<><p className="body-copy">Android：请使用 Chrome 打开本网站，点击右上角 ⋮，选择「安装应用」或「添加到主屏幕」。</p><p className="subtle mt">当前浏览器尚未提供直接安装入口。部分浏览器只能创建网页快捷方式；安装后请从主屏幕打开，确认应用隐藏地址栏。</p></>:helpPlatform==='ios'?<><p className="body-copy">iPhone / iPad：请在 Safari 中打开本网站，点击分享，然后选择「添加到主屏幕」。</p><p className="subtle mt">完成后，从主屏幕的 Kotoba 图标打开应用。</p></>:<><p className="body-copy">电脑：在 Chrome / Edge 中，使用地址栏的安装入口，或浏览器菜单中的「安装应用」。</p><p className="subtle mt">macOS Safari 可在「文件」菜单中选择「添加到程序坞」。</p></>}</Dialog></Context.Provider>
}
export function PWAControls(){const pwa=usePWA();return pwa?.installed?<span className="standalone-marker" aria-label="已安装应用"/>:null}
export function InstallAppButton(){const pwa=usePWA();if(!pwa)return null;return <Button variant="outline" onClick={()=>void pwa.install()} disabled={pwa.installed}>{pwa.installed?<Check size={16}/>:<Download size={16}/>} {pwa.installed?'Installed':'Install App'}</Button>}
