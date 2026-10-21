/* Build rewrites this version and app asset list. Private API responses are never cached. */
const VERSION='kotoba-3.1.0-preview.17-dev';
const SHELL=VERSION+'-shell',CONTENT=VERSION+'-content',DOWNLOADS='kotoba-personal-downloads',LANGUAGE_ASSETS='kotoba-language-assets-v1';
const PRECACHE=['/','/manifest.webmanifest','/icons/icon-192.png','/icons/icon-512.png','/icons/maskable-512.png','/cafe-editorial.svg','/images/reading-japan.jpg'];
self.addEventListener('install',e=>e.waitUntil((async()=>{
 const cache=await caches.open(SHELL);
 await Promise.all(PRECACHE.map(async path=>{
  try{
   const response=await fetch(new Request(path,{cache:'reload'}));
   if(!response.ok)throw new Error(`HTTP ${response.status}`);
   if(/\.(?:js|css)$/.test(path)&&/text\/html/i.test(response.headers.get('content-type')??''))throw new Error('unexpected HTML response');
   if(path==='/'&&!VERSION.endsWith('-dev')){const html=await response.clone().text();if(!html.includes(`name="kotoba-build" content="${VERSION}"`))throw new Error('page build does not match worker build')}
   await cache.put(path,response);
  }catch(error){
   const detail=`${path}: ${error.message}`;
   const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});clients.forEach(client=>client.postMessage({type:'UPDATE_INSTALL_ERROR',version:VERSION,detail}));
   throw error;
  }
 }));
})()));
// Keep downloaded content and prior shell caches through activation. No learning
// database, authentication state, account queues or cache reset is part of update.
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('message',e=>{
 if(e.data?.type==='GET_APP_VERSION'){e.ports?.[0]?.postMessage({version:VERSION});return;}
 if(['ACTIVATE_UPDATE','RECOVERY_UPDATE'].includes(e.data?.type)){
  e.waitUntil((async()=>{
   const source=e.source,port=e.ports?.[0];
   if(!source?.id||new URL(source.url).origin!==self.location.origin)return;
   const reply=value=>{if(port)port.postMessage(value);else source.postMessage?.({type:'UPDATE_RESULT',...value})};
   // Sites canonicalizes .html URLs before they become WindowClient URLs.
   // Preserve the recovery-route restriction, but acknowledge rejected requests
   // so a legitimate redirect never looks like an unresponsive worker.
   const sourcePath=new URL(source.url).pathname.replace(/\/$/,'');
   if(e.data.type==='RECOVERY_UPDATE'&&!['/api/app-update.html','/api/app-update'].includes(sourcePath)){reply({status:'rejected',version:VERSION});return;}
   if(e.data.expectedBuild&&e.data.expectedBuild!==VERSION){reply({status:'mismatch',version:VERSION});return;}
   const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
   if(windows.some(client=>client.id!==source.id&&new URL(client.url).origin===self.location.origin)){reply({status:'blocked',version:VERSION,recoveryUrl:'/api/app-update.html?reason=other-windows'});
    return;}
   // Legacy clients with no message port still get the same single-window fence.
   reply({status:'activating',version:VERSION});await self.skipWaiting();
  })());return;
 }
 if(e.data?.type==='SYNC_WHEN_ONLINE')self.clients.matchAll().then(clients=>clients.forEach(client=>client.postMessage({type:'SYNC_REQUESTED'})));
});
async function cacheFirst(request,cacheName){const cache=await caches.open(cacheName),hit=await cache.match(request);if(hit)return hit;
 // Reuse only exact immutable hashed assets; never serve an older HTML shell.
 const path=new URL(request.url).pathname;if(path.startsWith('/_next/static/')&&/[a-f0-9]{8,}/.test(path)){for(const name of await caches.keys()){if(name!==cacheName&&name.startsWith('kotoba-')&&name.endsWith('-shell')){const previous=await(await caches.open(name)).match(request);if(previous){await cache.put(request,previous.clone());return previous}}}}
 const response=await fetch(request);if(response.ok)await cache.put(request,response.clone());return response;}
async function staleWhileRevalidate(request){const cache=await caches.open(CONTENT),hit=await cache.match(request);const fresh=fetch(request).then(response=>{if(response.ok)void cache.put(request,response.clone());return response});if(hit){fresh.catch(()=>{});return hit}return fresh;}
self.addEventListener('fetch',e=>{const request=e.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==self.location.origin)return;
 // OAuth, Supabase, AI, signed audio URLs and user progress are network-only here.
 if(url.pathname.startsWith('/api/')||url.pathname.includes('/auth/')||url.pathname.includes('/functions/')||/^\/(login|register)(\/|$)/.test(url.pathname)||url.pathname.startsWith('/downloads/')||['/signin-with-chatgpt','/signout-with-chatgpt','/callback'].includes(url.pathname)||['token','access_token','code','sb_flow_id','error','error_code','error_description'].some(key=>url.searchParams.has(key)))return;
 if(request.mode==='navigate'){e.respondWith(cacheFirst(new Request('/'),SHELL));return;}
 if(url.pathname.startsWith('/content/')){e.respondWith(staleWhileRevalidate(request));return;}
 if(url.pathname.startsWith('/language/kuromoji-0.1.2/dict/')){e.respondWith(cacheFirst(request,LANGUAGE_ASSETS));return;}
 if(url.pathname.startsWith('/_next/static/')||url.pathname.startsWith('/icons/')||url.pathname.startsWith('/images/')||url.pathname.endsWith('.svg')||url.pathname.endsWith('.webmanifest'))e.respondWith(cacheFirst(request,SHELL));
});
self.addEventListener('sync',e=>{if(e.tag==='kotoba-progress')e.waitUntil(self.clients.matchAll({type:'window'}).then(clients=>Promise.all(clients.map(client=>client.postMessage({type:'SYNC_REQUESTED'})))))});
self.addEventListener('push',e=>{let data={title:'Kotoba',body:'A little review is ready when you are.',url:'/#Review'};try{data={...data,...e.data.json()}}catch{}e.waitUntil(self.registration.showNotification(data.title,{body:data.body,icon:'/icons/icon-192.png',badge:'/icons/icon-96.png',tag:'kotoba-review',data:{url:data.url}}))});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(self.clients.openWindow(e.notification.data?.url??'/'))});
