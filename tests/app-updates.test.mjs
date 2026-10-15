import {test} from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import vm from 'node:vm';
import {watchAppUpdates,checkAppUpdate,downloadWorkerUpdate,readAppBuild,activateSavedUpdate,fetchServerVersion,parseVersionMetadata,createUpdateGate,canActivateSnapshot} from '../lib/platform/app-updates.ts';
const old='kotoba-3.0.0-aaaaaaaaaaaa',latest='kotoba-3.0.1-bbbbbbbbbbbb';
const meta={schema:1,version:'3.0.1',buildId:latest,builtAt:'2026-10-14T00:00:00.000Z',gitCommit:'a'.repeat(40)};
function worker(state='activated',build=old){const w=new EventTarget();w.state=state;w.build=build;w.change=value=>{w.state=value;w.dispatchEvent(new Event('statechange'))};w.postMessage=(data,ports)=>ports[0].postMessage({version:build});return w}
function registration(){const r=new EventTarget();r.waiting=null;r.installing=null;r.active=worker();r.update=async()=>{};return r}
function container(r){const c=new EventTarget();c.controller=r.active;c.getRegistration=async()=>r;return c}
const options=r=>({registration:r,navigator:{onLine:true,serviceWorker:container(r)},currentBuild:old,fetcher:async()=>new Response(JSON.stringify(meta),{headers:{'content-type':'application/json'}})});
test('waiting/install events are observed and every listener is removed on disposal',()=>{
 const r=registration();r.waiting=worker('installed');let calls=0;const stop=watchAppUpdates(r,()=>calls++);assert.equal(calls,1);r.waiting=null;r.installing=worker('installing');r.dispatchEvent(new Event('updatefound'));r.installing.change('installed');assert.equal(calls,2);stop();r.installing.change('installed');assert.equal(calls,2);
});
test('actual worker installation is awaited and rejected installation is explicit',async()=>{
 const r=registration();r.installing=worker('installing');const pending=downloadWorkerUpdate(r,1000);await Promise.resolve();r.installing.change('installed');assert.equal(await pending,true);
 r.installing=worker('installing');const failed=downloadWorkerUpdate(r,1000);await Promise.resolve();r.installing.change('redundant');await assert.rejects(failed,{code:'install-error'});
});
test('timed-out native update never attaches late listeners',async()=>{
 const r=registration();let finish;r.update=()=>new Promise(resolve=>{finish=resolve});r.installing=worker('installing');let listeners=0;r.installing.addEventListener=()=>listeners++;await assert.rejects(()=>downloadWorkerUpdate(r,5),{code:'install-timeout'});finish();await Promise.resolve();assert.equal(listeners,0);
});
test('metadata bypasses caches and carries independent software/build/time/git identity',async()=>{
 const requests=[];const fetcher=async(url,opts)=>{requests.push({url,opts});return new Response(JSON.stringify(meta))};assert.equal((await fetchServerVersion({fetcher,now:1})).buildId,latest);await fetchServerVersion({fetcher,now:1});assert.notEqual(requests[0].url,requests[1].url);assert.equal(requests[0].opts.cache,'no-store');assert.equal(requests[0].opts.credentials,'same-origin');assert.equal(requests[0].opts.headers['Cache-Control'],'no-cache');
 for(const value of [{...meta,schema:2},{...meta,version:'9.9.9'},{...meta,builtAt:'invalid'},{...meta,gitCommit:'not-a-commit'}])assert.throws(()=>parseVersionMetadata(value));
});
test('server errors, HTML/auth redirects, offline transport and timeout are classified distinctly',async()=>{
 for(const [fetcher,code] of [[async()=>new Response('',{status:503}),'http-503'],[async()=>new Response('',{status:401}),'auth-error'],[async()=>new Response('',{status:404}),'metadata-missing'],[async()=>new Response('<html>',{headers:{'content-type':'text/html'}}),'unexpected-page'],[async()=>{throw new TypeError('Failed to fetch')},'network-error'],[()=>new Promise(()=>{}),'metadata-timeout']])await assert.rejects(()=>fetchServerVersion({fetcher,timeoutMs:5}),{code});
});
test('A/B: server publication drives detection, and unchanged running/active builds are latest',async()=>{
 const r=registration();r.update=async()=>{r.waiting=worker('installed',latest)};const found=await checkAppUpdate(options(r));assert.equal(found.server.buildId,latest);assert.equal(found.currentBuild,old);assert.equal(found.activeBuild,old);assert.equal(found.waitingBuild,latest);assert.equal(found.status,'waiting');assert.equal(canActivateSnapshot(found),true);
 r.active=worker('activated',latest);r.waiting=null;const same=options(r);same.currentBuild=latest;assert.equal((await checkAppUpdate(same)).status,'up-to-date');
});
test('C/D: failed downloads cannot claim latest; refresh reconstructs an actual waiting version',async()=>{
 const r=registration();assert.equal((await checkAppUpdate(options(r))).error,'download-mismatch');r.update=async()=>{throw new Error('network fetch failed')};assert.equal((await checkAppUpdate(options(r))).error,'install-error');
 r.waiting=worker('installed',latest);const first=await checkAppUpdate(options(r)),reopened=await checkAppUpdate(options(r));assert.equal(first.waitingBuild,reopened.waitingBuild);assert.equal(reopened.status,'waiting');
 r.waiting=worker('installed',old);const mismatch=await checkAppUpdate(options(r));assert.equal(canActivateSnapshot(mismatch),false);
});
test('unregistered and registration failure are visible rather than a false no-update result',async()=>{
 const r=registration();r.active=worker('activated',latest);const seen=[];const nav={onLine:true,serviceWorker:Object.assign(new EventTarget(),{getRegistration:async()=>undefined,register:async()=>r})};const o={...options(r),registration:null,navigator:nav,currentBuild:latest,onState:s=>seen.push(s.status)};const result=await checkAppUpdate(o);assert.ok(seen.includes('unregistered')&&seen.includes('registering'));assert.equal(result.status,'up-to-date');nav.serviceWorker.register=async()=>{throw new Error('permission denied')};assert.equal((await checkAppUpdate(o)).error,'registration-error');
});
test('G: offline never confirms a server version even when a waiting worker exists',async()=>{
 const r=registration();r.waiting=worker('installed',latest);const o=options(r);o.navigator.onLine=false;o.fetcher=()=>{throw new Error('must not fetch')};const s=await checkAppUpdate(o);assert.equal(s.status,'offline');assert.equal(s.server,null);assert.equal(s.waitingBuild,latest);
});
test('a changed controller does not disguise an older running page as latest',async()=>{
 const r=registration();r.active=worker('activated',latest);const s=await checkAppUpdate(options(r));assert.equal(s.activeBuild,latest);assert.equal(s.currentBuild,old);assert.equal(s.status,'update-available');assert.equal(canActivateSnapshot(s),true);
});
test('E/F: local saving precedes activation; save failure prevents any activation; exact new controller is required',async()=>{
 const events=[],r=registration(),c=container(r),w=worker('installed',latest);w.postMessage=(data,ports)=>{if(data.type==='GET_APP_VERSION')ports[0].postMessage({version:latest});else{events.push('activation');ports[0].postMessage({status:'activating',version:latest});c.controller=worker('activated',latest);c.dispatchEvent(new Event('controllerchange'))}};
 await assert.rejects(()=>activateSavedUpdate(w,async()=>{throw new Error('storage denied')},{expectedBuild:latest,container:c}),{code:'save-failed'});assert.deepEqual(events,[]);
 assert.equal(await activateSavedUpdate(w,async()=>events.push('saved'),{expectedBuild:latest,container:c}),latest);assert.deepEqual(events,['saved','activation']);
});
test('H: refused multi-window activation and an absent acknowledgement never reload',async()=>{
 const r=registration(),c=container(r),w=worker('installed',latest);w.postMessage=(data,ports)=>ports[0].postMessage(data.type==='GET_APP_VERSION'?{version:latest}:{status:'blocked'});await assert.rejects(()=>activateSavedUpdate(w,async()=>{},{expectedBuild:latest,container:c}),{code:'other-windows'});assert.equal(c.controller,r.active);
});
test('automatic checks are throttled while manual checks can bypass the interval',()=>{
 const gate=createUpdateGate(300000);assert.equal(gate.take(0),true);assert.equal(gate.take(1),false);assert.equal(gate.take(20,true),true);assert.equal(gate.take(300019),false);assert.equal(gate.take(300020),true);
});
test('legacy worker replies are bounded and invalid replies never become version evidence',async()=>{
 assert.equal(await readAppBuild(worker('activated','kotoba-2.9.0-preview.1-2c8b8fc75b33')),'kotoba-2.9.0-preview.1-2c8b8fc75b33');assert.equal(await readAppBuild(worker('activated','invalid')),null);assert.equal(await readAppBuild({postMessage:()=>{}},5),null);
});
function sw(windows){const handlers={};let activations=0,deleted=0;const source={id:'update',url:'https://kotoba.test/api/app-update.html'};vm.runInNewContext(readFileSync('public/sw.js','utf8'),{URL,caches:{delete:()=>deleted++},self:{location:{origin:'https://kotoba.test'},clients:{claim:async()=>{},matchAll:async()=>windows},addEventListener:(name,handler)=>handlers[name]=handler,skipWaiting:async()=>activations++}});return {source,handlers,send:async(type='ACTIVATE_UPDATE',target=source,expectedBuild)=>{let task,reply;handlers.message({data:{type,expectedBuild},source:target,ports:[{postMessage:v=>{reply=v}}],waitUntil:p=>{task=p}});await task;return {reply,activations}},deleted:()=>deleted}}
test('worker enforces same-origin, expected identity and all-window fences for both normal and recovery clients',async()=>{
 const source={id:'update',url:'https://kotoba.test/api/app-update.html'};
 for(const type of ['ACTIVATE_UPDATE','RECOVERY_UPDATE']){const blocked=await sw([source,{id:'study',url:'https://kotoba.test/'}]).send(type);assert.equal(blocked.reply.status,'blocked');assert.equal(blocked.activations,0);assert.equal((await sw([source]).send(type)).activations,1)}
 const wrong=await sw([source]).send('ACTIVATE_UPDATE',source,latest);assert.equal(wrong.reply.status,'mismatch');assert.equal(wrong.activations,0);assert.equal((await sw([]).send('ACTIVATE_UPDATE',{id:'foreign',url:'https://foreign.test/'})).activations,0);
 const badPath=await sw([]).send('RECOVERY_UPDATE',{id:'bad',url:'https://kotoba.test/#Settings'});assert.equal(badPath.activations,0);
});
test('activation preserves caches and metadata/recovery paths bypass even cached app navigation',async()=>{
 const s=sw([]);await s.handlers.activate({waitUntil:async p=>await p});assert.equal(s.deleted(),0);for(const path of ['/api/app-version.json?_kotoba_update=1','/api/app-update.html','/api/app-update.js','/api/update-core.js']){let intercepted=false;s.handlers.fetch({request:{url:'https://kotoba.test'+path,method:'GET',mode:'navigate'},respondWith:()=>{intercepted=true}});assert.equal(intercepted,false)}
});
function recoveryPage(responseMeta=meta,waitingBuild=latest){
 const elements=new Map();for(const name of ['check','activate','confirmation','confirmed','status','build','current-build','waiting-build']){const e=new EventTarget();Object.assign(e,{hidden:false,disabled:false,checked:false,textContent:''});elements.set(name,e)}
 const r=registration();r.waiting=worker('installed',waitingBuild);const c=container(r);let activations=0;
 r.waiting.postMessage=(data,ports)=>{if(data.type==='GET_APP_VERSION')ports[0].postMessage({version:waitingBuild});else{activations++;ports[0].postMessage({status:'blocked'})}};
 const context=vm.createContext({document:{getElementById:n=>elements.get(n)},navigator:{onLine:true,serviceWorker:c},fetch:async()=>new Response(JSON.stringify(responseMeta)),Response,MessageChannel,AbortController,setTimeout,clearTimeout,URL,console,sessionStorage:{setItem:()=>{}},location:{href:'https://kotoba.test/api/app-update.html',replace:()=>{throw new Error('unexpected redirect')}}});
 vm.runInContext(readFileSync('public/api/update-core.js','utf8').replace(/^export /gm,''),context);vm.runInContext(readFileSync('public/api/app-update.js','utf8').replace(/^import .*;\n/m,''),context);
 return {elements,activations:()=>activations,ready:async()=>{for(let i=0;i<100&&elements.get('check').disabled;i++)await new Promise(r=>setTimeout(r,5));assert.equal(elements.get('check').disabled,false)}};
}
test('J: independent recovery restores pending versions and requires explicit confirmation before multi-window activation',async()=>{
 const p=recoveryPage();await p.ready();assert.equal(p.elements.get('activate').hidden,false);assert.equal(p.elements.get('activate').disabled,true);p.elements.get('activate').dispatchEvent(new Event('click'));assert.equal(p.activations(),0);p.elements.get('confirmed').checked=true;p.elements.get('confirmed').dispatchEvent(new Event('change'));p.elements.get('activate').dispatchEvent(new Event('click'));for(let i=0;i<100&&!p.elements.get('status').textContent.includes('其他 Kotoba');i++)await new Promise(r=>setTimeout(r,5));assert.equal(p.activations(),1);assert.match(p.elements.get('status').textContent,/其他 Kotoba/);
});
test('recovery never offers activation for malformed metadata or a mismatched pending build',async()=>{
 const p=recoveryPage({...meta,buildId:'invalid'});await p.ready();assert.match(p.elements.get('status').textContent,/元数据无效/);assert.equal(p.elements.get('activate').hidden,true);
 const mismatch=recoveryPage(meta,old);await mismatch.ready();assert.equal(mismatch.elements.get('activate').hidden,true);
});

