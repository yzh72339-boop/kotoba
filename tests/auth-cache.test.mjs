import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
function worker(){
 const handlers={};
 class BrowserRequest extends Request{constructor(input){super(new URL(input,'https://kotoba.example.test'))}}
 vm.runInNewContext(readFileSync(new URL('../public/sw.js',import.meta.url),'utf8'),{URL,Request:BrowserRequest,self:{location:{origin:'https://kotoba.example.test'},addEventListener:(name,handler)=>{handlers[name]=handler}},caches:{open:async()=>({match:async()=>new Response('offline app shell')})},fetch:async()=>{throw Error('No network in fixture')}});
 return handlers;
}
test('OAuth and Sites authentication navigations always reach the server',()=>{
 const {fetch}=worker();
 for(const path of ['/?code=fixture','/?error=server_error&error_description=fixture','/?sb_flow_id=fixture','/?access_token=fixture','/signin-with-chatgpt','/signout-with-chatgpt','/callback?code=fixture','/auth/return','/api/private']){
  let intercepted=false;
  fetch({request:{url:'https://kotoba.example.test'+path,method:'GET',mode:'navigate'},respondWith:()=>{intercepted=true}});
  assert.equal(intercepted,false,path);
 }
});
test('ordinary learning navigation retains its offline shell',async()=>{
 let response;
 worker().fetch({request:{url:'https://kotoba.example.test/?page=Reading',method:'GET',mode:'navigate'},respondWith:r=>{response=r}});
 assert.equal(await (await response).text(),'offline app shell');
});
