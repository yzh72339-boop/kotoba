import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {watchAppUpdates,checkAppUpdate,readAppBuild,activateSavedUpdate} from '../lib/platform/app-updates.ts';
function worker(state='installing'){
 const target=new EventTarget();target.state=state;
 target.change=value=>{target.state=value;target.dispatchEvent(new Event('statechange'))};
 return target;
}
function registration(){const target=new EventTarget();target.waiting=null;target.installing=null;target.update=async()=>{};return target}
test('waiting update is detected and listeners are removed on disposal',()=>{
 const r=registration();r.waiting=worker('installed');let calls=0;const stop=watchAppUpdates(r,()=>calls++);assert.equal(calls,1);
 r.waiting=null;r.installing=worker();r.dispatchEvent(new Event('updatefound'));r.installing.change('installed');assert.equal(calls,2);
 stop();r.installing.change('installed');r.dispatchEvent(new Event('updatefound'));assert.equal(calls,2);
});
test('manual check waits for installation instead of claiming up to date too early',async()=>{
 const r=registration();r.installing=worker();const pending=checkAppUpdate(r,1000);await Promise.resolve();r.installing.change('installed');assert.equal(await pending,true);
 r.installing=null;assert.equal(await checkAppUpdate(r),false);r.waiting=worker('installed');assert.equal(await checkAppUpdate(r),true);
});
test('network failure and rejected installation produce a retryable error',async()=>{
 const r=registration();r.update=async()=>{throw new Error('offline')};await assert.rejects(()=>checkAppUpdate(r),/offline/);
 r.update=async()=>{};r.installing=worker();const pending=checkAppUpdate(r,1000);await Promise.resolve();r.installing.change('redundant');await assert.rejects(pending,/installation failed/);
});
test('timed out native update never attaches a late installation listener',async()=>{
 const r=registration();let finish;r.update=()=>new Promise(resolve=>{finish=resolve});r.installing=worker();let listeners=0;r.installing.addEventListener=()=>listeners++;
 await assert.rejects(()=>checkAppUpdate(r,5),/timed out/);finish();await Promise.resolve();assert.equal(listeners,0);
});
test('learning state is saved before activation; storage failure prevents activation',async()=>{
 const events=[];const w={postMessage:message=>events.push(message.type)};
 await activateSavedUpdate(w,async()=>events.push('saved'));assert.deepEqual(events,['saved','ACTIVATE_UPDATE']);
 events.length=0;await assert.rejects(()=>activateSavedUpdate(w,async()=>{throw new Error('storage denied')}));assert.deepEqual(events,[]);
});
test('active build uses a bounded worker response and old workers time out safely',async()=>{
 const reply=version=>({postMessage:(_,ports)=>ports[0].postMessage({version})});
 assert.equal(await readAppBuild(reply('kotoba-2.5.2-abcdef012345')),'kotoba-2.5.2-abcdef012345');
 assert.equal(await readAppBuild(reply('not-a-build')),null);assert.equal(await readAppBuild({postMessage:()=>{}},5),null);
});
test('worker version message is read only and never skips waiting',()=>{
 const handlers={};let activations=0,response;
 vm.runInNewContext(readFileSync('public/sw.js','utf8'),{self:{addEventListener:(event,handler)=>handlers[event]=handler,skipWaiting:()=>activations++}});
 handlers.message({data:{type:'GET_APP_VERSION'},ports:[{postMessage:value=>{response=value}}]});
 assert.match(response.version,/^kotoba-/);assert.equal(activations,0);
 handlers.message({data:{type:'ACTIVATE_UPDATE'}});assert.equal(activations,1);
});
function recoveryWorker(windows){
 const handlers={};let activations=0;
 vm.runInNewContext(readFileSync('public/sw.js','utf8'),{URL,self:{location:{origin:'https://kotoba.example.test'},clients:{matchAll:async options=>{assert.equal(options.includeUncontrolled,true);return windows}},addEventListener:(event,handler)=>handlers[event]=handler,skipWaiting:async()=>{activations++}}});
 return {send:async(source)=>{let task,reply;handlers.message({data:{type:'RECOVERY_UPDATE'},source,ports:[{postMessage:value=>{reply=value}}],waitUntil:promise=>{task=promise}});await task;return {reply,activations}}};
}
test('recovery update refuses activation while another learning window is open',async()=>{
 const source={id:'update',url:'https://kotoba.example.test/api/app-update.html'};
 const result=await recoveryWorker([source,{id:'study',url:'https://kotoba.example.test/#Review'}]).send(source);
 assert.equal(result.reply.status,'blocked');assert.equal(result.activations,0);
});
test('recovery activates only from its own page after other windows are closed',async()=>{
 const source={id:'update',url:'https://kotoba.example.test/api/app-update.html'};
 const result=await recoveryWorker([source]).send(source);assert.equal(result.reply.status,'activating');assert.equal(result.activations,1);
 for(const url of ['https://kotoba.example.test/#Settings','https://foreign.example/api/app-update.html']){
  const denied=await recoveryWorker([]).send({id:'other',url});assert.equal(denied.reply,undefined);assert.equal(denied.activations,0);
 }
});
test('old cache exclusion reaches the independent update page and script over the network',()=>{
 const handlers={};vm.runInNewContext(readFileSync('public/sw.js','utf8'),{URL,self:{location:{origin:'https://kotoba.example.test'},addEventListener:(event,handler)=>handlers[event]=handler}});
 for(const path of ['/api/app-update.html','/api/app-update.js']){
  let intercepted=false;handlers.fetch({request:{url:'https://kotoba.example.test'+path,method:'GET',mode:'navigate'},respondWith:()=>{intercepted=true}});assert.equal(intercepted,false);
 }
});
function recoveryPage(waitingVersion='kotoba-2.5.2-abcdef012345'){
 const elements=new Map();for(const name of ['check','activate','confirmation','confirmed','status','build']){const element=new EventTarget();element.hidden=false;element.disabled=false;element.checked=false;element.textContent='';elements.set(name,element)}
 let activations=0,redirects=0;
 const build='kotoba-2.5.2-abcdef012345';
 const waiting={postMessage:(data,ports)=>{if(data.type==='RECOVERY_UPDATE'){activations++;ports[0].postMessage({status:'blocked'})}else ports[0].postMessage({version:waitingVersion})}};
 const registration={waiting,installing:null,update:async()=>{}};
 vm.runInNewContext(readFileSync('public/api/app-update.js','utf8'),{document:{getElementById:name=>elements.get(name)},navigator:{onLine:true,serviceWorker:{register:async()=>registration}},MessageChannel,AbortSignal,setTimeout,clearTimeout,fetch:async()=>new Response(`const VERSION="${build}";`),location:{replace:()=>redirects++}});
 const waitUntil=async predicate=>{for(let i=0;i<50&&!predicate();i++)await new Promise(resolve=>setTimeout(resolve,2));assert.ok(predicate())};
 return {elements,waiting,waitUntil,get activations(){return activations},get redirects(){return redirects}};
}
test('independent update page waits for explicit confirmation and handles other windows safely',async()=>{
 const page=recoveryPage();page.elements.get('check').dispatchEvent(new Event('click'));
 await page.waitUntil(()=>!page.elements.get('check').disabled);
 assert.equal(page.elements.get('activate').hidden,false);assert.equal(page.elements.get('activate').disabled,true);
 page.elements.get('activate').dispatchEvent(new Event('click'));assert.equal(page.activations,0);
 page.elements.get('confirmed').checked=true;page.elements.get('confirmed').dispatchEvent(new Event('change'));
 page.elements.get('activate').dispatchEvent(new Event('click'));
 await page.waitUntil(()=>page.elements.get('status').textContent.includes('其他 Kotoba'));
 assert.equal(page.activations,1);assert.equal(page.redirects,0);
});
test('downloaded build mismatch never offers recovery activation',async()=>{
 const page=recoveryPage('kotoba-2.5.2-old');page.elements.get('check').dispatchEvent(new Event('click'));
 await page.waitUntil(()=>!page.elements.get('check').disabled);
 assert.equal(page.elements.get('activate').hidden,true);assert.equal(page.activations,0);assert.ok(page.elements.get('status').textContent.includes('检查未完成'));
});
