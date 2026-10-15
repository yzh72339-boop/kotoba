/* Shared by the application bundle and network-only recovery page. No learning
   storage is read, removed or migrated here. */
export const BUILD_PATTERN=/^kotoba-\d+\.\d+\.\d+(?:-[0-9A-Za-z]+(?:[.-][0-9A-Za-z]+)*)?(?:\+[0-9A-Za-z]+(?:[.-][0-9A-Za-z]+)*)?-[a-z0-9]+$/;
export class UpdateError extends Error{
 constructor(code,detail=''){super(detail||code);this.name='UpdateError';this.code=code;this.detail=detail}
}
export function validBuild(value){return typeof value==='string'&&value.length<=200&&BUILD_PATTERN.test(value)?value:null}
export function parseVersionMetadata(value){
 if(!value||value.schema!==1||typeof value.version!=='string'||!validBuild(value.buildId)||!value.buildId.startsWith('kotoba-'+value.version+'-')||typeof value.builtAt!=='string'||!Number.isFinite(Date.parse(value.builtAt))||(value.gitCommit!==null&&!/^[a-f0-9]{40,64}$/.test(value.gitCommit??'')))throw new UpdateError('invalid-metadata');
 return {schema:1,version:value.version,buildId:value.buildId,builtAt:value.builtAt,gitCommit:value.gitCommit,sourceDirty:value.sourceDirty===true};
}
export function updateMessage(state){
 const messages={unsupported:'此浏览器不支持 Service Worker 更新，请使用 Android Chrome 等支持的浏览器。',checking:'正在查询服务器版本…',unregistered:'尚未注册更新服务。',registering:'正在注册更新服务…','up-to-date':'已是最新版本。','update-available':'服务器有新版本。',downloading:'正在下载并安装更新文件…',waiting:'新版已下载，等待你确认安装。',offline:'当前离线，未确认服务器最新版本。',activating:'已保存本地记录，正在安全激活新版…',updated:'更新完成，当前构建已确认。'};
 if(state.error){const errors={'network-error':'服务器版本请求失败；无法据此判断已是最新。','metadata-timeout':'服务器版本查询超时，请重试。','invalid-metadata':'服务器版本元数据无效，不能确认最新版本。','metadata-missing':'服务器尚未提供版本元数据，请联系发布者。','auth-error':'版本请求需要网站登录，请登录网站后重试。','unexpected-page':'服务器返回了网页而不是版本数据，请确认网站访问权限。','registration-error':'更新服务注册失败，请检查浏览器权限并重试。','check-timeout':'浏览器检查更新超时，请重试。','install-error':'更新文件安装失败，旧版及学习数据仍保留。','install-timeout':'更新下载或安装超时，请重试。','download-mismatch':'服务器与已下载构建不一致，请重新检查。','worker-unresponsive':'更新服务未返回有效构建信息，不能确认版本。','save-failed':'本地记录未能完整保存，已阻止安装；请修复存储问题后重试。','other-windows':'其他 Kotoba 窗口仍打开，请关闭后再安装。','activation-rejected':'浏览器拒绝了本次更新激活，请重新检查。','activation-timeout':'新版激活未完成，请重新检查；学习数据没有清除。'};
  const text=errors[state.error]??(/^http-\d{3}$/.test(state.error)?'版本服务器返回 HTTP '+state.error.slice(5)+'，请重试。':'更新未完成，请重试。');return text+(state.detail?' '+state.detail:'');
 }
 return messages[state.status]??'版本状态尚未确认。';
}
function deadline(promise,ms,code,onTimeout=()=>{}){
 let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>{onTimeout();reject(new UpdateError(code))},ms)})]).finally(()=>clearTimeout(timer));
}
export async function fetchServerVersion({fetcher=globalThis.fetch,timeoutMs=15000,url='/api/app-version.json',now=Date.now()}={}){
 const controller=new AbortController();
 try{
  const response=await deadline(fetcher(url+(url.includes('?')?'&':'?')+'_kotoba_update='+now+'-'+Math.random().toString(36).slice(2),{cache:'no-store',credentials:'same-origin',headers:{'Cache-Control':'no-cache'},signal:controller.signal}),timeoutMs,'metadata-timeout',()=>controller.abort());
  if([401,403].includes(response.status))throw new UpdateError('auth-error');
  if(response.status===404)throw new UpdateError('metadata-missing');
  if(!response.ok)throw new UpdateError('http-'+response.status);
  if(/text\/html/i.test(response.headers.get('content-type')??''))throw new UpdateError('unexpected-page');
  let value;try{value=await deadline(response.json(),timeoutMs,'metadata-timeout',()=>controller.abort())}catch(error){if(error instanceof UpdateError)throw error;throw new UpdateError('invalid-metadata')}
  return parseVersionMetadata(value);
 }catch(error){if(error instanceof UpdateError)throw error;throw new UpdateError(error?.name==='TimeoutError'?'metadata-timeout':'network-error')}
}
export function messageWorker(worker,data,timeoutMs=2000){
 return new Promise((resolve,reject)=>{
  if(!worker||typeof MessageChannel==='undefined'){reject(new UpdateError('worker-unresponsive'));return}
  const channel=new MessageChannel();let done=false;
  const finish=(value,error)=>{if(done)return;done=true;clearTimeout(timer);channel.port1.close();channel.port2.close();if(error)reject(error);else resolve(value)};
  const timer=setTimeout(()=>finish(null,new UpdateError('worker-unresponsive')),timeoutMs);
  channel.port1.onmessage=event=>finish(event.data);
  try{worker.postMessage(data,[channel.port2])}catch{finish(null,new UpdateError('worker-unresponsive'))}
 });
}
export async function readAppBuild(worker,timeoutMs=1500){
 if(!worker)return null;
 try{return validBuild((await messageWorker(worker,{type:'GET_APP_VERSION'},timeoutMs))?.version)}catch{return null}
}
export function watchAppUpdates(registration,ready,failed=()=>{}){
 const workers=new Map();
 const observe=()=>{
  if(registration.waiting)ready();const worker=registration.installing;if(!worker||workers.has(worker))return;
  const changed=()=>{if(worker.state==='installed')ready();if(worker.state==='redundant')failed(new UpdateError('install-error'))};
  workers.set(worker,changed);worker.addEventListener('statechange',changed);
 };
 registration.addEventListener('updatefound',observe);observe();
 return()=>{registration.removeEventListener('updatefound',observe);for(const [worker,changed] of workers)worker.removeEventListener('statechange',changed)};
}
export async function downloadWorkerUpdate(registration,timeoutMs=60000,container=null){
 let stopped=false,stop=()=>{},observed=registration.installing,installationDetail='',rejectionTimer;
 const found=()=>{observed=registration.installing};const failure=e=>{if(e.source===observed&&e.data?.type==='UPDATE_INSTALL_ERROR')installationDetail=String(e.data.detail??'').slice(0,300)};
 registration.addEventListener('updatefound',found);container?.addEventListener('message',failure);
 try{
  return await deadline((async()=>{
   await registration.update();if(stopped)return false;if(registration.waiting)return true;
   const worker=observed??registration.installing;if(!worker)return false;
   return await new Promise((resolve,reject)=>{
    const changed=()=>{if(['installed','activated'].includes(worker.state))resolve(true);if(worker.state==='redundant'){clearTimeout(rejectionTimer);rejectionTimer=setTimeout(()=>reject(new UpdateError('install-error',installationDetail||'Update installation failed')),40)}};
    stop=()=>worker.removeEventListener('statechange',changed);worker.addEventListener('statechange',changed);changed();
   });
  })(),timeoutMs,'install-timeout');
 }finally{stopped=true;clearTimeout(rejectionTimer);stop();registration.removeEventListener('updatefound',found);container?.removeEventListener('message',failure)}
}
export async function checkAppUpdate(options={}){
 const nav=options.navigator??globalThis.navigator;let registration=options.registration??null;
 let state={status:'checking',currentBuild:validBuild(options.currentBuild),activeBuild:null,waitingBuild:null,server:null,error:null,detail:null,checkedAt:Date.now()};
 const emit=patch=>{state={...state,...patch};options.onState?.(state);return state};
 try{
  emit({status:'checking'});
  if(!nav?.serviceWorker)return emit({status:'unsupported'});
  if(!registration){try{registration=await deadline(nav.serviceWorker.getRegistration('/'),15000,'registration-error')}catch{throw new UpdateError('registration-error')}}
  const active=nav.serviceWorker.controller??registration?.active??null;
  const [activeBuild,waitingBuild]=await Promise.all([readAppBuild(active),readAppBuild(registration?.waiting??null)]);
  emit({activeBuild,waitingBuild,currentBuild:state.currentBuild??activeBuild});
  if((options.online??nav.onLine)===false)return emit({status:'offline'});
  const server=await fetchServerVersion(options);emit({server});
  if(!registration){
   emit({status:'unregistered'});emit({status:'registering'});
   try{registration=await deadline(nav.serviceWorker.register('/sw.js?_kotoba_build='+encodeURIComponent(server.buildId),{scope:'/',updateViaCache:'none'}),15000,'registration-error')}catch{throw new UpdateError('registration-error')}
  }
  options.onRegistration?.(registration);
  if(waitingBuild===server.buildId&&activeBuild!==server.buildId)return emit({status:'waiting'});
  if(state.currentBuild===server.buildId&&activeBuild===server.buildId&&!registration.installing&&!registration.waiting)return emit({status:'up-to-date'});
  emit({status:'update-available'});emit({status:'downloading'});
  // A stable /sw.js may still be stale at a CDN despite browser cache bypass.
  // A build-specific script URL retains the same registration scope and data.
  if(nav.serviceWorker.register){try{registration=await deadline(nav.serviceWorker.register('/sw.js?_kotoba_build='+encodeURIComponent(server.buildId),{scope:'/',updateViaCache:'none'}),15000,'registration-error');options.onRegistration?.(registration)}catch{throw new UpdateError('registration-error')}}
  try{await downloadWorkerUpdate(registration,options.installTimeoutMs??60000,nav.serviceWorker)}catch(error){throw error instanceof UpdateError?error:new UpdateError('install-error',String(error?.message??'Browser rejected worker update').slice(0,250))}
  if(!registration.active&&!registration.waiting)await deadline(nav.serviceWorker.ready,5000,'worker-unresponsive');
  const latestActive=nav.serviceWorker.controller??registration.active;
  const [a,w]=await Promise.all([readAppBuild(latestActive),readAppBuild(registration.waiting)]);
  emit({activeBuild:a,waitingBuild:w});
  if(registration.waiting){if(w!==server.buildId)throw new UpdateError(w?'download-mismatch':'worker-unresponsive');return emit({status:'waiting'})}
  if(a!==server.buildId)throw new UpdateError(a?'download-mismatch':'worker-unresponsive');
  return emit({status:state.currentBuild===server.buildId?'up-to-date':'update-available'});
 }catch(error){return emit({status:'error',error:error instanceof UpdateError?error.code:'check-timeout',detail:error instanceof UpdateError?error.detail:null})}
}
export function waitForController(container,expected,timeoutMs=20000){
 let stop=()=>{};
 const promise=new Promise((resolve,reject)=>{
  let done=false,probing=false,queued=false;
  const finish=error=>{if(done)return;done=true;clearTimeout(timer);container.removeEventListener('controllerchange',changed);if(error)reject(error);else resolve(expected)};
  const changed=()=>{if(done)return;if(probing){queued=true;return}probing=true;void readAppBuild(container.controller,1000).then(value=>{probing=false;if(value===expected)finish();else if(queued){queued=false;changed()}})};
  const timer=setTimeout(()=>finish(new UpdateError('activation-timeout')),timeoutMs);
  stop=()=>finish(new UpdateError('activation-rejected'));container.addEventListener('controllerchange',changed);changed();
 });
 // An activation refusal cancels its listener immediately; rejection remains handled.
 promise.catch(()=>{});return {promise,cancel:()=>stop()};
}
export async function activateSavedUpdate(worker,save,{expectedBuild,container=globalThis.navigator?.serviceWorker,timeoutMs=20000,recovery=false}={}){
 try{await save()}catch{throw new UpdateError('save-failed')}
 const expected=validBuild(expectedBuild??await readAppBuild(worker));if(!expected||!container)throw new UpdateError('worker-unresponsive');
 if(await readAppBuild(worker)!==expected)throw new UpdateError('download-mismatch');
 const activation=waitForController(container,expected,timeoutMs);
 try{
  const result=await messageWorker(worker,{type:recovery?'RECOVERY_UPDATE':'ACTIVATE_UPDATE',expectedBuild:expected},8000);
  if(result?.status==='blocked')throw new UpdateError('other-windows');
  if(result?.status!=='activating'||validBuild(result.version)!==expected)throw new UpdateError('activation-rejected');
  await activation.promise;return expected;
 }catch(error){activation.cancel();throw error}
}
export function canActivateSnapshot(state){
 if(state.waitingBuild)return state.server?state.waitingBuild===state.server.buildId&&state.error!=='download-mismatch':state.status==='offline';
 return state.status==='update-available'&&state.server?.buildId===state.activeBuild;
}
export function createUpdateGate(intervalMs=300000){
 let last=null;return {take(now=Date.now(),manual=false){if(!manual&&last!==null&&now-last<intervalMs)return false;last=now;return true}};
}
