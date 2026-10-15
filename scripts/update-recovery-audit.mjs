/* Real compiled workers + archived prior worker on loopback. All learning/auth
   records are isolated fixtures: never production owner/device/Sync acceptance. */
import assert from 'node:assert/strict';import {createServer} from 'node:http';
import {createRequire} from 'node:module';import {readFile,mkdir,writeFile} from 'node:fs/promises';import {resolve,extname,sep} from 'node:path';
const {chromium}=createRequire(import.meta.url)('playwright');
const output=process.env.UPDATE_AUDIT_DIR??'/workspace/deliverables/kotoba-update-system/browser',root=resolve('out'),prior=process.env.UPDATE_OLD_ROOT?resolve(process.env.UPDATE_OLD_ROOT):null;
const compiled=await readFile(resolve(root,'sw.js'),'utf8'),metadata=JSON.parse(await readFile(resolve(root,'api/app-version.json'),'utf8')),target=metadata.buildId;
const oldSource=prior?await readFile(resolve(prior,'sw.js'),'utf8'):compiled.replaceAll(target,'kotoba-3.0.0-previousbuild'),old=oldSource.match(/const VERSION=['"]([^'"]+)['"]/)?.[1];assert.ok(old&&old!==target);
const oldVersion=old.replace(/^kotoba-/,'').replace(/-[a-z0-9]+$/,'');
let phase='old',failMetadata=false,failAsset=false,staleRoot=false;
const asset=compiled.match(/"(\/_next\/static\/[^" ]+\.js)"/)?.[1];assert.ok(asset);
const mime={'.json':'application/json','.js':'application/javascript','.html':'text/html','.css':'text/css','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2'};
const harness=build=>`<!doctype html><html><head><meta name="kotoba-build" content="${build}"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>Isolated update protocol QA<script type="module">import * as updates from '/api/update-core.js';window.updates=updates;</script></body></html>`;
const server=createServer(async(req,res)=>{
 try{
  const path=new URL(req.url,'http://127.0.0.1').pathname;
  res.setHeader('Cache-Control','no-store');
  // Match the production host's canonical redirect rather than assuming the
  // requested .html path is also the worker message source's pathname.
  if(path==='/api/app-update.html'){res.writeHead(308,{Location:'/api/app-update'+new URL(req.url,'http://127.0.0.1').search});res.end();return}
  if(path==='/api/app-version.json'){if(failMetadata){res.writeHead(503);res.end('unavailable');return}res.setHeader('Content-Type','application/json');res.end(JSON.stringify(phase==='new'?metadata:{...metadata,version:oldVersion,buildId:old}));return}
  if(path==='/sw.js'){res.setHeader('Content-Type','application/javascript');res.end(phase==='new'?compiled:oldSource);return}
  if(path==='/'||path==='/index.html'){res.setHeader('Content-Type','text/html');res.end(harness(phase==='new'&&!staleRoot?target:old));return}
  if(failAsset&&path===asset){res.writeHead(503);res.end('simulated missing release asset');return}
  const folder=phase==='old'&&prior&&!path.startsWith('/api/')?prior:root;
  const file=resolve(folder,'.'+decodeURIComponent(path==='/api/app-update'?'/api/app-update.html':path));if(!file.startsWith(folder+sep)){res.writeHead(403);res.end();return}
  const data=await readFile(file);res.setHeader('Content-Type',mime[extname(file)]??'application/octet-stream');res.end(data);
 }catch{if(!res.headersSent)res.writeHead(404);res.end()}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
await mkdir(output,{recursive:true});let browser,page;
const report={scope:'Real browser/SW/cache/IndexedDB on loopback, isolated fixture data; not production account/Android install/device/cross-device',newBuild:target,priorBuild:old,priorWorker:prior?'archived previous production build':'version-retagged current code',checks:[],errors:[]};
const inspect=page=>page.evaluate(async()=>window.updates.checkAppUpdate({currentBuild:document.querySelector('meta[name="kotoba-build"]')?.content}));
const preservation=page=>page.evaluate(async()=>{
 const db=await new Promise((r,j)=>{const q=indexedDB.open('update-system-qa');q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error)});
 const state=await new Promise((r,j)=>{const tx=db.transaction(['state','queue']);const a=tx.objectStore('state').get('learning'),b=tx.objectStore('queue').getAll();tx.oncomplete=()=>r({learning:a.result,queue:b.result});tx.onerror=()=>j(tx.error)});db.close();
 const download=await(await(await caches.open('kotoba-personal-downloads')).match('/downloads/fixture-lesson')).text();
 return {...state,download,auth:localStorage.getItem('sb-update-qa-auth'),keys:await caches.keys()};
});
try{
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 for(const width of [360,390,430]){
  phase='old';failMetadata=false;failAsset=false;staleRoot=false;
  const context=await browser.newContext({viewport:{width,height:844},colorScheme:width===390?'dark':'light',reducedMotion:width===430?'reduce':'no-preference',...(width===390?{recordVideo:{dir:output,size:{width,height:844}}}:{})});
  const errors=[];context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
  page=await context.newPage();await page.goto(origin);await page.waitForFunction(()=>window.updates);
  await page.evaluate(async()=>{await navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'});await navigator.serviceWorker.ready});await page.waitForFunction(()=>navigator.serviceWorker.controller!==null);
  await page.evaluate(async()=>{
   localStorage.setItem('sb-update-qa-auth','fixture-session-never-a-real-token');
   const db=await new Promise((r,j)=>{const q=indexedDB.open('update-system-qa',1);q.onupgradeneeded=()=>{q.result.createObjectStore('state');q.result.createObjectStore('queue')};q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error)});
   await new Promise((r,j)=>{const tx=db.transaction(['state','queue'],'readwrite');tx.objectStore('state').put({completed:['stable-course'],reviews:{word:{due:1900000000000,interval:3,repetitions:2}},notes:{lesson:'saved note'},readingPositions:{article:{anchor:2,progress:.4}},favorites:['word'],sessions:[{id:'once',count:1}]},'learning');tx.objectStore('queue').put({id:'pending-write',user:'fixture-user',operation:'revision-4'},'pending');tx.oncomplete=r;tx.onerror=()=>j(tx.error)});db.close();
   await(await caches.open('kotoba-personal-downloads')).put('/downloads/fixture-lesson',new Response('download remains available offline'));
  });
  const before=await preservation(page);assert.equal((await inspect(page)).status,'up-to-date');
  failMetadata=true;const http=await inspect(page);assert.equal(http.error,'http-503');failMetadata=false;
  phase='new';failAsset=true;const failed=await inspect(page);assert.equal(failed.error,'install-error');assert.equal(failed.activeBuild,old);assert.equal(failed.waitingBuild,null);failAsset=false;
  staleRoot=true;const stale=await inspect(page);assert.equal(stale.error,'install-error');staleRoot=false;
  await page.goto(origin+'/api/app-update.html');assert.equal(new URL(page.url()).pathname,'/api/app-update');await page.waitForFunction(()=>!document.querySelector('#check').disabled&&document.querySelector('#status').textContent.includes('新版已下载'));
  assert.equal(await page.locator('#activate').isEnabled(),false);assert.ok((await page.locator('#build').textContent()).includes(target));
  await page.reload();await page.waitForFunction(()=>!document.querySelector('#check').disabled&&document.querySelector('#waiting-build').textContent.includes('kotoba-3.0.1-'));
  const other=await context.newPage();await other.goto(origin+'/#Review');
  await page.goto(origin+'/#Settings');await page.waitForFunction(()=>window.updates);
  const legacyReply=await page.evaluate(async()=>await new Promise(resolve=>{navigator.serviceWorker.addEventListener('message',function reply(e){if(e.data.type==='UPDATE_RESULT'){navigator.serviceWorker.removeEventListener('message',reply);resolve(e.data)}});navigator.serviceWorker.getRegistration().then(r=>r.waiting.postMessage({type:'ACTIVATE_UPDATE'}))}));assert.equal(legacyReply.status,'blocked');assert.equal(legacyReply.recoveryUrl,'/api/app-update.html?reason=other-windows');
  // Loaded old JS cannot gain new listeners; simulate the documented user action.
  await page.goto(origin+legacyReply.recoveryUrl);await page.waitForFunction(()=>!document.querySelector('#check').disabled&&document.querySelector('#status').textContent.includes('其他 Kotoba'));
  await page.locator('#confirmed').check();await page.locator('#activate').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('其他 Kotoba'));
  await page.screenshot({path:resolve(output,`blocked-${width}.png`),fullPage:true});await other.close();
  // Close acknowledgement is asynchronous in Chromium; still enforce the real
  // worker's barrier rather than overriding it when a client lingers briefly.
  await page.waitForTimeout(350);await page.locator('#activate').click();await page.waitForURL('**/#Settings');
  const after=await preservation(page);assert.deepEqual(after.learning,before.learning);assert.deepEqual(after.queue,before.queue);assert.equal(after.auth,before.auth);assert.equal(after.download,before.download);assert.ok(before.keys.every(k=>after.keys.includes(k)));
  await page.waitForFunction(()=>window.updates);const current=await inspect(page);assert.equal(current.currentBuild,target);assert.equal(current.activeBuild,target);assert.equal(current.status,'up-to-date');
  await page.goto(origin+'/api/app-update.html');await page.waitForFunction(()=>document.querySelector('#status').textContent==='已是最新版本。');
  assert.equal(await page.locator('#activate').isVisible(),false);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:resolve(output,`updated-${width}.png`),fullPage:true});
  await context.setOffline(true);await page.locator('#check').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('当前离线'));assert.ok((await page.locator('#build').textContent()).includes('未联网确认'));
  assert.deepEqual(errors,[]);report.checks.push({width,A:'archived old worker detects published new metadata',B:'unchanged server/current/active latest',C:{asset:failed.error,detail:failed.detail,staleRoot:stale.error,metadataHTTP:http.error},D:'reload reconstructs waiting build',E:current.currentBuild,F:{learning:true,queue:true,auth:true,download:true,priorCaches:true},G:'offline does not claim server version',H:'other window blocked',I:'mobile Chromium emulation only, no Android installation',J:'network recovery page bypasses old shell',dark:width===390,reducedMotion:width===430});await context.close();
 }
}catch(error){report.errors.push(error.message);if(page&&!page.isClosed()){report.failure=await page.evaluate(async()=>({url:location.href,status:document.querySelector('#status')?.textContent,waiting:(await navigator.serviceWorker.getRegistration())?.waiting?.state}));await page.screenshot({path:resolve(output,'failure.png'),fullPage:true})}throw error}
finally{await browser?.close();await new Promise(r=>server.close(r));await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
