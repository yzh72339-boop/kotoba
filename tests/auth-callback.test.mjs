import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {readInitializedSession,authCallbackMessage} from '../lib/auth-callback.ts';

// Exercise the installed SDK with fake provider responses and no real account.
globalThis.BroadcastChannel=undefined;
globalThis.document={};
const app='https://kotoba.example.test/';
function browser(href){
 globalThis.window={location:{href},addEventListener(){},removeEventListener(){},history:{state:null,replaceState(_state,_title,url){window.location.href=String(url)}}};
}
function fixtureSession(){
 const user={id:'11111111-1111-4111-8111-111111111111',email:'owner@example.test',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:new Date().toISOString()};
 const payload=Buffer.from(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url');
 return {access_token:`e30.${payload}.fixture`,refresh_token:'fixture-refresh-token',token_type:'bearer',expires_in:3600,user};
}
function client(fetch,values=new Map()){
 return createClient('https://supabase.example.test','public-fixture-key',{auth:{storageKey:'callback-test',storage:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)},flowType:'pkce',detectSessionInUrl:true,autoRefreshToken:false},global:{fetch}});
}
test('provider callback failure survives the SDK getSession error omission',async()=>{
 browser(app+'?error=server_error&error_code=unexpected_failure&error_description=Unable+to+exchange+external+code');
 const c=client(async()=>{throw Error('Callback errors must not request tokens')});
 const result=await readInitializedSession(c.auth);
 assert.equal(result.session,null);assert.ok(result.error);
 assert.match(authCallbackMessage(result.error),/GOOGLE_EXCHANGE_FAILED/);
 assert.equal((await c.auth.getSession()).error,null);
});
test('successful PKCE return exchanges once and persists the session',async()=>{
 browser(app+'?code=fixture-auth-code');
 const values=new Map([['callback-test-code-verifier',JSON.stringify('fixture-verifier')]]);let exchanges=0;
 const c=client(async(url,options)=>{
  assert.match(String(url),/\/token\?grant_type=pkce$/);assert.deepEqual(JSON.parse(options.body),{auth_code:'fixture-auth-code',code_verifier:'fixture-verifier'});exchanges++;
  return Response.json(fixtureSession());
 },values);
 const result=await readInitializedSession(c.auth);
 assert.equal(result.error,null);assert.equal(result.session.user.email,'owner@example.test');
 assert.equal(exchanges,1);assert.ok(values.has('callback-test'));
 assert.equal(new URL(window.location.href).searchParams.has('code'),false);
 assert.equal((await readInitializedSession(c.auth)).session.user.id,result.session.user.id);assert.equal(exchanges,1);
});
test('a callback exchange error is visible without retrying a single-use code',async()=>{
 browser(app+'?code=expired-fixture-code');let exchanges=0;
 const c=client(async()=>{exchanges++;return Response.json({code:'flow_state_expired',msg:'Flow state expired'},{status:400})},new Map([['callback-test-code-verifier',JSON.stringify('fixture-verifier')]]));
 const result=await readInitializedSession(c.auth);
 assert.equal(result.session,null);assert.match(authCallbackMessage(result.error),/OAUTH_CALLBACK_EXPIRED/);assert.equal(exchanges,1);
 await readInitializedSession(c.auth);assert.equal(exchanges,1);
});
test('password sign-in still succeeds after a failed Google callback',async()=>{
 browser(app+'?error=server_error&error_description=Unable+to+exchange+external+code');
 const c=client(async(url)=>{assert.match(String(url),/grant_type=password/);return Response.json(fixtureSession())});
 assert.ok((await readInitializedSession(c.auth)).error);
 assert.equal((await c.auth.signInWithPassword({email:'owner@example.test',password:'fixture-only'})).error,null);
 const result=await readInitializedSession(c.auth);assert.equal(result.error,null);assert.equal(result.session.user.email,'owner@example.test');
});
test('provider secrets and callback URLs are never reflected into the message',()=>{
 const secret='private-secret-fixture';
 const message=authCallbackMessage({message:`unexpected failure ${secret} https://example.test/?code=${secret}`});
 assert.ok(!message.includes(secret));assert.ok(!message.includes('https://'));
});
