export const AUTH_STORAGE_KEY='kotoba.private-auth';
export const PRIVATE_LOCK_STORAGE_KEY='kotoba.private-locked';
export const PRIVATE_LOCK_EVENT='kotoba:private-lock';

type KeyValueStore={getItem:(key:string)=>string|null;setItem:(key:string,value:string)=>void;removeItem:(key:string)=>void};
export function createPrivateAuthStorage(resolve:()=>KeyValueStore|null){
 return {
  getItem(key:string){const storage=resolve();return storage?.getItem(PRIVATE_LOCK_STORAGE_KEY)?null:storage?.getItem(key)??null},
  setItem(key:string,value:string){const storage=resolve();if(!storage?.getItem(PRIVATE_LOCK_STORAGE_KEY))storage?.setItem(key,value)},
  removeItem(key:string){resolve()?.removeItem(key)}
 };
}

export type PrivateSignOutDependencies={
 flush:()=>Promise<unknown>;
 forgetOwner:()=>Promise<void>;
 clearCredentials:()=>void;
 lock:()=>void;
 signOut:()=>Promise<unknown>;
};

// Lock locally before contacting Auth. An offline request cannot keep the UI open.
// Saving and removing credentials must succeed before the gate is dismissed.
export async function signOutPrivateSession(deps:PrivateSignOutDependencies){
 await deps.flush();
 await deps.forgetOwner();
 deps.clearCredentials();
 deps.lock();
 try{await deps.signOut()}catch{/* Local credentials and authorization are already removed. */}
}
