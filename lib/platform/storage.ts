import {storageIdentity,assertStorageIdentity,type StorageIdentity} from '../storage-identity';
const DB_VERSION=1;
export type StoreName='state'|'queue'|'content'|'backups'|'meta';
const databases=new Map<string,Promise<IDBDatabase>>();
export function openDatabase(lease=storageIdentity()){
 assertStorageIdentity(lease);const name=lease.databaseName;
 const database=databases.get(name);if(database)return database;
 const pending=new Promise<IDBDatabase>((resolve,reject)=>{
  const request=indexedDB.open(name,DB_VERSION);let abandoned=false;
  request.onupgradeneeded=()=>{
   if(abandoned){request.transaction?.abort();return}
   for(const name of ['state','queue','content','backups','meta'])if(!request.result.objectStoreNames.contains(name))request.result.createObjectStore(name);
  };
  request.onsuccess=()=>{
   const db=request.result;if(abandoned){db.close();return}
   db.onversionchange=()=>{db.close();if(databases.get(name)===pending)databases.delete(name)};resolve(db);
  };
  request.onerror=()=>reject(request.error);
  request.onblocked=()=>{abandoned=true;reject(new Error('Close other app windows to finish updating local storage.'))};
 });
 databases.set(name,pending);void pending.catch(()=>{if(databases.get(name)===pending)databases.delete(name)});return pending;
}
export async function read<T>(store:StoreName,key:IDBValidKey,lease=storageIdentity()):Promise<T|undefined>{const db=await openDatabase(lease);assertStorageIdentity(lease);return new Promise((resolve,reject)=>{const t=db.transaction(store,'readonly'),r=t.objectStore(store).get(key);let value:T|undefined;r.onsuccess=()=>{value=r.result};r.onerror=()=>reject(r.error);t.oncomplete=()=>resolve(value);t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error??new Error('Local storage read aborted'))})}
export async function write(store:StoreName,key:IDBValidKey,value:unknown,lease=storageIdentity()){const db=await openDatabase(lease);assertStorageIdentity(lease);return new Promise<void>((resolve,reject)=>{const t=db.transaction(store,'readwrite');t.objectStore(store).put(value,key);t.oncomplete=()=>resolve();t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error??new Error('Local storage transaction aborted'))})}
export async function remove(store:StoreName,key:IDBValidKey,lease=storageIdentity()){const db=await openDatabase(lease);assertStorageIdentity(lease);return new Promise<void>((resolve,reject)=>{const t=db.transaction(store,'readwrite');t.objectStore(store).delete(key);t.oncomplete=()=>resolve();t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error??new Error('Local storage transaction aborted'))})}
export async function entries<T>(store:StoreName,lease=storageIdentity()):Promise<{key:IDBValidKey;value:T}[]>{const db=await openDatabase(lease);assertStorageIdentity(lease);return new Promise((resolve,reject)=>{const t=db.transaction(store,'readonly'),s=t.objectStore(store);const keys=s.getAllKeys(),values=s.getAll();t.oncomplete=()=>resolve(keys.result.map((key,i)=>({key,value:values.result[i]})));t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error??new Error('Local storage transaction aborted'))})}
type AtomicWrite={store:StoreName;key:IDBValidKey;value:unknown};
export async function atomicUpdate<T>(store:StoreName,key:IDBValidKey,update:(current:unknown)=>T,additional:AtomicWrite[]=[],lease:StorageIdentity=storageIdentity()):Promise<T>{
 const db=await openDatabase(lease);assertStorageIdentity(lease);
 return new Promise((resolve,reject)=>{
  const stores=[...new Set([store,...additional.map(write=>write.store)])];
  const transaction=db.transaction(stores,'readwrite'),target=transaction.objectStore(store),request=target.get(key);
  let result!:T,updateError:unknown;
  transaction.oncomplete=()=>resolve(result);
  transaction.onerror=()=>reject(updateError??transaction.error);
  transaction.onabort=()=>reject(updateError??transaction.error??new Error('Local storage transaction aborted'));
  request.onsuccess=()=>{
   try{result=update(request.result);target.put(result,key);for(const write of additional)transaction.objectStore(write.store).put(write.value,write.key)}
   catch(error){updateError=error;transaction.abort()}
  };
  request.onerror=()=>reject(request.error);
 });
}
export async function clearContent(){const db=await openDatabase();return new Promise<void>((resolve,reject)=>{const t=db.transaction('content','readwrite');t.objectStore('content').clear();t.oncomplete=()=>resolve();t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error??new Error('Local storage transaction aborted'))})}
export async function storageEstimate(){return navigator.storage?.estimate?await navigator.storage.estimate():{usage:undefined,quota:undefined}}
