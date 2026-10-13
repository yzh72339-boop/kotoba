/* Real GoTrue 2.184.0 + PostgreSQL 17 on disposable local Docker resources.
   Fixture mail stays in process memory. Never uses production environment keys. */
import {createServer as smtpServer} from 'node:net';
import {createServer as httpServer} from 'node:http';
import {spawnSync} from 'node:child_process';
import {createHmac,randomBytes,randomUUID} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {initialState} from '../lib/store.ts';
const suffix=randomUUID().slice(0,8),db='kotoba-beta-auth-db-'+suffix,auth='kotoba-beta-auth-api-'+suffix,network='kotoba-beta-auth-net-'+suffix;
const env={...process.env};for(const k of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete env[k];
const secret=randomBytes(48).toString('hex'),password='Fixture-Password-'+randomUUID(),messages=new Map();let rejectMail=false;
const jwt=claims=>{const data=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({...claims,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url');return data+'.'+createHmac('sha256',secret).update(data).digest('base64url')};
const adminToken=jwt({role:'service_role',aud:'authenticated'}),checks=[];
function docker(commands,input){const r=spawnSync('docker',['--host=unix:///var/run/docker.sock',...commands],{env,input,encoding:'utf8',maxBuffer:8*1024*1024});if(r.status!==0)throw new Error((r.stderr||r.stdout).slice(0,2000));return r.stdout.trim()}
const sql=input=>docker(['exec','-i',db,'psql','-h','127.0.0.1','-U','postgres','-v','ON_ERROR_STOP=1','-At'],input);
const smtp=smtpServer(socket=>{
 socket.setEncoding('utf8');socket.write('220 Local fixture SMTP\r\n');let buffer='',data=false,body='',recipient='';
 socket.on('data',chunk=>{buffer+=chunk;let end;while((end=buffer.indexOf('\r\n'))>=0){const line=buffer.slice(0,end);buffer=buffer.slice(end+2);
  if(data){if(line!=='.'){body+=line+'\r\n';continue}data=false;if(rejectMail)socket.write('451 Fixture delivery failure\r\n');else{messages.set(recipient,body);socket.write('250 Queued\r\n')}body='';continue}
  if(/^EHLO|^HELO/i.test(line))socket.write('250-local-fixture\r\n250 PIPELINING\r\n');
  else if(/^MAIL FROM/i.test(line)){body='';socket.write('250 OK\r\n')}
  else if(/^RCPT TO/i.test(line)){recipient=line.match(/<([^>]+)>/)?.[1]?.toLowerCase()??'';socket.write('250 OK\r\n')}
  else if(/^DATA/i.test(line)){data=true;socket.write('354 End with dot\r\n')}
  else if(/^QUIT/i.test(line))socket.end('221 Bye\r\n');else socket.write('250 OK\r\n');
 }});
});
await new Promise(resolve=>smtp.listen(0,'0.0.0.0',resolve));
const portProbe=httpServer();await new Promise(resolve=>portProbe.listen(0,'127.0.0.1',resolve));const port=portProbe.address().port;await new Promise(resolve=>portProbe.close(resolve));
const origin='http://127.0.0.1:'+port;
async function api(path,body,{admin=false,token,method='POST'}={}){
 const response=await fetch(origin+path,{method,headers:{'Content-Type':'application/json',...(admin?{Authorization:'Bearer '+adminToken}:token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
 const text=await response.text();let value;try{value=JSON.parse(text)}catch{value={}}return {status:response.status,data:value};
}
function startAuth(hook){
 const vars={GOTRUE_API_HOST:'0.0.0.0',GOTRUE_API_PORT:'9999',API_EXTERNAL_URL:origin,GOTRUE_SITE_URL:origin,GOTRUE_URI_ALLOW_LIST:origin+'/**',GOTRUE_DB_DRIVER:'postgres',GOTRUE_DB_DATABASE_URL:'postgres://supabase_auth_admin@'+db+':5432/postgres?sslmode=disable',GOTRUE_JWT_SECRET:secret,GOTRUE_JWT_ADMIN_ROLES:'service_role',GOTRUE_JWT_AUD:'authenticated',GOTRUE_DISABLE_SIGNUP:'false',GOTRUE_EXTERNAL_EMAIL_ENABLED:'true',GOTRUE_MAILER_AUTOCONFIRM:'false',GOTRUE_EXTERNAL_ANONYMOUS_USERS_ENABLED:'false',GOTRUE_PASSWORD_MIN_LENGTH:'12',GOTRUE_PASSWORD_REQUIRED_CHARACTERS:'abcdefghijklmnopqrstuvwxyz:ABCDEFGHIJKLMNOPQRSTUVWXYZ:0123456789:!@#$%^&*()_+-=[]{};\'"|,.<>/?`~',GOTRUE_SMTP_HOST:'host.docker.internal',GOTRUE_SMTP_PORT:String(smtp.address().port),GOTRUE_SMTP_ADMIN_EMAIL:'test@kotoba.invalid',GOTRUE_SMTP_SENDER_NAME:'Kotoba isolated test',GOTRUE_SMTP_MAX_FREQUENCY:'0s',GOTRUE_RATE_LIMIT_EMAIL_SENT:'1000',GOTRUE_RATE_LIMIT_SIGNUPS:'1000',GOTRUE_RATE_LIMIT_TOKEN_REFRESH:'1000',GOTRUE_HOOK_BEFORE_USER_CREATED_ENABLED:String(hook),GOTRUE_HOOK_BEFORE_USER_CREATED_URI:'pg-functions://postgres/private/before_user_created'};
 docker(['run','-d','--name',auth,'--network',network,'--add-host','host.docker.internal:host-gateway','-p','127.0.0.1:'+port+':9999',...Object.entries(vars).flatMap(([k,v])=>['-e',k+'='+v]),'supabase/gotrue:v2.184.0']);
}
async function healthy(){for(let i=0;i<80;i++){try{if((await fetch(origin+'/health',{signal:AbortSignal.timeout(1000)})).ok)return}catch{}await new Promise(r=>setTimeout(r,250))}throw new Error('Local GoTrue startup failed; inspect fixture container before retrying')}
async function confirmation(email,type='signup'){
 const raw=messages.get(email);assert.ok(raw,'Confirmation email missing');
 const decoded=raw.replace(/=\r\n/g,'').replace(/=3D/g,'=');const link=decoded.match(/https?:\/\/[^\s"<>]+\/verify\?[^\s"<>]+/)?.[0]?.replace(/&amp;/g,'&');assert.ok(link,'Verification link missing');
 const url=new URL(link);assert.equal(url.origin,origin);assert.equal(url.searchParams.get('type'),type);
 const response=await fetch(link,{redirect:'manual',signal:AbortSignal.timeout(10000)});assert.equal(response.status,303);
 const location=response.headers.get('location');assert.ok(location);const target=new URL(location);assert.equal(target.origin,origin);const params=new URLSearchParams(target.hash.slice(1));assert.ok(params.get('access_token'),'Verified session missing');return params.get('access_token');
}
try{
 docker(['network','create',network]);docker(['run','-d','--name',db,'--network',network,'-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:17-alpine']);
 for(let i=0;i<50;i++){try{docker(['exec',db,'pg_isready','-h','127.0.0.1','-U','postgres']);break}catch{if(i===49)throw new Error('Postgres unavailable');await new Promise(r=>setTimeout(r,200))}}
 sql('create role supabase_auth_admin login;create schema auth authorization supabase_auth_admin;alter role supabase_auth_admin set search_path=auth;');startAuth(false);await healthy();
 // Simulate an existing third-party admin identity without replacing its UUID.
 const created=await api('/admin/users',{email:'owner@kotoba.invalid',email_confirm:true,app_metadata:{provider:'google',providers:['google']}},{admin:true});assert.equal(created.status,200);const owner=created.data.id;assert.match(owner,/^[a-f0-9-]{36}$/);
 const ordinary=await api('/admin/users',{email:'existing@kotoba.invalid',password,email_confirm:true},{admin:true});assert.equal(ordinary.status,200);
 let base=await readFile('tests/fixtures/content-backend-bootstrap.sql','utf8');base=base.replace('create schema auth;','').replace(/create table auth.users\([^\n]+\);\n/,'').replaceAll('create function auth.','create or replace function auth.');
 base+='\ngrant select,insert,update,delete on storage.objects to authenticated;';
 for(const file of ['001_kotoba','002_personal_backend','003_sync_and_srs','004_ai_requests_and_content','005_hardening_and_projection','006_personal_audio_and_memory','007_audio_position_identity','008_phase_one_private_account','009_private_permissions_and_storage'])base+='\nbegin;\n'+await readFile('supabase/migrations/'+file+'.sql','utf8')+'\ncommit;\n';
 base+=`select public.configure_private_owner('owner@kotoba.invalid');insert into supabase_migrations.schema_migrations(version,name) select lpad(i::text,3,'0'),'isolated-auth' from generate_series(1,9)i;`;
 for(const n of ['010','011','012','013'])base+='\n'+await readFile('supabase/dashboard/'+n+'_deploy.sql','utf8');
 sql(base);sql(`update auth.users set encrypted_password='' where id='${owner}';insert into public.user_progress(user_id,state,revision) values('${owner}',$s$${JSON.stringify({...initialState,notes:{original:'owner-preserved'}})}$s$,6);`);
 assert.throws(()=>sql(`select set_config('request.jwt.claim.sub','${owner}',false);set role authenticated;select public.beta_set_registration(true,10);`),/verified email\/password login/);
 const changed=await api('/admin/users/'+owner,{password},{admin:true,method:'PUT'});assert.equal(changed.status,200);assert.equal(changed.data.id,owner);
 const adminLogin=await api('/token?grant_type=password',{email:'owner@kotoba.invalid',password});assert.equal(adminLogin.status,200);assert.equal(adminLogin.data.user.id,owner);
 assert.equal(sql(`select state->'notes'->>'original' from public.user_progress where user_id='${owner}';`),'owner-preserved');
 checks.push('Original administrator UUID, existing data and password login preserved; opening refused before password existed');
 const loginClaims=JSON.parse(Buffer.from(adminLogin.data.access_token.split('.')[1],'base64url').toString());
 sql(`select set_config('request.jwt.claim.sub','${owner}',false);select set_config('request.jwt.claims',$c$${JSON.stringify(loginClaims)}$c$,false);set role authenticated;select public.beta_set_registration(true,10);`);
 docker(['rm','-fv',auth]);startAuth(true);await healthy();
 const before=sql('select count(*) from private.beta_members;');rejectMail=true;
 const failed=await api('/signup',{email:'delivery-failure@kotoba.invalid',password});assert.ok(failed.status>=400);rejectMail=false;
 assert.equal(sql('select count(*) from private.beta_members;'),before);assert.equal(sql("select count(*) from auth.users where email='delivery-failure@kotoba.invalid';"),'0');
 checks.push('Actual GoTrue SMTP failure rolls back Auth user and seat; Hook never leaves a reservation');
 const requests=Array.from({length:25},(_,i)=>({email:'new'+i+'@kotoba.invalid',password}));
 const results=await Promise.all(requests.map(request=>api('/signup',request)));const accepted=requests.filter((_,i)=>results[i].status===200);
 assert.equal(accepted.length,9);assert.equal(sql('select count(*) from private.beta_members;'),'10');assert.equal(sql(`select count(*) from auth.users where id<>'${owner}';`),'10');
 const eleventh=await api('/signup',{email:'eleventh@kotoba.invalid',password});assert.ok(eleventh.status>=400);checks.push('25 real concurrent /signup requests with installed PostgreSQL Hook: exactly ten ordinary Auth users; eleventh refused');
 const email=accepted[0].email;const unconfirmed=await api('/token?grant_type=password',{email,password});assert.equal(unconfirmed.status,400);assert.equal(unconfirmed.data.error_code,'email_not_confirmed');
 const verifiedToken=await confirmation(email);const login=await api('/token?grant_type=password',{email,password});assert.equal(login.status,200);const uid=login.data.user.id;
 const refresh=await api('/token?grant_type=refresh_token',{refresh_token:login.data.refresh_token});assert.equal(refresh.status,200);assert.equal(refresh.data.user.id,uid);
 const recover=await api('/recover',{email});assert.equal(recover.status,200);const recoveryToken=await confirmation(email,'recovery');const newPassword='Changed-Fixture-Password-'+randomUUID();const updated=await api('/user',{password:newPassword},{token:recoveryToken,method:'PUT'});assert.equal(updated.status,200);
 const changedLogin=await api('/token?grant_type=password',{email,password:newPassword});assert.equal(changedLogin.status,200);assert.equal(changedLogin.data.user.id,uid);
 assert.ok((await api('/user',undefined,{token:verifiedToken,method:'GET'})).status>=400,'Old session should be revoked after recovery/password change');
 checks.push('At full capacity: email verification, existing password login, refresh session, password recovery and password update all succeed');
 const bad=await api('/signup',{email:'bad-password@kotoba.invalid',password:'weak'});assert.ok(bad.status>=400);assert.equal(sql('select count(*) from private.beta_members;'),'10');
 const pendingEmail=accepted[1].email,target=sql(`select id from auth.users where email='${pendingEmail}';`);
 assert.equal((await api('/admin/users/'+target,undefined,{admin:true,method:'DELETE'})).status,200);assert.equal(sql('select count(*) from private.beta_members;'),'9');
 await api('/admin/users/'+target,undefined,{admin:true,method:'DELETE'});assert.equal(sql('select count(*) from private.beta_members;'),'9');
 const replacement=await api('/signup',{email:'replacement@kotoba.invalid',password});assert.equal(replacement.status,200);assert.equal(sql('select count(*) from private.beta_members;'),'10');
 assert.ok((await api('/admin/users/'+owner,undefined,{admin:true,method:'DELETE'})).status>=400);assert.equal((await api('/token?grant_type=password',{email:'owner@kotoba.invalid',password})).status,200);
 checks.push('Safe Auth API hard deletion releases one slot; repeat deletion cannot release twice; replacement accepted; admin deletion refused');
 await mkdir('/workspace/deliverables/kotoba-291',{recursive:true});const report={scope:'Local GoTrue v2.184.0 + PostgreSQL 17 + in-memory SMTP. Not live Supabase, physical mobile or production CAPTCHA/SMTP.',checks,concurrentRequests:25,ordinaryAccounts:10,errors:[]};await writeFile('/workspace/deliverables/kotoba-291/auth-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch(error){
 const logs=spawnSync('docker',['--host=unix:///var/run/docker.sock','logs','--tail','12',auth],{env,encoding:'utf8'});
 const diagnostic=(logs.stdout+logs.stderr).replaceAll(secret,'[fixture secret]').replaceAll(password,'[fixture password]').replaceAll(adminToken,'[fixture admin token]');
 await writeFile('/tmp/kotoba-291-auth-diagnostic.log',diagnostic);throw error;
}finally{
 spawnSync('docker',['--host=unix:///var/run/docker.sock','rm','-fv',auth,db],{env,encoding:'utf8'});spawnSync('docker',['--host=unix:///var/run/docker.sock','network','rm',network],{env,encoding:'utf8'});await new Promise(resolve=>smtp.close(resolve));
}
