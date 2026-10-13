/* Independent, network-only recovery page; never reads or resets learning storage. */
(()=>{
 const check=document.getElementById('check'),activate=document.getElementById('activate');
 const confirmation=document.getElementById('confirmation'),confirmed=document.getElementById('confirmed');
 const status=document.getElementById('status'),build=document.getElementById('build');
 let registration=null,expected=null,busy=false;
 const version=value=>typeof value==='string'&&/^kotoba-\d+\.\d+\.\d+(?:-[0-9A-Za-z]+(?:[.-][0-9A-Za-z]+)*)?(?:\+[0-9A-Za-z]+(?:[.-][0-9A-Za-z]+)*)?-[a-z0-9]+$/.test(value)?value:null;
 const checkFailure=(error,phase)=>{
  if(error.message==='unsupported')return '此浏览器不支持安装版更新。请使用 Chrome、Edge 或 Safari 打开此页。';
  if(error.message==='offline')return '浏览器报告当前离线，请恢复网络连接后重试。';
  if(error.message==='auth required')return '更新请求需要网站登录。请在此浏览器重新登录网站后再检查。';
  if(error.message==='unexpected page')return '服务器返回了网页而不是更新文件，请确认此浏览器已登录网站后重试。';
  if(error.message==='invalid build')return '服务器返回的更新文件没有有效构建标识，无法确认版本。请稍后重新检查；这不表示手机离线。';
  if(/^http-\d{3}$/.test(error.message))return '更新服务器返回 HTTP '+error.message.slice(5)+'，请稍后重试。';
  if(['stale download','stale app'].includes(error.message))return '服务器与已下载版本暂时不一致，请重新检查更新。';
  if(error.message==='worker timeout'||error.message==='worker missing')return '浏览器未返回已下载版本信息，请重新检查或在 Chrome 中打开更新页。';
  if(error.message==='install timeout')return '更新下载超过等待时间，请重新检查。';
  if(error.message==='install failed'||phase==='install')return '浏览器未能安装更新文件，请重新检查或在 Chrome 中打开更新页。';
  if(error.name==='TimeoutError'||error.name==='AbortError')return '更新服务器响应超时，请重新检查。';
  return '更新请求未能完成，请重试；这不能确认手机离线。';
 };
 const message=(worker,data,timeout=8000)=>new Promise((resolve,reject)=>{
  if(!worker){reject(new Error('worker missing'));return}
  const channel=new MessageChannel();
  const finish=(value,error)=>{clearTimeout(timer);channel.port1.close();channel.port2.close();error?reject(error):resolve(value)};
  const timer=setTimeout(()=>finish(null,new Error('worker timeout')),timeout);
  channel.port1.onmessage=e=>finish(e.data);
  try{worker.postMessage(data,[channel.port2])}catch(error){finish(null,error)}
 });
 const waitForInstall=worker=>new Promise((resolve,reject)=>{
  if(!worker){resolve();return}
  const finish=error=>{clearTimeout(timer);worker.removeEventListener('statechange',changed);error?reject(error):resolve()};
  const changed=()=>{if(['installed','activated'].includes(worker.state))finish();else if(worker.state==='redundant')finish(new Error('install failed'))};
  const timer=setTimeout(()=>finish(new Error('install timeout')),60000);
  worker.addEventListener('statechange',changed);changed();
 });
 const waitForController=target=>new Promise((resolve,reject)=>{
  const finish=error=>{clearTimeout(timer);navigator.serviceWorker.removeEventListener('controllerchange',changed);error?reject(error):resolve()};
  const changed=()=>{void message(navigator.serviceWorker.controller,{type:'GET_APP_VERSION'},2000).then(result=>{if(version(result?.version)===target)finish()}).catch(()=>{})};
  const timer=setTimeout(()=>finish(new Error('activation timeout')),15000);
  navigator.serviceWorker.addEventListener('controllerchange',changed);changed();
 });
 confirmed.addEventListener('change',()=>{activate.disabled=!confirmed.checked||busy});
 check.addEventListener('click',async()=>{
  if(busy)return;busy=true;expected=null;build.textContent='';check.disabled=true;activate.hidden=true;confirmation.hidden=true;confirmed.checked=false;activate.disabled=true;
  let phase='download';
  try{
   if(!navigator.onLine)throw new Error('offline');
   if(!('serviceWorker' in navigator))throw new Error('unsupported');
   status.textContent='正在检查并下载新版本，请保持此页打开…';
   const response=await fetch('/sw.js',{cache:'no-store',credentials:'same-origin',signal:AbortSignal.timeout(15000)});
   if([401,403].includes(response.status))throw new Error('auth required');
   if(!response.ok)throw new Error('http-'+response.status);
   const source=await response.text();
   if(/text\/html/i.test(response.headers.get('content-type')??'')||/^\s*<!doctype html|^\s*<html/i.test(source))throw new Error('unexpected page');
   const match=source.match(/const VERSION\s*=\s*["']([^"']+)["']/);expected=version(match?.[1]);
   if(!expected)throw new Error('invalid build');
   build.textContent='服务器构建：'+expected.replace(/^kotoba-/,'');
   phase='install';
   registration=await navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'});
   await registration.update();await waitForInstall(registration.installing);
   phase='verify';
   const waiting=registration.waiting;
   if(waiting){
    const result=await message(waiting,{type:'GET_APP_VERSION'});
    if(version(result?.version)!==expected)throw new Error('stale download');
    status.textContent='新版本已下载。确认进度已同步并关闭其他窗口后，即可安装。';
    confirmation.hidden=false;activate.hidden=false;
   }else{
    const result=await message(registration.active,{type:'GET_APP_VERSION'});
    if(version(result?.version)!==expected)throw new Error('stale app');
    status.textContent='最新构建已激活，点击「返回 Kotoba」查看新界面。';
   }
  }catch(error){status.textContent=checkFailure(error,phase)+' 学习数据没有被清除。'}
  finally{busy=false;check.disabled=false;activate.disabled=!confirmed.checked}
 });
 activate.addEventListener('click',async()=>{
  if(busy||!confirmed.checked)return;busy=true;activate.disabled=true;check.disabled=true;
  try{
   if(!registration?.waiting){status.textContent='待安装版本已变化，请重新检查更新。';return}
   const result=await message(registration.waiting,{type:'RECOVERY_UPDATE'});
   if(result?.status==='blocked'){
    status.textContent='仍有其他 Kotoba 窗口打开。请关闭它们后，再点击安装更新。';return;
   }
   if(result?.status!=='activating'||version(result?.version)!==expected)throw new Error('activation rejected');
   status.textContent='正在激活新版本，随后返回 Kotoba…';
   await waitForController(expected);location.replace('/#Settings');
  }catch{status.textContent='更新尚未完成，请重新检查；学习数据没有被清除。'}
  finally{busy=false;activate.disabled=!confirmed.checked;check.disabled=false}
 });
})();
