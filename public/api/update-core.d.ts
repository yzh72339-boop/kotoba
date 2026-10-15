export type VersionMetadata={schema:1;version:string;buildId:string;builtAt:string;gitCommit:string|null;sourceDirty:boolean};
export type UpdateStatus='unsupported'|'checking'|'unregistered'|'registering'|'up-to-date'|'update-available'|'downloading'|'waiting'|'offline'|'activating'|'updated'|'error';
export type UpdateSnapshot={status:UpdateStatus;currentBuild:string|null;activeBuild:string|null;waitingBuild:string|null;server:VersionMetadata|null;error:string|null;detail?:string|null;checkedAt:number};
export type CheckOptions={navigator?:Navigator;registration?:ServiceWorkerRegistration|null;currentBuild?:string|null;online?:boolean;fetcher?:typeof fetch;timeoutMs?:number;installTimeoutMs?:number;url?:string;now?:number;onState?:(state:UpdateSnapshot)=>void;onRegistration?:(registration:ServiceWorkerRegistration)=>void};
export const BUILD_PATTERN:RegExp;
export class UpdateError extends Error{code:string;detail:string;constructor(code:string,detail?:string)}
export function validBuild(value:unknown):string|null;
export function parseVersionMetadata(value:unknown):VersionMetadata;
export function updateMessage(state:Pick<UpdateSnapshot,'status'|'error'|'detail'>):string;
export function fetchServerVersion(options?:Pick<CheckOptions,'fetcher'|'timeoutMs'|'url'|'now'>):Promise<VersionMetadata>;
export function messageWorker(worker:ServiceWorker|null,data:unknown,timeoutMs?:number):Promise<{version?:string;status?:string}>;
export function readAppBuild(worker:ServiceWorker|null,timeoutMs?:number):Promise<string|null>;
export function watchAppUpdates(registration:ServiceWorkerRegistration,ready:()=>void,failed?:(error:UpdateError)=>void):()=>void;
export function downloadWorkerUpdate(registration:ServiceWorkerRegistration,timeoutMs?:number,container?:ServiceWorkerContainer|null):Promise<boolean>;
export function checkAppUpdate(options?:CheckOptions):Promise<UpdateSnapshot>;
export function waitForController(container:ServiceWorkerContainer,expected:string,timeoutMs?:number):{promise:Promise<string>;cancel:()=>void};
export function activateSavedUpdate(worker:ServiceWorker,save:()=>Promise<unknown>,options?:{expectedBuild?:string;container?:ServiceWorkerContainer;timeoutMs?:number;recovery?:boolean}):Promise<string>;
export function createUpdateGate(intervalMs?:number):{take:(now?:number,manual?:boolean)=>boolean};
export function canActivateSnapshot(state:UpdateSnapshot):boolean;
