import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DAILY_STEPS,advanceDailySession,restoreDailySession,shouldPauseDailySession} from '../lib/daily-session.ts';

const started={language:'ja',step:0,startedAt:100,baseline:0,completed:[],done:false};

test('leaving a daily step pauses without changing stored progress',()=>{
 const session={...started,step:2,completed:['Review','Grammar']};
 assert.equal(shouldPauseDailySession(session,'Today','ja'),true);
 assert.equal(shouldPauseDailySession(session,'Reading','ja'),false);
 assert.deepEqual(restoreDailySession({activeSession:session,_clock:{}},null),session);
});

test('a language switch keeps a mismatched daily step paused until explicit resume',()=>{
 const session={...started,step:1,completed:['Review']};
 assert.equal(shouldPauseDailySession(session,'Grammar','en'),true);
 assert.equal(shouldPauseDailySession(session,'Grammar',session.language),false);
});

test('completed sessions do not force the previous step on navigation',()=>{
 let session={...started};
 for(const step of DAILY_STEPS){assert.equal(DAILY_STEPS[session.step],step);session=advanceDailySession(session)}
 assert.equal(session.done,true);
 assert.equal(shouldPauseDailySession(session,'Today','ja'),false);
});
