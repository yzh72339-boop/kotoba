import {atomicUpdate} from './platform/storage';
import {mergeStates} from './sync-state';
import {migrateState,type AppState} from './store';

// IndexedDB serializes these read/write transactions across tabs. Both local
// actions and remote sync merge with the committed state before replacing it.
export function persistLearningState(state:AppState,queueId?:string){
 const additional=queueId?[{store:'queue' as const,key:queueId,value:{id:queueId,at:Date.now(),status:'pending'}}]:[];
 return atomicUpdate('state','learning',current=>current?mergeStates(migrateState(current),state):state,additional);
}
