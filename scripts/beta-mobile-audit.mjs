/* Browser UI/account isolation with simulated Auth/RPC/CAPTCHA only.
   All Supabase requests are intercepted; production/real CAPTCHA is never used. */
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {initialState} from '../lib/store.ts';
const {chromium}=createRequire(import.meta.url)('playwright');
const origin=process.env.APP_URL??'http://127.0.0.1:4179',output=process.env.BETA_AUDIT_DIR??'/workspace/deliverables/kotoba-291/mobile';
if(!['127.0.0.1','localhost'].includes(new URL(origin).hostname))throw new Error('Isolated beta QA requires loopback origin');
const host='ocbydnsqennrumowqxvu.supabase.co',project='https://'+host;
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222',owner='33333333-3333-4333-8333-333333333333';
const report={scope:'Chromium mobile widths; simulated Auth/backend/CAPTCHA. Not real owner, physical device, production CAPTCHA/SMTP or cross-device.',checks:[],errors:[]};
await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox',`--host-resolver-rules=MAP ${host} 127.0.0.1`]});
let activePage;
function user(id){return {id,email:(id===a?'a':id===b?'b':'owner')+'@beta.invalid',aud:'authenticated',role:'authenticated',created_at:new Date().toISOString(),email_confirmed_at:new Date().toISOString(),app_metadata:{provider:'email'},user_metadata:{}}}
function token(id){return Buffer.from(JSON.stringify({alg:'none'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.ui-fixture'}
function session(id){return {access_token:token(id),refresh_token:'ui-fixture-not-a-secret',expires_in:3600,token_type:'bearer',user:user(id)}}
function uid(request){try{return JSON.parse(Buffer.from((request.headers().authorization??'').split('.')[1],'base64url').toString()).sub}catch{return null}}
async function captcha(page){await page.getByRole('button',{name:'完成验证（模拟）'}).click()}
async function login(page,email){await page.getByLabel('邮箱',{exact:true}).fill(email);await page.getByLabel('密码',{exact:true}).fill('Fixture-Password-123!');await captcha(page);await page.getByRole('button',{name:'登录',exact:true}).click();await page.locator('.app-shell').waitFor();await page.waitForTimeout(250)}
try{
 for(const width of [360,390,430]){
  const context=await browser.newContext({viewport:{width,height:844},colorScheme:width===390?'dark':'light',reducedMotion:width===430?'reduce':'no-preference',serviceWorkers:'block'});
  context.on('page',page=>{page.on('pageerror',error=>report.errors.push(error.message));page.on('dialog',dialog=>void dialog.accept())});
  let remaining=7,signups=0,recoveries=0;const states=new Map([a,b,owner].map(id=>{const state=structuredClone(initialState);state.profile.name=id===a?'Member A':id===b?'Member B':'Original Owner';state.profile.onboarded=true;state.notes.privateMarker=id;return [id,{revision:1,state}]}));
  await context.route('https://js.hcaptcha.com/**',route=>route.fulfill({contentType:'application/javascript',body:`(function(){var widgets={},next=0;window.hcaptcha={render:function(node,o){var id='fixture-'+next++,button=document.createElement('button');button.type='button';button.textContent='完成验证（模拟）';button.onclick=function(){o.callback('ui-captcha-fixture');};node.appendChild(button);widgets[id]=button;return id;},remove:function(id){if(widgets[id])widgets[id].remove();delete widgets[id];}};})();`}));
  await context.route(`https://${host}/**`,async route=>{
   const request=route.request(),url=new URL(request.url()),path=url.pathname,id=uid(request);let data;
   if(path==='/auth/v1/token'){
    const body=request.postDataJSON();assert.equal(body.gotrue_meta_security?.captcha_token,'ui-captcha-fixture');data=session(body.email==='a@beta.invalid'?a:body.email==='b@beta.invalid'?b:owner);
   }else if(path==='/auth/v1/signup'){signups++;const body=request.postDataJSON();assert.equal(body.gotrue_meta_security?.captcha_token,'ui-captcha-fixture');remaining--;data={...user('44444444-4444-4444-8444-444444444444'),email_confirmed_at:null};await new Promise(r=>setTimeout(r,150));}
   else if(path==='/auth/v1/recover'){recoveries++;assert.equal(request.postDataJSON().gotrue_meta_security?.captcha_token,'ui-captcha-fixture');data={};}
   else if(path==='/auth/v1/user')data=user(id);
   else if(path==='/auth/v1/logout')data={};
   else if(path.endsWith('/beta_signup_status'))data={enabled:true,open:true,total:10,remaining};
   else if(path.endsWith('/is_private_owner'))data=id===owner;
   else if(path.endsWith('/has_learning_access')||path.endsWith('/content_library_ready')||path.endsWith('/personal_context_ready'))data=[a,b,owner].includes(id);
   else if(path.endsWith('/get_private_account')){assert.ok(states.has(id));const entry=states.get(id);data={profile:{id,display_name:entry.state.profile.name,native_language:'zh-CN',timezone:'Etc/UTC',daily_goal_minutes:20,preferred_explanation_level:'normal',theme:'system',updated_at:new Date().toISOString()},languages:['ja','en'].map(language_code=>({user_id:id,language_code,current_level:language_code==='ja'?'N3':'B1',target_level:null,primary_language:language_code==='ja',learning_goal:'日常交流',interests:[],updated_at:new Date().toISOString()})),progress:entry};}
   else if(path.endsWith('/sync_personal_state')){assert.ok(states.has(id));const body=request.postDataJSON(),old=states.get(id);if(body.expected_revision!==old.revision)data={applied:false,...old};else{const updated={state:body.p_state,revision:old.revision+1};states.set(id,updated);data={applied:true,...updated}}}
   else if(path.endsWith('/beta_admin_accounts')){assert.equal(id,owner);data={status:{enabled:true,open:true,total:10,remaining},accounts:[{id:a,seat:1,email:'a@beta.invalid',confirmed:true,createdAt:new Date().toISOString()}]};}
   else if(path==='/functions/v1/ai-tutor')return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'AI intentionally unavailable in browser fixture'})});
   else{report.errors.push('Unmocked API '+path);return route.abort('blockedbyclient')}
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
  });
  const page=await context.newPage();activePage=page;
  await page.goto(origin+'/register/');await page.getByText('当前剩余 7 / 10 个注册名额。',{exact:false}).waitFor();
  await page.getByLabel('邮箱',{exact:true}).fill('new@beta.invalid');await page.getByLabel('密码',{exact:true}).fill('Fixture-Password-123!');await page.getByLabel('确认密码',{exact:true}).fill('Different-Password-123!');await captcha(page);
  await page.getByRole('button',{name:'注册并发送验证邮件'}).click();await page.getByRole('alert').filter({hasText:'两次密码不一致'}).waitFor();assert.equal(signups,0);
  await page.getByLabel('确认密码',{exact:true}).fill('Fixture-Password-123!');
  await page.getByRole('button',{name:'注册并发送验证邮件'}).evaluate(button=>{button.click();button.click()});await page.getByRole('alert').filter({hasText:'确认邮件已发送'}).waitFor();assert.equal(signups,1);
  await page.screenshot({path:`${output}/registration-${width}.png`,fullPage:true});
  remaining=0;await page.reload();await page.getByText('内测名额已满，暂不接受新用户注册。',{exact:false}).waitFor();assert.equal(await page.getByRole('button',{name:'注册并发送验证邮件'}).isEnabled(),false);
  await page.goto(origin+'/login/');await page.getByRole('button',{name:'忘记密码'}).click();await page.getByLabel('邮箱',{exact:true}).fill('a@beta.invalid');await captcha(page);await page.getByRole('button',{name:'发送密码找回邮件'}).click();await page.getByRole('alert').filter({hasText:'如果该邮箱已注册'}).waitFor();assert.equal(recoveries,1);
  await page.goto(origin+'/login/');await login(page,'a@beta.invalid');
  await page.getByRole('button',{name:'我的',exact:true}).click();await page.getByLabel('Display name',{exact:true}).fill('Member A Saved');await page.getByRole('button',{name:'Save name',exact:true}).click();
  await page.waitForFunction(async({project,a})=>{const req=indexedDB.open('kotoba-personal:'+encodeURIComponent(project)+':'+a);const db=await new Promise(r=>{req.onsuccess=()=>r(req.result)});if(!db.objectStoreNames.contains('state')){db.close();return false}const name=await new Promise(r=>{const q=db.transaction('state').objectStore('state').get('learning');q.onsuccess=()=>r(q.result?.profile.name)});db.close();return name==='Member A Saved'},{project,a});
  await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.waitForURL(url=>/^\/login\/?$/.test(url.pathname));await login(page,'b@beta.invalid');
  await page.getByRole('button',{name:'我的',exact:true}).click();await page.waitForFunction(()=>Array.from(document.querySelectorAll('label')).find(label=>label.textContent.includes('Display name'))?.querySelector('input')?.value==='Member B');assert.equal(await page.getByLabel('Display name',{exact:true}).inputValue(),'Member B');assert.equal((await page.locator('body').textContent()).includes('Member A Saved'),false);
  const stored=await page.evaluate(async({project,a,b})=>{
   async function name(id){const req=indexedDB.open('kotoba-personal:'+encodeURIComponent(project)+':'+id);const db=await new Promise(r=>{req.onsuccess=()=>r(req.result)});const state=await new Promise(r=>{const q=db.transaction('state').objectStore('state').get('learning');q.onsuccess=()=>r(q.result)});db.close();return {name:state?.profile.name,marker:state?.notes.privateMarker}}
   return {a:await name(a),b:await name(b)};
  },{project,a,b});assert.equal(stored.a.name,'Member A Saved');assert.equal(stored.b.name,'Member B');assert.notEqual(stored.a.marker,stored.b.marker);
  await page.reload();await page.locator('.app-shell').waitFor();await page.getByRole('button',{name:'我的',exact:true}).click();assert.equal(await page.getByLabel('Display name',{exact:true}).inputValue(),'Member B');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:`${output}/member-b-${width}.png`,fullPage:true});
  await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.waitForURL(url=>/^\/login\/?$/.test(url.pathname));
  await page.evaluate(async({project,owner,initial})=>{
   const state=structuredClone(initial);state.profile.onboarded=true;state.notes.ownerLegacy='preserved';
   const req=indexedDB.open('kotoba-personal',1);req.onupgradeneeded=()=>{for(const name of ['state','queue','content','meta','backups'])req.result.createObjectStore(name)};
   const db=await new Promise(r=>{req.onsuccess=()=>r(req.result)});
   await new Promise(r=>{const tx=db.transaction(['state','queue','meta'],'readwrite');tx.objectStore('state').put(state,'learning');tx.objectStore('queue').put({id:'legacy-op',at:Date.now()},'legacy-op');tx.objectStore('meta').put({id:owner,projectUrl:project,verifiedAt:Date.now()},'verifiedOwner');tx.oncomplete=r});db.close();
  },{project,owner,initial:initialState});
  await login(page,'owner@beta.invalid');await page.getByRole('button',{name:'我的',exact:true}).click();await page.getByRole('heading',{name:'内测名额管理'}).waitFor();
  const old=await page.evaluate(async()=>{const request=indexedDB.open('kotoba-personal');const db=await new Promise(r=>{request.onsuccess=()=>r(request.result)});const state=await new Promise(r=>{const q=db.transaction('state').objectStore('state').get('learning');q.onsuccess=()=>r(q.result)});db.close();return state.notes.ownerLegacy});assert.equal(old,'preserved');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:`${output}/admin-${width}.png`,fullPage:true});
  report.checks.push({width,registerValidation:true,captchaFixture:true,duplicateSubmitBlocked:true,fullRegistrationClosed:true,loginAndRecoveryAtCapacity:true,accountSwitchIsolation:true,refreshRestoration:true,legacyAdminCachePreserved:true,adminPanel:true,noOverflow:true});
  await context.close();
 }
 assert.deepEqual(report.errors,[]);
}catch(error){report.errors.push(error.message);if(activePage&&!activePage.isClosed()){report.failure={url:activePage.url(),text:await activePage.locator('body').innerText()};await activePage.screenshot({path:output+'/failure.png',fullPage:true}).catch(()=>{})}throw error}
finally{await browser.close();await writeFile(output+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report))}
