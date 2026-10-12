import {test} from 'node:test';
import assert from 'node:assert/strict';
import {hasUnsavedLearning,watchPendingSave} from '../lib/platform/pending-save.ts';
import {learningSaveMessage} from '../lib/learning-save-state.ts';

test('only uncommitted local changes require an unload warning, not cloud retries or fallback saves',()=>{
 assert.equal(hasUnsavedLearning('saving'),true);assert.equal(hasUnsavedLearning('failed'),true);
 assert.equal(hasUnsavedLearning('saved'),false);assert.equal(hasUnsavedLearning('fallback'),false);
 for(const online of [false,true])for(const sync of ['pending','syncing','failed','synced']){
  assert.equal(hasUnsavedLearning('saved'),false);
  assert.ok(learningSaveMessage('saved',online,sync,1).includes('本地已保存'));
 }
 assert.ok(learningSaveMessage('saving',true,'synced',0).includes('暂勿刷新'));
});
test('pending local saves cancel explicit unload and remove the listener when saved or unmounted',()=>{
 const page=new EventTarget();const release=watchPendingSave(page,true);
 const pending=new Event('beforeunload',{cancelable:true});assert.equal(page.dispatchEvent(pending),false);assert.equal(pending.defaultPrevented,true);
 release();const saved=new Event('beforeunload',{cancelable:true});assert.equal(page.dispatchEvent(saved),true);
 const noop=watchPendingSave(page,false);const unmounted=new Event('beforeunload',{cancelable:true});assert.equal(page.dispatchEvent(unmounted),true);noop();
});
