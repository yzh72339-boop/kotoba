type SyncRegistration=ServiceWorkerRegistration&{sync?:{register:(tag:string)=>Promise<void>}};
export async function requestBackgroundSync(){
 if(!('serviceWorker' in navigator))return;
 try{const registration=await navigator.serviceWorker.getRegistration() as SyncRegistration|undefined;await registration?.sync?.register('kotoba-progress')}catch{/* Foreground/online/launch synchronization remains the fallback. */}
}
