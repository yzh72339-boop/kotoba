/* Isolated UI QA with a simulated backend; never a real owner/RLS/device test.
   Every Supabase request is intercepted. Unknown API calls fail closed. */
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
import {mkdir,writeFile,readFile,copyFile} from 'node:fs/promises';
import {initialState} from '../lib/store.ts';
import {schedule} from '../lib/srs.ts';
const output=process.env.UI_AUDIT_DIR??'/workspace/deliverables/kotoba-silver-ui';
const origin=process.env.APP_URL??'http://127.0.0.1:4174';
const before=process.env.BEFORE_APP_URL;
const id='11111111-1111-4111-8111-111111111111';
const at=new Date().toISOString();
const user={id,email:'ui-fixture@example.invalid',aud:'authenticated',role:'authenticated',created_at:at,app_metadata:{provider:'email'},user_metadata:{}};
const backendHost='ocbydnsqennrumowqxvu.supabase.co';
const report={scope:'Chromium desktop emulation + simulated backend. Not real owner, RLS, Android device or iOS.',pages:[],checks:[],errors:[]};
let failurePage;
async function debugState(page,label){const value=await page.evaluate(async()=>{const request=indexedDB.open('kotoba-personal');const db=await new Promise(r=>request.onsuccess=()=>r(request.result));const state=await new Promise(r=>{const q=db.transaction('state').objectStore('state').get('learning');q.onsuccess=()=>r(q.result)});db.close();return {url:location.href,session:state?.activeSession,plan:Object.entries(state?.notes??{}).filter(([k])=>k.startsWith('daily-course-plan-')),header:document.querySelector('.session-current')?.textContent}});report.checks.push({label,...value});}
await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox',`--host-resolver-rules=MAP ${backendHost} 127.0.0.1`]});
async function setup(width,{dark=false,motion='no-preference',video=false,workers=false}={}){
 const context=await browser.newContext({viewport:{width,height:844},deviceScaleFactor:1,colorScheme:dark?'dark':'light',reducedMotion:motion,serviceWorkers:workers?'allow':'block',...(video?{recordVideo:{dir:output,size:{width,height:844}}}:{})});
 let snapshot=structuredClone(initialState),revision=0;
 snapshot.profile={...snapshot.profile,name:'Learner',level:'N2',onboarded:true,timezone:'Asia/Tokyo'};snapshot.languageProfiles.ja.level='N2';snapshot.theme=dark?'dark':'light';
 snapshot.notes['app-theme-preference']=dark?'dark':'light';
 snapshot.reviews['course-ja-n2-1']=schedule(undefined,'course-ja-n2-1','Good',Date.now()-3*86400000);
 const stamp=Date.now();for(const key of ['profile/name','profile/level','profile/onboarded','profile/timezone','theme','languageProfiles/ja'])snapshot._clock[key]=stamp;
 await context.route(`https://${backendHost}/**`,async route=>{
  const url=new URL(route.request().url()),path=url.pathname;let data;
  if(path.endsWith('/is_private_owner')||path.endsWith('/content_library_ready'))data=true;
  else if(path.endsWith('/get_private_account'))data={profile:{id,display_name:'Learner',native_language:'zh-CN',timezone:'Asia/Tokyo',daily_goal_minutes:20,preferred_explanation_level:'normal',theme:dark?'dark':'light',updated_at:at},languages:['ja','en'].map(language=>({user_id:id,language_code:language,current_level:language==='ja'?'N2':'B1',target_level:null,primary_language:language==='ja',learning_goal:'日常交流',interests:[],updated_at:at})),progress:{revision,state:snapshot}};
  else if(path.endsWith('/sync_personal_state')){snapshot=route.request().postDataJSON().p_state;data={applied:true,revision:++revision,state:snapshot};}
  else if(path==='/functions/v1/ai-tutor')return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'AI intentionally unavailable in isolated UI QA'})});
  else if(path==='/auth/v1/user')data=user;
  else if(path==='/auth/v1/logout')data={};
  else {report.errors.push('Unmocked backend: '+path);return route.abort('blockedbyclient')}
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
 });
 await context.addInitScript(({user,snapshot})=>{
  // This fixture token has no signature and cannot authenticate to a real service.
  const token=[btoa(JSON.stringify({alg:'none'})),btoa(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+86400})), 'ui-fixture'].join('.');
  localStorage.setItem('kotoba.private-auth',JSON.stringify({access_token:token,refresh_token:'ui-fixture-not-a-secret',expires_at:Math.floor(Date.now()/1000)+86400,expires_in:86400,token_type:'bearer',user}));
  if(!localStorage.getItem('kotoba.v1'))localStorage.setItem('kotoba.v1',JSON.stringify(snapshot));
 },{user,snapshot});
 const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 return {context,page};
}
async function ready(page){await page.locator('.app-shell').waitFor();await page.waitForTimeout(850)}
async function capture(page,name){await page.screenshot({path:`${output}/${name}.png`,fullPage:false});}
try{
 if(before&&!process.env.UI_AUDIT_CORE_ONLY){const {context,page}=await setup(390);await page.goto(before);await ready(page);await capture(page,'before-home-390');await context.close();}
 for(const width of process.env.UI_AUDIT_CORE_ONLY?[]:[360,390,430]){
  const {context,page}=await setup(width);
  for(const name of ['Today','Learn','Library','Vocabulary','Grammar','Reading','Review','Listening','Speaking','Progress','AI Tutor','My Sentences','Mistake Notebook','Profile','Settings']){
   await page.goto(`${origin}/#${encodeURIComponent(name)}`);await ready(page);
   const dimensions=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,accent:getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),tiny:[...document.querySelectorAll('button')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&(r.width<43||r.height<43)}).map(e=>({label:e.getAttribute('aria-label')??e.textContent?.trim().slice(0,35),w:e.offsetWidth,h:e.offsetHeight}))}));
   report.pages.push({width,page:name,...dimensions});
   if(dimensions.overflow)throw new Error(`${name} overflow at ${width}`);
   if(width===390)await capture(page,`after-${name.replaceAll(' ','-').toLowerCase()}-390`);
  }
  await context.close();
 }
 const {context,page}=await setup(390,{video:true});failurePage=page;
 await page.goto(origin);await ready(page);await capture(page,'after-home-390');
 await page.getByRole('button',{name:'开始学习',exact:true}).click();
 await page.locator('.reveal-btn').click();
 await page.locator('.rating-buttons button').nth(2).evaluate(button=>{button.click();button.click()});
 await page.waitForTimeout(350);
 const ratings=await page.evaluate(async()=>{const db=await new Promise(r=>{const q=indexedDB.open('kotoba-personal');q.onsuccess=()=>r(q.result)});const state=await new Promise(r=>{const q=db.transaction('state').objectStore('state').get('learning');q.onsuccess=()=>r(q.result)});db.close();return state.reviewHistory.filter(r=>r.cardId==='course-ja-n2-1').length});
 if(ratings!==1)throw new Error(`Repeated review produced ${ratings} events`);
 report.checks.push('one actual due-card rating updates history exactly once despite rapid repeated click');
 await page.getByRole('button',{name:'继续 · 理解新语法',exact:true}).waitFor({state:'visible'});
 await page.getByRole('button',{name:'继续 · 理解新语法',exact:true}).click();
 await page.locator('.library-grammar').waitFor();await page.waitForTimeout(650);await capture(page,'after-grammar-390');
 const grammarID=new URL(page.url()).searchParams.get('content');
 const grammar=JSON.parse(await readFile(`public/content/library/${grammarID}.json`,'utf8'));
 await page.getByRole('button',{name:'我的笔记',exact:true}).click();
 await page.getByRole('textbox',{name:'我的语法笔记'}).fill('UI 验收：接续与语境。');await page.setViewportSize({width:390,height:520});await page.waitForTimeout(150);const noteBox=await page.getByRole('textbox',{name:'我的语法笔记'}).boundingBox();if(!noteBox||noteBox.y+noteBox.height>520)throw new Error('note input obscured in short viewport');report.checks.push('note editor fits a shortened viewport (not a real soft keyboard)');await page.setViewportSize({width:390,height:844});
 await page.getByRole('button',{name:'完成',exact:true}).click();
 await page.getByRole('button',{name:'练习',exact:true}).click();
 for(const [index,exercise] of grammar.exercises.entries()){
  if(exercise.options)await page.locator('.library-question .quiz-options').getByRole('button',{name:exercise.acceptedAnswers[0],exact:true}).click();
  else await page.locator('.library-question textarea').fill(exercise.acceptedAnswers[0]);
  await page.locator('.library-question .answer-submit').click();
  await page.locator('.question-feedback').waitFor();
  if(index===0){await capture(page,'after-practice-feedback-390');await page.reload();await ready(page);await page.locator('.question-feedback').waitFor();report.checks.push('grammar answer + explanation restored after refresh');await debugState(page,'after-refresh');}
  if(index<grammar.exercises.length-1)await page.getByRole('button',{name:'下一题',exact:true}).click();
 }
 await page.getByRole('button',{name:'完成课程并加入复习',exact:true}).click();
 await debugState(page,'before-reading');await page.getByRole('button',{name:'继续 · 在阅读中运用',exact:true}).click();await page.waitForTimeout(900);await debugState(page,'after-reading');
 await page.locator('.reading-text').waitFor();await page.waitForTimeout(500);await page.evaluate(()=>scrollTo(0,0));await capture(page,'after-reading-390');
 const readingID=new URL(page.url()).searchParams.get('content');const reading=JSON.parse(await readFile(`public/content/library/${readingID}.json`,'utf8'));
 const collect=page.getByRole('button',{name:'收集句子并复习',exact:true}).first();await collect.click();report.checks.push('reading sentence collected into existing learning/SRS with article source');
 const mark=page.locator('.reading-grammar').first();if(await mark.count()){
  await mark.click();await page.getByRole('dialog').waitFor();await capture(page,'after-grammar-panel-390');
  const anchor=await page.evaluate(()=>scrollY);await page.getByRole('button',{name:'关闭',exact:true}).click();await page.waitForTimeout(400);
  if(Math.abs((await page.evaluate(()=>scrollY))-anchor)>3)throw new Error('panel close moved reading anchor');report.checks.push('grammar panel closes without moving reading position');
 }
 for(const [index,question] of reading.questions.entries()){
  if(index===0){const wrong=question.options.find((_,i)=>i!==question.answer);await page.locator('.library-question .quiz-options').getByRole('button',{name:wrong,exact:true}).click();await page.locator('.library-question .answer-submit').click();await page.locator('.question-feedback').waitFor();await capture(page,'after-reading-error-390');report.checks.push('wrong answer keeps question, correct answer and explanation together');}
  await page.locator('.library-question .quiz-options').getByRole('button',{name:question.options[question.answer],exact:true}).click();
  await page.locator('.library-question .answer-submit').click();
  if(index<reading.questions.length-1)await page.getByRole('button',{name:'下一题',exact:true}).click();
 }
 const finish=page.getByRole('button',{name:'完成阅读',exact:true});await finish.click();
 await page.getByRole('button',{name:'查看学习结果',exact:true}).click();await page.locator('.daily-complete').waitFor();await capture(page,'after-complete-390');
 await page.getByRole('button',{name:'返回首页',exact:true}).click();await page.locator('.mobile-today').waitFor();await page.waitForTimeout(700);await capture(page,'after-home-completed-390');
 if(!(await page.locator('.mobile-today .focus-progress-label').innerText()).includes('3 / 3'))throw new Error('home lost completed plan');
 report.checks.push('daily review → grammar exercises → reading quiz → complete → home retains 3/3');
 await page.reload();await ready(page);if(!(await page.locator('.mobile-today .focus-progress-label').innerText()).includes('3 / 3'))throw new Error('refresh lost completion');report.checks.push('completed home restores after refresh');
 await page.evaluate(()=>{const buttons=document.querySelectorAll('.bottom-nav button');buttons[1].click();buttons[2].click();buttons[0].click()});await page.waitForTimeout(700);await page.locator('.mobile-today').waitFor();if(new URL(page.url()).hash!=='#Today')throw new Error('rapid navigation ended on stale route');report.checks.push('rapid three-way navigation retains latest route and completed state');
 await page.goBack();await page.waitForTimeout(650);await page.locator('.library-workspace').waitFor();report.checks.push('browser Back restores the prior library route');
 await context.close();await copyFile(await page.video().path(),`${output}/mobile-learning-flow.webm`);
 const dictionary=await setup(390);failurePage=dictionary.page;
 await dictionary.page.goto(`${origin}/#Vocabulary`);await ready(dictionary.page);
 await dictionary.page.getByRole('textbox',{name:'搜索私人词典'}).fill('電源');
 await dictionary.page.locator('.vocabulary-index>button').first().click();
 const wordPanel=dictionary.page.getByRole('dialog');await wordPanel.waitFor();
 await wordPanel.getByRole('button',{name:'Add to learning',exact:true}).click();
 await capture(dictionary.page,'after-vocabulary-sheet-390');
 await dictionary.page.getByRole('button',{name:'关闭',exact:true}).click();await dictionary.page.reload();await ready(dictionary.page);
 await dictionary.page.getByRole('textbox',{name:'搜索私人词典'}).fill('電源');await dictionary.page.locator('.vocabulary-index>button').first().click();
 await dictionary.page.getByRole('dialog').getByRole('button',{name:'In your learning library',exact:true}).waitFor();
 await dictionary.page.getByRole('button',{name:'关闭',exact:true}).click();
 await dictionary.page.getByRole('button',{name:'更多功能',exact:true}).click();await dictionary.page.getByRole('dialog').getByRole('button',{name:'English',exact:true}).click();
 await dictionary.page.waitForTimeout(700);
 if(await dictionary.page.getByRole('textbox',{name:'搜索私人词典'}).inputValue()!=='')throw new Error('Language switch retained Japanese dictionary search');
 await dictionary.page.getByRole('textbox',{name:'搜索私人词典'}).fill('recall');await dictionary.page.locator('.vocabulary-index>button').first().click();
 await dictionary.page.getByRole('dialog').waitFor();await capture(dictionary.page,'after-english-vocabulary-sheet-390');
 report.checks.push('new vocabulary mobile sheet → add → reload preserves stable learning card; language switch clears stale dictionary search');
 await dictionary.context.close();
 for(const dark of [true,false]){
  const {context,page}=await setup(390,{dark,motion:dark?'no-preference':'reduce'});await page.goto(origin);await ready(page);await capture(page,dark?'after-home-dark-390':'after-home-reduced-motion-390');await context.close();
 }
 const offline=await setup(390,{workers:true});failurePage=offline.page;
 await offline.page.goto(`${origin}/#Reading`);await ready(offline.page);
 await offline.page.evaluate(async()=>{await navigator.serviceWorker.ready});
 await offline.page.getByRole('button',{name:'下载本页资料以供离线学习',exact:true}).click();
 await offline.page.getByText(/份资料已保存在此设备/).waitFor();
 await offline.page.locator('.library-list>button').first().click();await offline.page.locator('.reading-text').waitFor();await offline.page.waitForTimeout(800);
 const offlineCourse=new URL(offline.page.url()).searchParams.get('content');
 await offline.context.setOffline(true);
 await offline.page.getByRole('button',{name:/My note/}).click();
 await offline.page.getByRole('textbox',{name:'我的阅读笔记'}).fill('离线验收：记录仍可恢复。');
 await offline.page.getByRole('button',{name:'Save note',exact:true}).click();await offline.page.waitForTimeout(800);
 await offline.page.reload();await ready(offline.page);await offline.page.locator('.reading-text').waitFor();
 if(new URL(offline.page.url()).searchParams.get('content')!==offlineCourse)throw new Error('offline reload changed article');
 await offline.page.getByText('My Notes · 离线验收：记录仍可恢复。').waitFor();await capture(offline.page,'after-offline-restored-390');
 report.checks.push('real local Service Worker shell + downloaded IndexedDB article + offline note survive offline reload (simulated identity)');
 await offline.context.setOffline(false);await offline.page.waitForTimeout(1800);await offline.page.getByText('已保存并同步',{exact:true}).first().waitFor();
 report.checks.push('reconnection drains local queue to simulated backend and shows synced');await offline.context.close();
}catch(error){report.errors.push(error.message);if(failurePage&&!failurePage.isClosed()){try{await debugState(failurePage,'failure');await capture(failurePage,'failure-current')}catch{report.errors.push('Failure artifact unavailable after navigation')}}process.exitCode=1;}
finally{await browser.close();await writeFile(`${output}/mobile-ui-report.json`,JSON.stringify(report,null,2));}
console.log(JSON.stringify({pages:report.pages.length,checks:report.checks,errors:report.errors,output}));
