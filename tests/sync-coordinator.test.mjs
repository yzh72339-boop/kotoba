import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SyncCoordinator} from '../lib/sync-coordinator.ts';
import {initialState} from '../lib/store.ts';
import {stampChanges} from '../lib/sync-state.ts';
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}}
function setup(t,overrides={}){
 const h={state:structuredClone(initialState),queue:['change-a'],statuses:[],submissions:[],acknowledged:[],stored:null};
 const deps={isOnline:()=>true,queueIds:async()=>h.queue.slice(),remote:async()=>null,batchId:async ids=>ids.slice().sort().join('|'),
  submit:async(revision,batch,state)=>{h.submissions.push({revision,batch,state:structuredClone(state)});return {applied:true,revision:revision+1,state}},
  persist:async state=>{h.stored=structuredClone(state)},acknowledge:async ids=>{h.acknowledged.push(ids);h.queue=h.queue.filter(id=>!ids.includes(id))},...overrides};
 h.coordinator=new SyncCoordinator(deps,()=>h.state,state=>h.state=state,status=>h.statuses.push(status));t.after(()=>h.coordinator.dispose());return h;
}
test('simultaneous sync callers await the same network operation',async t=>{
 const gate=deferred();let requests=0;const h=setup(t,{remote:async()=>{requests++;await gate.promise;return null}});
 const first=h.coordinator.sync(),second=h.coordinator.sync();assert.equal(first,second);let finished=false;second.then(()=>finished=true);
 await Promise.resolve();assert.equal(finished,false);gate.resolve();assert.equal(await second,'synced');assert.equal(requests,1);assert.equal(h.acknowledged.length,1);
});
test('failed upload keeps every offline operation for retry',async t=>{
 const h=setup(t,{submit:async()=>{throw new Error('Network lost')}});assert.equal(await h.coordinator.sync(),'failed');assert.deepEqual(h.queue,['change-a']);assert.equal(h.acknowledged.length,0);assert.equal(h.statuses.at(-1),'failed');
});
test('offline sync does not contact the server or discard progress',async t=>{
 let contacted=false;const h=setup(t,{isOnline:()=>false,remote:async()=>{contacted=true;return null}});assert.equal(await h.coordinator.drain(),'offline');assert.equal(contacted,false);assert.deepEqual(h.queue,['change-a']);
});
test('a stale revision merges remote edits before retrying',async t=>{
 const remote=stampChanges(initialState,{...structuredClone(initialState),notes:{remote:'from mobile'}},200);let calls=0;const received=[];
 const h=setup(t,{submit:async(revision,batch,state)=>{received.push({revision,batch,state});return ++calls===1?{applied:false,revision:5,state:remote}:{applied:true,revision:6,state}}});
 h.state=stampChanges(initialState,{...h.state,notes:{local:'from desktop'}},100);assert.equal(await h.coordinator.sync(),'synced');assert.equal(received[1].revision,5);assert.equal(received[0].batch,received[1].batch);assert.deepEqual(h.state.notes,{local:'from desktop',remote:'from mobile'});
});
test('edits during local persistence survive and drain sends the next batch',async t=>{
 const committing=deferred(),allowCommit=deferred();let persists=0;let h;
 h=setup(t,{persist:async state=>{h.stored=structuredClone(state);if(++persists===1){committing.resolve();await allowCommit.promise}}});
 const drained=h.coordinator.drain();await committing.promise;
 h.state=stampChanges(h.state,{...h.state,notes:{late:'edit while saving'}},300);h.queue.push('change-b');allowCommit.resolve();
 assert.equal(await drained,'synced');assert.equal(h.state.notes.late,'edit while saving');assert.equal(h.submissions.length,2);assert.equal(h.submissions[1].state.notes.late,'edit while saving');assert.deepEqual(h.acknowledged,[['change-a'],['change-b']]);
});
test('local persistence failure never acknowledges the queue',async t=>{
 const h=setup(t,{persist:async()=>{throw new Error('Quota exceeded')}});assert.equal(await h.coordinator.sync(),'failed');assert.deepEqual(h.queue,['change-a']);assert.equal(h.acknowledged.length,0);
});
test('a concurrent tab edit returned by the storage transaction reaches the UI',async t=>{
 const shared=stampChanges(initialState,{...structuredClone(initialState),notes:{tab:'saved in another window'}},400);
 const h=setup(t,{persist:async state=>({...state,notes:{...state.notes,...shared.notes},_clock:{...state._clock,...shared._clock}})});
 assert.equal(await h.coordinator.sync(),'synced');assert.equal(h.state.notes.tab,'saved in another window');assert.equal(h.acknowledged.length,1);
});
test('disposing during remote fetch prevents submission and acknowledgement',async t=>{
 const gate=deferred();const h=setup(t,{remote:async()=>{await gate.promise;return null}});const work=h.coordinator.sync();h.coordinator.dispose();gate.resolve();assert.equal(await work,'disposed');assert.equal(h.submissions.length,0);assert.equal(h.acknowledged.length,0);assert.deepEqual(h.queue,['change-a']);
});
