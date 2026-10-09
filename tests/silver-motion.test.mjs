import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialState,today} from '../lib/store.ts';
import {beginCourseSession,saveSessionProgress} from '../lib/content-library/daily-course-plan.ts';
import {todayCourseProgress} from '../lib/content-library/today-progress.ts';
import {transitionScene,motionTiming} from '../lib/platform/scene-transition.ts';

test('finished plan survives closing results without claiming tomorrow or another level',()=>{
 const now=Date.now();let s=beginCourseSession(structuredClone(initialState),[],now);
 const session={...s.activeSession,step:2,completed:['Review','Grammar','Reading'],done:true};
 s=saveSessionProgress(s,session);s.activeSession=null;
 assert.equal(todayCourseProgress(s,now).completed,3);
 assert.equal(todayCourseProgress(s,now+48*3600000).completed,0);
 assert.equal(todayCourseProgress({...s,profile:{...s.profile,level:'N1'}},now).completed,0);
 assert.equal(today(s.profile.timezone,now),today(s.profile.timezone,session.startedAt));
});
test('invalid completed draft does not show success',()=>{
 const s=structuredClone(initialState);s.notes['paused-course-session-ja-N3']='{"done":true}';
 assert.equal(todayCourseProgress(s).completed,0);
});
test('unavailable scene API executes update exactly once',()=>{
 let updates=0;transitionScene(()=>updates++);assert.equal(updates,1);
 assert.ok(motionTiming.press<motionTiming.state&&motionTiming.state<motionTiming.panel);
});
test('interrupted scene drops only stale navigation and retains latest direction',async()=>{
 const callbacks=[];let skipped=0;let removed=0;
 const previousDocument=globalThis.document,previousMedia=globalThis.matchMedia;
 globalThis.matchMedia=()=>({matches:false});
 globalThis.document={hidden:false,documentElement:{setAttribute(){},removeAttribute(){removed++}},startViewTransition(update){callbacks.push(update);return {skipTransition(){skipped++},ready:Promise.resolve(),finished:Promise.resolve()}}};
 try{const seen=[];transitionScene(()=>seen.push('old'));transitionScene(()=>seen.push('new'));callbacks.forEach(f=>f());await new Promise(r=>setImmediate(r));assert.deepEqual(seen,['new']);assert.equal(skipped,1);assert.equal(removed,1)}
 finally{globalThis.document=previousDocument;globalThis.matchMedia=previousMedia}
});
test('reduced motion preserves behavior without snapshots',()=>{
 const previousDocument=globalThis.document,previousMedia=globalThis.matchMedia;
 globalThis.matchMedia=()=>({matches:true});globalThis.document={hidden:false,startViewTransition(){throw new Error('must not animate')}};
 try{let updates=0;transitionScene(()=>updates++);assert.equal(updates,1)}finally{globalThis.document=previousDocument;globalThis.matchMedia=previousMedia}
});
