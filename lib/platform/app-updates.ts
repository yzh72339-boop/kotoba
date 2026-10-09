/** Service-worker updates never remove learning state or activate automatically. */
export function watchAppUpdates(registration:ServiceWorkerRegistration,ready:()=>void){
 const workers=new Map<ServiceWorker,()=>void>();
 const observe=()=>{
  if(registration.waiting)ready();
  const worker=registration.installing;
  if(!worker||workers.has(worker))return;
  const changed=()=>{if(worker.state==='installed')ready()};
  workers.set(worker,changed);worker.addEventListener('statechange',changed);
 };
 registration.addEventListener('updatefound',observe);observe();
 return()=>{registration.removeEventListener('updatefound',observe);for(const [worker,changed] of workers)worker.removeEventListener('statechange',changed)};
}
export async function checkAppUpdate(registration:ServiceWorkerRegistration,timeoutMs=15000):Promise<boolean>{
 let stopped=false;
 let stop=()=>{};
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{
  const check=(async()=>{
   await registration.update();
   if(stopped)return false;
   if(registration.waiting)return true;
   const worker=registration.installing;
   if(!worker)return false;
   return await new Promise<boolean>((resolve,reject)=>{
    const changed=()=>{
     if(worker.state==='installed')resolve(true);
     if(worker.state==='redundant')reject(new Error('Update installation failed'));
    };
    stop=()=>worker.removeEventListener('statechange',changed);
    worker.addEventListener('statechange',changed);changed();
   });
  })();
  return await Promise.race([check,new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('Update check timed out')),timeoutMs)})]);
 }finally{stopped=true;if(timer)clearTimeout(timer);stop()}
}
export async function readAppBuild(worker:ServiceWorker|null,timeoutMs=1500):Promise<string|null>{
 if(!worker||typeof MessageChannel==='undefined')return null;
 return new Promise(resolve=>{
  const channel=new MessageChannel();
  const finish=(version:string|null)=>{clearTimeout(timer);channel.port1.close();channel.port2.close();resolve(version)};
  const timer=setTimeout(()=>finish(null),timeoutMs);
  channel.port1.onmessage=event=>{
   const version=event.data?.version;
   finish(typeof version==='string'&&/^kotoba-[0-9.]+-[a-z0-9]+$/.test(version)?version:null);
  };
  try{worker.postMessage({type:'GET_APP_VERSION'},[channel.port2])}catch{finish(null)}
 });
}
export async function activateSavedUpdate(worker:ServiceWorker,save:()=>Promise<unknown>){
 await save();worker.postMessage({type:'ACTIVATE_UPDATE'});
}
