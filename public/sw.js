/* Build rewrites this version and app asset list. Private API responses are never cached. */
const VERSION='kotoba-2.7.0-dev';
const SHELL=VERSION+'-shell',CONTENT=VERSION+'-content',DOWNLOADS='kotoba-personal-downloads';
const PRECACHE=['/','/manifest.webmanifest','/icons/icon-192.png','/icons/icon-512.png','/icons/maskable-512.png','/cafe-editorial.svg','/images/reading-japan.jpg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(SHELL).then(cache=>cache.addAll(PRECACHE))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('kotoba-')&&k!==SHELL&&k!==CONTENT&&k!==DOWNLOADS).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('message',e=>{if(e.data?.type==='RECOVERY_UPDATE'){e.waitUntil((async()=>{
 const source=e.source,port=e.ports?.[0];
 if(!port||!source?.id||new URL(source.url).origin!==self.location.origin||new URL(source.url).pathname!=='/api/app-update.html')return;
 const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
 if(windows.some(client=>client.id!==source.id&&new URL(client.url).origin===self.location.origin)){port.postMessage({status:'blocked'});return;}
 port.postMessage({status:'activating',version:VERSION});await self.skipWaiting();
})());return;}if(e.data?.type==='GET_APP_VERSION')e.ports?.[0]?.postMessage({version:VERSION});if(e.data?.type==='ACTIVATE_UPDATE')self.skipWaiting();if(e.data?.type==='SYNC_WHEN_ONLINE')self.clients.matchAll().then(clients=>clients.forEach(client=>client.postMessage({type:'SYNC_REQUESTED'})))});
async function cacheFirst(request,cacheName){const cache=await caches.open(cacheName),hit=await cache.match(request);if(hit)return hit;const response=await fetch(request);if(response.ok)await cache.put(request,response.clone());return response;}
async function staleWhileRevalidate(request){const cache=await caches.open(CONTENT),hit=await cache.match(request);const fresh=fetch(request).then(response=>{if(response.ok)void cache.put(request,response.clone());return response});if(hit){fresh.catch(()=>{});return hit}return fresh;}
self.addEventListener('fetch',e=>{const request=e.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==self.location.origin)return;
 // OAuth, Supabase, AI, signed audio URLs and user progress are network-only here.
 if(url.pathname.startsWith('/api/')||url.pathname.includes('/auth/')||url.pathname.includes('/functions/')||['/signin-with-chatgpt','/signout-with-chatgpt','/callback'].includes(url.pathname)||['token','access_token','code','sb_flow_id','error','error_code','error_description'].some(key=>url.searchParams.has(key)))return;
 if(request.mode==='navigate'){e.respondWith(cacheFirst(new Request('/'),SHELL));return;}
 if(url.pathname.startsWith('/content/')){e.respondWith(staleWhileRevalidate(request));return;}
 if(url.pathname.startsWith('/downloads/')){e.respondWith(cacheFirst(request,DOWNLOADS));return;}
 if(url.pathname.startsWith('/_next/static/')||url.pathname.startsWith('/icons/')||url.pathname.startsWith('/images/')||url.pathname.endsWith('.svg')||url.pathname.endsWith('.webmanifest'))e.respondWith(cacheFirst(request,SHELL));
});
self.addEventListener('sync',e=>{if(e.tag==='kotoba-progress')e.waitUntil(self.clients.matchAll({type:'window'}).then(clients=>Promise.all(clients.map(client=>client.postMessage({type:'SYNC_REQUESTED'})))))});
self.addEventListener('push',e=>{let data={title:'Kotoba',body:'A little review is ready when you are.',url:'/#Review'};try{data={...data,...e.data.json()}}catch{}e.waitUntil(self.registration.showNotification(data.title,{body:data.body,icon:'/icons/icon-192.png',badge:'/icons/icon-96.png',tag:'kotoba-review',data:{url:data.url}}))});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(self.clients.openWindow(e.notification.data?.url??'/'))});
