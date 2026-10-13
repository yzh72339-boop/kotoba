/* Loopback-only Chromium QA with real compiled workers and isolated storage.
   No owner token, Supabase access or physical-device acceptance is involved. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const {chromium}=createRequire(import.meta.url)('playwright');
const output=process.env.UPDATE_AUDIT_DIR??'/workspace/deliverables/kotoba-recovery-update';
const root=resolve('out');
const compiled=await readFile(resolve(root,'sw.js'),'utf8');
const target=compiled.match(/const VERSION=['"]([^'"]+)['"]/)?.[1];
const packageInfo=JSON.parse(await readFile('package.json','utf8'));assert.ok(target.startsWith('kotoba-'+packageInfo.version+'-'));
const old='kotoba-2.8.1-previousbuild';let served=old;
const mime={'.js':'application/javascript','.css':'text/css','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.html':'text/html'};
const server=createServer(async(req,res)=>{
 try{
  const path=new URL(req.url,'http://127.0.0.1').pathname;
  if(path==='/sw.js'){res.writeHead(200,{'Content-Type':'application/javascript','Cache-Control':'no-store'});res.end(compiled.replace(target,served));return}
  if(path==='/'||path==='/index.html'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><html><title>Isolated update QA</title><body>Isolated update QA</body></html>');return}
  const file=resolve(root,'.'+decodeURIComponent(path));if(!file.startsWith(root+sep)){res.writeHead(403);res.end();return}
  const data=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]??'application/octet-stream','Cache-Control':'no-store'});res.end(data);
 }catch{if(!res.headersSent)res.writeHead(404);res.end()}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
await mkdir(output,{recursive:true});
const report={scope:'Real workers on loopback; Chromium mobile emulation and isolated storage only. Not owner, physical Android/iOS or installed PWA.',build:target,checks:[],errors:[]};
let browser,activePage;
try{
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 for(const width of [360,390,430]){
  served=old;
  const context=await browser.newContext({viewport:{width,height:844},reducedMotion:width===430?'reduce':'no-preference',colorScheme:width===390?'dark':'light'});
  context.on('page',page=>page.on('pageerror',error=>report.errors.push(error.message)));
  const page=await context.newPage();activePage=page;await page.goto(origin+'/api/app-update.html');
  await page.evaluate(async()=>{await navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'});await navigator.serviceWorker.ready});
  await page.waitForFunction(()=>navigator.serviceWorker.controller!==null);
  await page.evaluate(async()=>{
   localStorage.setItem('update-qa-session','isolated-session-preserved');
   const db=await new Promise((resolve,reject)=>{const request=indexedDB.open('update-qa-learning',1);request.onupgradeneeded=()=>request.result.createObjectStore('state');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});
   await new Promise((resolve,reject)=>{const tx=db.transaction('state','readwrite');tx.objectStore('state').put({course:'stable-course-id',step:2,queued:1},'learning');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close();
   const cache=await caches.open('kotoba-personal-downloads');await cache.put('/downloads/update-qa',new Response('download-preserved'));
  });
  const other=await context.newPage();await other.goto(origin+'/#Review');served=target;
  await page.locator('#check').click();
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('新版本已下载'));
  assert.equal(await page.locator('#activate').isEnabled(),false);
  assert.equal(await page.locator('#build').textContent(),'服务器构建：'+target.replace(/^kotoba-/,''));
  await page.locator('#confirmed').check();await page.locator('#activate').click();
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('其他 Kotoba'));
  await page.screenshot({path:resolve(output,`blocked-${width}.png`),fullPage:true});
  await other.close();
  // Closing a page resolves before every worker observes its removal.
  const workers=context.serviceWorkers();const waiting=workers[workers.length-1];
  for(let attempt=0;attempt<50;attempt++){
   const count=await waiting.evaluate(async()=> (await self.clients.matchAll({type:'window',includeUncontrolled:true})).length);
   if(count===1)break;
   if(attempt===49)throw new Error('Closed QA window remained in worker client list');
   await page.waitForTimeout(20);
  }
  await page.locator('#activate').click();
  await page.waitForURL('**/#Settings');
  const state=await page.evaluate(async()=>{
   const db=await new Promise(resolve=>{const request=indexedDB.open('update-qa-learning');request.onsuccess=()=>resolve(request.result)});
   const learning=await new Promise(resolve=>{const request=db.transaction('state').objectStore('state').get('learning');request.onsuccess=()=>resolve(request.result)});db.close();
   const download=await(await(await caches.open('kotoba-personal-downloads')).match('/downloads/update-qa')).text();
   const build=await new Promise(resolve=>{const channel=new MessageChannel();channel.port1.onmessage=event=>{channel.port1.close();resolve(event.data.version)};navigator.serviceWorker.controller.postMessage({type:'GET_APP_VERSION'},[channel.port2])});
   return {learning,download,build,session:localStorage.getItem('update-qa-session')};
  });
  assert.deepEqual(state,{learning:{course:'stable-course-id',step:2,queued:1},download:'download-preserved',build:target,session:'isolated-session-preserved'});
  await page.goto(origin+'/api/app-update.html');await page.locator('#check').click();
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('最新构建已激活'));
  assert.equal(await page.locator('#activate').isVisible(),false);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:resolve(output,`updated-${width}.png`),fullPage:true});
  await context.setOffline(true);await page.locator('#check').click();
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('浏览器报告当前离线'));
  report.checks.push({width,theme:width===390?'dark':'light',reducedMotion:width===430,previewDownload:true,explicitConfirmation:true,otherWindowBlocked:true,activation:true,repeatCheck:true,storagePreserved:state,offlineClassified:true,noOverflow:true});
  await context.close();
 }
 assert.deepEqual(report.errors,[]);
}catch(error){
 report.errors.push(error.message);
 if(activePage&&!activePage.isClosed()){
  report.failure=await activePage.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();return {url:location.href,status:document.querySelector('#status')?.textContent,build:document.querySelector('#build')?.textContent,waiting:r?.waiting?.state,active:r?.active?.state,controller:navigator.serviceWorker.controller?.state}});
  await activePage.screenshot({path:resolve(output,'failure.png'),fullPage:true});
 }
 throw error;
}
finally{
 await browser?.close();await new Promise(resolve=>server.close(resolve));
 await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}
