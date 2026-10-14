export type StorageIdentity={project:string;userId:string|null;databaseName:string;fallbackKey:string;generation:number};
let identity:StorageIdentity={project:'',userId:null,databaseName:'kotoba-personal',fallbackKey:'kotoba.v1',generation:0};
export function storageIdentity(){return identity}
export function selectStorageIdentity(project:string,userId:string,legacyOwner=false){
 if(!project||!userId)throw new Error('Storage identity required');
 const databaseName=legacyOwner?'kotoba-personal':`kotoba-personal:${encodeURIComponent(project)}:${userId}`;
 if(identity.project===project&&identity.userId===userId&&identity.databaseName===databaseName)return identity;
 identity={project,userId,databaseName,fallbackKey:legacyOwner?'kotoba.v1':`kotoba.v1:${encodeURIComponent(project)}:${userId}`,generation:identity.generation+1};return identity;
}
export function lockStorageIdentity(){identity={project:'',userId:null,databaseName:'kotoba-locked',fallbackKey:'kotoba.locked',generation:identity.generation+1}}
export function assertStorageIdentity(lease:StorageIdentity){if(lease!==identity)throw new Error('Account changed; stale local operation cancelled')}
export function learningFallbackKey(lease=identity){assertStorageIdentity(lease);return lease.fallbackKey}