test('legacy clients receive a recovery URL and are never activated across another open window',async()=>{
 let response;const source={id:'legacy',url:'https://kotoba.test/#Settings',postMessage:value=>{response=value}},s=sw([source,{id:'other',url:'https://kotoba.test/'}]);let task;s.handlers.message({data:{type:'ACTIVATE_UPDATE'},source,ports:[],waitUntil:p=>{task=p}});await task;assert.equal(response.status,'blocked');assert.equal(response.recoveryUrl,'/api/app-update.html?reason=other-windows');
});

test('worker registration uses a fresh build-specific URL without changing scope or unregistering',async()=>{
 const r=registration(),o=options(r),scripts=[];o.navigator.serviceWorker.register=async(url,config)=>{scripts.push({url,config});r.waiting=worker('installed',latest);return r};const result=await checkAppUpdate(o);assert.equal(result.status,'waiting');assert.equal(scripts[0].url,'/sw.js?_kotoba_build='+latest);assert.equal(scripts[0].config.scope,'/');assert.equal(scripts[0].config.updateViaCache,'none');
});

test('Sites canonical extensionless recovery URL can activate after redirect; unrelated paths get an explicit refusal',async()=>{
 for(const path of ['/api/app-update','/api/app-update/','/api/app-update.html']){
  const source={id:'update',url:'https://kotoba.test'+path};
  const result=await sw([source]).send('RECOVERY_UPDATE',source);
  assert.equal(result.reply?.status,'activating',path);assert.equal(result.activations,1);
 }
 const source={id:'update',url:'https://kotoba.test/not-recovery'};
 const refused=await sw([source]).send('RECOVERY_UPDATE',source);
 assert.equal(refused.reply?.status,'rejected');assert.equal(refused.activations,0);
});
