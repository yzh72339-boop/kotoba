import {test} from 'node:test';
import assert from 'node:assert/strict';
const browser=new EventTarget();globalThis.window=browser;
const {getCapturedInstallPrompt,clearCapturedInstallPrompt}=await import('../lib/platform/install.ts');
test('install event remains available after a delayed private sign-in',async()=>{
 let prompts=0;
 const native=Object.assign(new Event('beforeinstallprompt',{cancelable:true}),{prompt:async()=>{prompts++},userChoice:Promise.resolve({outcome:'accepted'})});
 browser.dispatchEvent(native);
 assert.equal(native.defaultPrevented,true);
 // There is no app listener while authentication is still in progress.
 await Promise.resolve();assert.equal(getCapturedInstallPrompt(),native);
 await getCapturedInstallPrompt().prompt();assert.equal(prompts,1);
 browser.dispatchEvent(new Event('appinstalled'));assert.equal(getCapturedInstallPrompt(),null);
});
test('a consumed prompt is forgotten and a later offer can be captured',()=>{
 const first=new Event('beforeinstallprompt',{cancelable:true});browser.dispatchEvent(first);clearCapturedInstallPrompt();assert.equal(getCapturedInstallPrompt(),null);
 const later=new Event('beforeinstallprompt',{cancelable:true});browser.dispatchEvent(later);assert.equal(getCapturedInstallPrompt(),later);clearCapturedInstallPrompt();
});
