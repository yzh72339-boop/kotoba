import {migrateState,type AppState} from './store.ts';
import {mergeStates} from './sync-state.ts';
export type SyncStatus='pending'|'syncing'|'synced'|'failed';
export type SyncOutcome='pending'|'synced'|'failed'|'offline'|'disposed';
export type SyncReply={applied:boolean;revision:number;state?:unknown};
export type SyncDependencies={
 isOnline:()=>boolean;
 queueIds:()=>Promise<string[]>;
 remote:()=>Promise<{revision:number;state?:unknown}|null>;
 submit:(revision:number,batchId:string,state:AppState)=>Promise<SyncReply>;
 batchId:(ids:string[])=>Promise<string>;
 persist:(state:AppState)=>Promise<AppState|void>;
 acknowledge:(ids:string[])=>Promise<void>;
};
// Storage and backend adapters are separate so concurrency can be tested offline.
export class SyncCoordinator{
 private inFlight:Promise<SyncOutcome>|null=null;
 private disposed=false;
 private retryTimer:ReturnType<typeof setTimeout>|null=null;
 private attempt=0;
 private deps:SyncDependencies;
 private getState:()=>AppState;
 private apply:(state:AppState)=>void;
 private status:(status:SyncStatus)=>void;
 constructor(deps:SyncDependencies,getState:()=>AppState,apply:(state:AppState)=>void,status:(status:SyncStatus)=>void){this.deps=deps;this.getState=getState;this.apply=apply;this.status=status}
 sync():Promise<SyncOutcome>{
  if(this.disposed)return Promise.resolve('disposed');
  if(this.inFlight)return this.inFlight;
  if(!this.deps.isOnline())return Promise.resolve('offline');
  if(this.retryTimer){clearTimeout(this.retryTimer);this.retryTimer=null}
  const task=this.perform();this.inFlight=task;
  void task.then(()=>{if(this.inFlight===task)this.inFlight=null},()=>{if(this.inFlight===task)this.inFlight=null});
  return task;
 }
 async drain(maxPasses=4):Promise<SyncOutcome>{
  for(let i=0;i<maxPasses;i++){
   const outcome=await this.sync();
   if(['failed','offline','disposed'].includes(outcome))return outcome;
   if(!(await this.deps.queueIds()).length)return 'synced';
  }
  return 'pending';
 }
 private retry(delay:number){if(this.disposed)return;if(this.retryTimer)clearTimeout(this.retryTimer);this.retryTimer=setTimeout(()=>{this.retryTimer=null;void this.sync()},delay)}
 private async perform():Promise<SyncOutcome>{
  try{
   this.status('syncing');const ids=await this.deps.queueIds();const remote=await this.deps.remote();
   if(this.disposed)return 'disposed';
   let revision=remote?.revision??0;
   let merged=remote?.state?mergeStates(this.getState(),migrateState(remote.state)):this.getState();
   const batchId=await this.deps.batchId(ids);
   for(let i=0;i<4;i++){
    if(this.disposed)return 'disposed';
    merged=mergeStates(merged,this.getState());const reply=await this.deps.submit(revision,batchId,merged);
    if(!reply.applied){revision=reply.revision;if(reply.state)merged=mergeStates(merged,migrateState(reply.state));continue}
    if(this.disposed)return 'disposed';
    if(reply.state)merged=mergeStates(merged,migrateState(reply.state));
    let latest=mergeStates(this.getState(),merged);const committed=await this.deps.persist(latest);if(committed)latest=mergeStates(latest,committed);
    if(this.disposed)return 'disposed';
    // Edits can arrive while IndexedDB commits. Merge before updating the UI.
    this.apply(mergeStates(this.getState(),latest));await this.deps.acknowledge(ids);
    this.attempt=0;const remaining=await this.deps.queueIds();const outcome=remaining.length?'pending':'synced';this.status(outcome);
    if(remaining.length)this.retry(500);return outcome;
   }
   throw new Error('Concurrent update; retry required');
  }catch{
   if(this.disposed)return 'disposed';this.status('failed');this.attempt++;this.retry(Math.min(60000,2000*2**Math.min(this.attempt,5)));return 'failed';
  }
 }
 dispose(){this.disposed=true;if(this.retryTimer)clearTimeout(this.retryTimer)}
}
