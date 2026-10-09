import {AUTH_STORAGE_KEY,PRIVATE_LOCK_EVENT,PRIVATE_LOCK_STORAGE_KEY,createPrivateAuthStorage} from '../private-session';

export const webAuthStorage=createPrivateAuthStorage(()=>typeof window==='undefined'?null:window.localStorage);
export function isPrivateAppLocked(){return localStorage.getItem(PRIVATE_LOCK_STORAGE_KEY)==='1'}
export function beginPrivateSignIn(){localStorage.removeItem(PRIVATE_LOCK_STORAGE_KEY)}

const GOOGLE_STARTED_KEY='kotoba.google-started-at';
export function beginGoogleSignIn(){beginPrivateSignIn();sessionStorage.setItem(GOOGLE_STARTED_KEY,String(Date.now()))}
export function clearGoogleSignIn(){sessionStorage.removeItem(GOOGLE_STARTED_KEY)}
export function googleSignInPending(){const started=Number(sessionStorage.getItem(GOOGLE_STARTED_KEY));return started>0&&Date.now()-started<15*60*1000}

export function clearLocalAuthCredentials(){
 localStorage.setItem(PRIVATE_LOCK_STORAGE_KEY,'1');
 for(const key of [AUTH_STORAGE_KEY,`${AUTH_STORAGE_KEY}-code-verifier`,`${AUTH_STORAGE_KEY}-user`])localStorage.removeItem(key);
}

export function lockPrivateApp(){window.dispatchEvent(new Event(PRIVATE_LOCK_EVENT))}
