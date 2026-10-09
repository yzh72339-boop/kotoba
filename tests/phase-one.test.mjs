import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseSupabasePublicConfig,publicEnvironmentIssues} from '../lib/supabase-config.ts';
import {initialAccountState} from '../lib/account-state.ts';
import {verifiedOwnerForProject,privateAccessAllowed} from '../lib/private-access.ts';
import {initialState} from '../lib/store.ts';
import {mergeStates,stampChanges} from '../lib/sync-state.ts';

const url='https://your-project.supabase.co',key='sb_publishable_test_public_key_123456';
const cached={id:'owner-id',projectUrl:url,verifiedAt:100};
test('new Publishable Key uses the project root URL',()=>{
 assert.deepEqual(parseSupabasePublicConfig(`${url}/`,key),{ok:true,url,publishableKey:key});
 assert.equal(parseSupabasePublicConfig('http://127.0.0.1:54321',key).ok,true);
});
test('API suffixes and credential-bearing or insecure URLs are rejected',()=>{
 for(const value of [`${url}/rest/v1/`,`${url}/auth/v1`,`${url}?apikey=x`,`${url}#token`,'https://user:password@example.com','http://example.com','invalid'])assert.deepEqual(parseSupabasePublicConfig(value,key),{ok:false,reason:'invalid-url'});
});
test('placeholder, secret and legacy client keys cannot initialize the client',()=>{
 for(const value of ['【在这里粘贴完整 sb_publishable_... Key】','sb_publishable_...','sb_secret_private_key_123456','eyJ.legacy.anon'])assert.deepEqual(parseSupabasePublicConfig(url,value),{ok:false,reason:'invalid-publishable-key'});
 assert.deepEqual(parseSupabasePublicConfig(url,''),{ok:false,reason:'missing-publishable-key'});
});
test('public environment validation reports names without disclosing values',()=>{
 const secret='sb_secret_never_print_this_123456';
 const issues=publicEnvironmentIssues({NEXT_PUBLIC_SUPABASE_URL:url,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:key,NEXT_PUBLIC_AI_API_KEY:secret,NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY:secret,ALLOWED_USER_EMAIL:'owner@example.com'});
 assert.equal(issues.length,2);assert.ok(issues.every(issue=>!issue.includes(secret)));
 assert.deepEqual(publicEnvironmentIssues({NEXT_PUBLIC_SUPABASE_URL:url,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:key}),[]);
});
test('legacy service-role JWTs and obsolete public anon variables fail the guard',()=>{
 const jwt=`e30.${Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url')}.signature`;
 const issues=publicEnvironmentIssues({NEXT_PUBLIC_SUPABASE_ANON_KEY:'legacy-anon',NEXT_PUBLIC_OTHER_KEY:jwt});
 assert.equal(issues.length,2);assert.ok(issues.every(issue=>!issue.includes(jwt)));
});
test('offline authorization is bound to the same Supabase project',()=>{
 assert.deepEqual(verifiedOwnerForProject(cached,url),cached);
 assert.equal(verifiedOwnerForProject(cached,'https://another.supabase.co'),undefined);
 assert.equal(verifiedOwnerForProject({id:'old-unbound-cache'},url),undefined);
 assert.equal(privateAccessAllowed({online:false,locked:false,cached}),true);
 assert.equal(privateAccessAllowed({online:false,locked:false}),false);
});
test('server denial wins over previously cached authorization',()=>{
 assert.equal(privateAccessAllowed({online:true,locked:false,cached,sessionId:cached.id,owner:false}),false);
 assert.equal(privateAccessAllowed({online:true,locked:false,cached,sessionId:'another-account',requestFailed:true}),false);
 assert.equal(privateAccessAllowed({online:true,locked:false,cached,sessionId:cached.id,requestFailed:true}),true);
 assert.equal(privateAccessAllowed({online:true,locked:false,sessionId:cached.id,owner:true}),true);
});
test('logout lock always wins and online authorization requires a session',()=>{
 assert.equal(privateAccessAllowed({online:false,locked:true,cached}),false);
 assert.equal(privateAccessAllowed({online:true,locked:true,sessionId:cached.id,owner:true}),false);
 assert.equal(privateAccessAllowed({online:true,locked:false,cached,owner:true}),false);
});

const fixture=()=>({profile:{id:'owner-id',display_name:'Alexandra',native_language:'zh-CN',timezone:'Asia/Shanghai',daily_goal_minutes:30,preferred_explanation_level:'detailed',theme:'system',updated_at:new Date(1000).toISOString()},languages:[{user_id:'owner-id',language_code:'en',current_level:'B2',target_level:'C1',primary_language:true,learning_goal:'商务',interests:['work'],updated_at:new Date(1000).toISOString()},{user_id:'owner-id',language_code:'ja',current_level:'N4',target_level:'N2',primary_language:false,learning_goal:'旅行',interests:['travel'],updated_at:new Date(1000).toISOString()}],progress:null});
test('a new device starts with the server profile and independent language records',()=>{
 const remote=initialAccountState(fixture(),'dark');
 assert.equal(remote.profile.name,'Alexandra');assert.equal(remote.profile.language,'en');assert.equal(remote.profile.level,'B2');assert.equal(remote.profile.dailyGoal,30);assert.equal(remote.profile.timezone,'Asia/Shanghai');assert.equal(remote.languageProfiles.ja.targetLevel,'N2');assert.equal(remote.theme,'dark');
 const result=mergeStates(structuredClone(initialState),remote);assert.equal(result.profile.name,'Alexandra');assert.equal(result.profile.level,'B2');
});
test('initial account hydration preserves a more recent offline profile edit',()=>{
 const base=structuredClone(initialState),edited=stampChanges(base,{...base,profile:{...base.profile,name:'My preferred name'}},2000);
 assert.equal(mergeStates(edited,initialAccountState(fixture())).profile.name,'My preferred name');
});
test('account initialization creates no invented learning history',()=>{
 const state=initialAccountState(fixture());
 assert.equal(state.sessions.length,0);assert.equal(state.reviewHistory.length,0);assert.equal(state.mistakes.length,0);assert.equal(state.profile.onboarded,false);
});
