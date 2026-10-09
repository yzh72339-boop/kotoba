import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AUTH_STORAGE_KEY,PRIVATE_LOCK_STORAGE_KEY,createPrivateAuthStorage,signOutPrivateSession} from '../lib/private-session.ts';

function signOutHarness(overrides={}){
 const steps=[];
 return {steps,deps:{flush:async()=>{steps.push('saved')},forgetOwner:async()=>{steps.push('owner-removed')},clearCredentials:()=>{steps.push('credentials-removed')},lock:()=>{steps.push('locked')},signOut:async()=>{steps.push('auth-request')},...overrides}};
}
test('offline logout removes local access before contacting Auth',async()=>{
 const h=signOutHarness({signOut:async()=>{h.steps.push('auth-request');throw new Error('Offline')}});
 await signOutPrivateSession(h.deps);
 assert.deepEqual(h.steps,['saved','owner-removed','credentials-removed','locked','auth-request']);
});
test('logout does not discard a learning state that failed to save',async()=>{
 const h=signOutHarness({flush:async()=>{throw new Error('Storage unavailable')}});
 await assert.rejects(signOutPrivateSession(h.deps),/Storage unavailable/);
 assert.deepEqual(h.steps,[]);
});
test('owner-cache removal failure leaves the existing learning session open',async()=>{
 const h=signOutHarness({forgetOwner:async()=>{throw new Error('Transaction aborted')}});
 await assert.rejects(signOutPrivateSession(h.deps),/Transaction aborted/);
 assert.deepEqual(h.steps,['saved']);
});
test('late token refresh cannot restore credentials after local logout',()=>{
 const values=new Map(),store={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 const auth=createPrivateAuthStorage(()=>store);
 auth.setItem(AUTH_STORAGE_KEY,'session-before-logout');
 assert.equal(auth.getItem(AUTH_STORAGE_KEY),'session-before-logout');
 store.setItem(PRIVATE_LOCK_STORAGE_KEY,'1');auth.removeItem(AUTH_STORAGE_KEY);
 auth.setItem(AUTH_STORAGE_KEY,'late-refresh-result');
 assert.equal(auth.getItem(AUTH_STORAGE_KEY),null);assert.equal(values.has(AUTH_STORAGE_KEY),false);
 store.removeItem(PRIVATE_LOCK_STORAGE_KEY);auth.setItem(AUTH_STORAGE_KEY,'new-interactive-login');
 assert.equal(auth.getItem(AUTH_STORAGE_KEY),'new-interactive-login');
});
test('server-side auth storage does not require browser globals',()=>{
 const auth=createPrivateAuthStorage(()=>null);assert.equal(auth.getItem(AUTH_STORAGE_KEY),null);auth.setItem(AUTH_STORAGE_KEY,'unused');auth.removeItem(AUTH_STORAGE_KEY);
});
