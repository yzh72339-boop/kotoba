import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {betaRegistration,betaPassword,betaStatusSchema,betaRegistrationAvailable,safeAuthMessage,missingBetaCapability} from '../lib/beta-auth.ts';
import {storageIdentity,selectStorageIdentity,lockStorageIdentity,assertStorageIdentity,learningFallbackKey} from '../lib/storage-identity.ts';
import {storedAuthUserId} from '../lib/private-session.ts';
test('resumed-page identity checks reject absent, malformed and foreign credentials',()=>{
 const id='11111111-1111-4111-8111-111111111111';assert.equal(storedAuthUserId(JSON.stringify({user:{id}})),id);
 for(const input of [null,'bad-json','{}','{"user":{"id":"../other-account"}}'])assert.equal(storedAuthUserId(input),null);
 assert.notEqual(storedAuthUserId(JSON.stringify({user:{id:'22222222-2222-4222-8222-222222222222'}})),id);
});
test('registration normalizes email, requires confirmed strong password and never trims password',()=>{
 const password='A secure-password-123';assert.equal(betaRegistration.parse({email:' User@Example.com ',password,confirmPassword:password}).email,'user@example.com');
 for(const input of [{email:'invalid',password,confirmPassword:password},{email:'user@example.com',password:'short',confirmPassword:'short'},{email:'user@example.com',password,confirmPassword:'mismatch'}])assert.equal(betaRegistration.safeParse(input).success,false);
 assert.equal(betaPassword.safeParse('aaaaaaaaaaaaaa').success,false);assert.equal(betaPassword.safeParse('A'.repeat(129)+'a1!').success,false);
});
test('capacity UI is fail-closed, bounded at ten and not the registration authority',()=>{
 const status={enabled:true,open:true,total:10,remaining:7};assert.equal(betaStatusSchema.parse(status).remaining,7);
 assert.equal(betaRegistrationAvailable(status,true),true);
 for(const [value,token] of [[null,true],[{...status,open:false},true],[{...status,enabled:false},true],[{...status,remaining:0},true],[status,false]])assert.equal(betaRegistrationAvailable(value,token),false);
 assert.equal(betaStatusSchema.safeParse({...status,total:11}).success,false);assert.equal(betaStatusSchema.safeParse({...status,remaining:11}).success,false);
});
test('safe errors distinguish full, confirmation, CAPTCHA and rate limits without echoing private provider details',()=>{
 const secretUrl='https://private.invalid/?token=never-echo';assert.equal(safeAuthMessage({message:secretUrl}).includes(secretUrl),false);
 assert.match(safeAuthMessage({message:'Beta capacity reached'}),/名额已满/);assert.match(safeAuthMessage({code:'email_not_confirmed'}),/尚未验证/);
 assert.match(safeAuthMessage({code:'captcha_failed'}),/机器人验证/);assert.match(safeAuthMessage({status:429}),/过于频繁/);
 assert.equal(missingBetaCapability({code:'PGRST202'}),true);assert.equal(missingBetaCapability({code:'42501'}),false);assert.equal(missingBetaCapability({message:'network failed'}),false);
});
test('direct signup skips only the CAPTCHA dependency and preserves closed/full/unknown capacity fences',()=>{
 const status={enabled:true,open:true,total:10,remaining:1};assert.equal(betaRegistrationAvailable(status,false,false),true);
 for(const value of [null,{...status,open:false},{...status,enabled:false},{...status,remaining:0}])assert.equal(betaRegistrationAvailable(value,false,false),false);
 assert.equal(betaRegistrationAvailable(status,false),false);
 assert.match(safeAuthMessage({code:'captcha_failed'},true),/服务器仍启用验证码/);
 assert.match(safeAuthMessage({code:'email_not_confirmed'},true),/尚未激活/);
 assert.doesNotMatch(safeAuthMessage({message:'private details'},true),/申请邮件/);
});
test('project and user isolate local state, queues and fallback storage; old operations cannot write into a new account',()=>{
 const a=selectStorageIdentity('https://project-a.invalid','user-a'),b=selectStorageIdentity('https://project-a.invalid','user-b');
 assert.notEqual(a.databaseName,b.databaseName);assert.notEqual(a.fallbackKey,b.fallbackKey);assert.throws(()=>assertStorageIdentity(a),/Account changed/);
 assert.equal(learningFallbackKey(b),b.fallbackKey);assert.equal(selectStorageIdentity(b.project,b.userId),b);
 const other=selectStorageIdentity('https://project-b.invalid','user-b');assert.notEqual(other.databaseName,b.databaseName);assert.throws(()=>learningFallbackKey(b),/Account changed/);
 lockStorageIdentity();assert.equal(storageIdentity().userId,null);assert.throws(()=>assertStorageIdentity(other),/Account changed/);
});
test('original admin legacy IDs/storage are retained only when explicitly selected by verified gate',()=>{
 const owner=selectStorageIdentity('https://project-a.invalid','original-owner',true);assert.equal(owner.databaseName,'kotoba-personal');assert.equal(owner.fallbackKey,'kotoba.v1');
 const normal=selectStorageIdentity('https://project-a.invalid','member');assert.notEqual(normal.databaseName,owner.databaseName);
 assert.throws(()=>assertStorageIdentity(owner),/Account changed/);assert.equal(selectStorageIdentity(owner.project,owner.userId,true).databaseName,'kotoba-personal');
});
test('registration, password callbacks and private download paths always bypass app-shell cache',()=>{
 const handlers={};vm.runInNewContext(readFileSync('public/sw.js','utf8'),{URL,self:{location:{origin:'https://app.invalid'},addEventListener:(type,handler)=>handlers[type]=handler}});
 for(const path of ['/register/','/login/','/auth/reset/?code=fixture','/auth/confirm/?code=fixture','/downloads/private-file']){
  let intercepted=false;handlers.fetch({request:{method:'GET',url:'https://app.invalid'+path,mode:'navigate'},respondWith:()=>{intercepted=true}});assert.equal(intercepted,false,path);
 }
});
