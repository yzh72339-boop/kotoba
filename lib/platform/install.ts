export type InstallEvent=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>};
let capturedPrompt:InstallEvent|null=null;
// Browsers can offer installation before the authenticated app has mounted.
// Retain that event here so signing in does not lose the native install action.
if(typeof window!=='undefined'){
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();capturedPrompt=event as InstallEvent});
 window.addEventListener('appinstalled',()=>{capturedPrompt=null});
}
export function getCapturedInstallPrompt(){return capturedPrompt}
export function clearCapturedInstallPrompt(){capturedPrompt=null}
export function isStandalone(){return matchMedia('(display-mode: standalone)').matches||Boolean((navigator as Navigator&{standalone?:boolean}).standalone)}
export function isIOS(){return /iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)}
export function installPlatform(){return isIOS()?'ios':/Android/i.test(navigator.userAgent)?'android':'desktop'}
