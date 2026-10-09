import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../lib/store.ts';
import {stampChanges,mergeStates} from '../lib/sync-state.ts';
import {audioResumeOffset,commitAudioUpload,audioMediaId} from '../lib/audio-state.ts';

const recording=(id,updatedAt)=>({language:'ja',title:id,storagePath:`owner/audio-ja/${id}`,mimeType:'audio/mpeg',size:1200,updatedAt});
test('an old queued upload cannot replace a newer file from another device',()=>{
 const state=structuredClone(initialState);state.audioFiles['audio-ja']=recording('new',200);
 assert.equal(commitAudioUpload(state,'audio-ja',recording('old',100)),state);
 assert.equal(commitAudioUpload(state,'audio-ja',recording('latest',300)).audioFiles['audio-ja'].title,'latest');
});
test('file selection time wins even when an older upload has a later sync timestamp',()=>{
 const base=structuredClone(initialState);
 const old=stampChanges(base,{...base,audioFiles:{'audio-ja':recording('old',100)}},1000);
 const recent=stampChanges(base,{...base,audioFiles:{'audio-ja':recording('recent',200)}},300);
 assert.equal(mergeStates(old,recent).audioFiles['audio-ja'].title,'recent');
 assert.deepEqual(mergeStates(old,recent),mergeStates(recent,old));
});
test('simultaneous file replacements converge deterministically',()=>{
 const base=structuredClone(initialState);
 const a=stampChanges(base,{...base,audioFiles:{'audio-ja':recording('a',100)}},100);
 const b=stampChanges(base,{...base,audioFiles:{'audio-ja':recording('b',100)}},100);
 assert.deepEqual(mergeStates(a,b),mergeStates(b,a));
});
test('replacing a file never applies a position belonging to the previous recording',()=>{
 const position={progress:67,offset:42,mediaId:'old',updatedAt:300};
 assert.equal(audioResumeOffset(position,'new',200),0);
 assert.equal(audioResumeOffset(position,'old',100),42);
});
test('legacy positions resume only when they were saved after the selected recording',()=>{
 assert.equal(audioResumeOffset({progress:67,offset:42,updatedAt:100},'new',200),0);
 assert.equal(audioResumeOffset({progress:67,offset:42,updatedAt:300},'new',200),42);
 assert.equal(audioResumeOffset(undefined,'new',200),0);
});
test('offline and downloaded copies share the same recording identity',()=>{
 assert.equal(audioMediaId('owner/audio-ja/recording-uuid'),'recording-uuid');
 assert.equal(audioResumeOffset({progress:67,offset:42,mediaId:'recording-uuid',updatedAt:200},audioMediaId('owner/audio-ja/recording-uuid'),100),42);
});
