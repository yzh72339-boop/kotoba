export async function enableNotifications(){if(!('Notification' in window))return 'unsupported';return Notification.requestPermission()}
export async function showReminder(title:string,body:string){if(!('Notification' in window)||Notification.permission!=='granted')return;const registration=await navigator.serviceWorker?.ready;await registration?.showNotification(title,{body,icon:'/icons/icon-192.png',tag:'kotoba-review',data:{url:'/#Review'}})}
// Server-scheduled Web Push requires VAPID configuration; no unsolicited permission prompts.
export async function subscribePush(publicKey:Uint8Array){const registration=await navigator.serviceWorker.ready;return registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:publicKey as BufferSource})}
