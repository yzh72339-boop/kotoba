'use client';
import {useEffect,useRef,useState} from 'react';
import {Bookmark,Mic,Sparkles,Square,Volume2} from 'lucide-react';
import {useStudy} from './study-context';
import {Button} from './ui/button';
import {aiProvider} from '@/lib/ai-provider';
import {supabase} from '@/lib/supabase';
import {createRecognition,type Recognition} from '@/lib/platform/audio';
import {subtleFeedback} from '@/lib/platform/haptics';

type SpeakingPhase='Ready'|'Listening'|'Processing'|'Feedback'|'Complete'|'Error';

export function Speaking(){
 const {state,setState,speak,record,online,applyAIMistakes,completeDailyStep,addSentence,syncNow}=useStudy();
 const ja=state.profile.language==='ja';
 const [mode,setMode]=useState('Role play'),[phase,setPhase]=useState<SpeakingPhase>('Ready'),[text,setText]=useState(''),[feedback,setFeedback]=useState(''),[submittedText,setSubmittedText]=useState(''),[error,setError]=useState(''),[draftReady,setDraftReady]=useState(false);
 const recognition=useRef<Recognition|null>(null),finishTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const draftKey=`kotoba-speaking-draft-${state.profile.language}`;
 useEffect(()=>{try{setText(sessionStorage.getItem(draftKey)??'')}catch{}setDraftReady(true)},[draftKey]);
 useEffect(()=>{if(!draftReady)return;try{sessionStorage.setItem(draftKey,text)}catch{}},[draftReady,draftKey,text]);
 useEffect(()=>()=>{try{recognition.current?.stop()}catch{}if(finishTimer.current)clearTimeout(finishTimer.current)},[]);
 const prompt=ja?'いらっしゃいませ。\nご注文はお決まりですか？':'Good morning!\nWhat can I get for you?';
 const target=ja?'ホットコーヒーを一つお願いします。':'Could I have a hot coffee, please?';
 const currentPrompt=mode==='Free talk'?(ja?'今日はどんな一日でしたか？':'How has your day been?'):mode==='Shadowing'||mode==='Pronunciation'?target:prompt;
 const listening=phase==='Listening',busy=phase==='Processing';

 function start(){
  if(listening||busy)return;
  const r=createRecognition(ja?'ja-JP':'en-US');
  if(!r){setError('此设备暂不支持语音识别。请在下方输入句子继续练习。');setPhase('Error');return}
  r.onresult=e=>setText(Array.from({length:e.results.length},(_,i)=>e.results[i][0].transcript).join(''));
  r.onerror=e=>{setError(e.error==='not-allowed'?'请允许麦克风访问，或输入句子继续。':'语音识别已中断，请输入句子继续。');setPhase('Error')};
  r.onend=()=>setPhase(current=>current==='Listening'?'Ready':current);
  recognition.current=r;
  try{r.start();setError('');setPhase('Listening')}catch{recognition.current=null;setError('无法启动麦克风。请输入句子继续。');setPhase('Error')}
 }
 function stop(){try{recognition.current?.stop()}catch{}recognition.current=null;setPhase(current=>current==='Listening'?'Ready':current)}
 function reference(){return `参考表达\n${target}\n\n${ja?'「〜をお願いします」是礼貌而自然的点单表达。':'“Could I have …, please?” is a polite way to order.'}\n\n当前为参考表达练习，未生成个人评分。`}
 function finish(result:string,spokenText:string){
  setFeedback(result);setSubmittedText(spokenText);setError('');setPhase('Feedback');
  record('Speaking');completeDailyStep('Speaking');
  setState(s=>({...s,speakingHistory:[...s.speakingHistory,{id:crypto.randomUUID(),language:s.profile.language,text:spokenText,feedback:result,at:Date.now()}],completed:[...new Set([...s.completed,s.profile.language+':Speaking'])]}));
  subtleFeedback();if(finishTimer.current)clearTimeout(finishTimer.current);finishTimer.current=setTimeout(()=>setPhase('Complete'),360);
 }
 async function analyze(){
  const spokenText=text.trim();if(!spokenText||busy)return;
  setPhase('Processing');setError('');setFeedback('');
  if(!online||!supabase){finish(reference(),spokenText);return}
  try{
   await syncNow();
   const answer=await aiProvider.request(`场景：咖啡馆；模式：${mode}；用户表达：${spokenText}。请分析语法与自然度，提供更自然的表达并继续对话。没有音频分析，请勿评价发音。`,{language:state.profile.language},'speaking');
   applyAIMistakes(answer.mistakes??[]);finish(answer.answer,spokenText);
  }catch(e){setError(`${(e as Error).message} 可重试，或使用参考表达继续学习。`);setPhase('Error')}
 }
 function changeMode(next:string){stop();if(finishTimer.current)clearTimeout(finishTimer.current);setMode(next);setText('');setFeedback('');setError('');setPhase('Ready')}
 return <div className="speaking-layout"><section className="speaking-main">
  <div className="page-intro compact"><span className="eyebrow">YOUR SPEAKING ROOM</span><h1>Find your voice.</h1><p>不用完美，先说出来。</p></div>
  <div className="tabs">{['Role play','Free talk','Shadowing','Pronunciation'].map(m=><button key={m} className={mode===m?'active':''} onClick={()=>changeMode(m)}>{m}</button>)}</div>
  <div className="speaking-room"><span className="eyebrow">{mode==='Free talk'?'TELL ME ABOUT YOUR DAY':'CAFÉ IN TOKYO'}</span><div className={`abstract-avatar ${listening?'listening':''}`} aria-hidden="true"><span/><span/><span/></div><p className="speaking-prompt">{currentPrompt}</p><button className="text-link" onClick={()=>speak(currentPrompt)}><Volume2 size={19}/>Listen</button>{listening&&<div className="recording-wave" aria-label="正在录音">{Array.from({length:12},(_,i)=><span key={i} style={{animationDelay:`${i*.06}s`}}/>)}</div>}<button className={`microphone ${listening?'recording':''}`} aria-label={listening?'停止语音识别':'开始语音识别'} aria-pressed={listening} disabled={busy} onClick={()=>listening?stop():start()}>{listening?<Square size={25}/>:<Mic size={27}/>}</button><span className="hold-to-speak" role="status" aria-live="polite">{phase}{listening?' · Tap to stop':''}</span><p className="speaking-privacy">设备语音识别 · 文字输入始终可用</p></div>
  <div className="spoken-input"><label className="eyebrow" htmlFor="sentence">YOUR SENTENCE</label><textarea id="sentence" className="input" value={text} onChange={e=>{if(listening)stop();if(finishTimer.current)clearTimeout(finishTimer.current);setText(e.target.value);setFeedback('');setError('');setPhase('Ready')}} placeholder={ja?'输入你的日语，或点击麦克风说话…':'Type your sentence or tap the microphone…'}/><Button disabled={!text.trim()||busy} onClick={()=>void analyze()}><Sparkles size={17}/>{busy?'Processing…':online&&supabase?'Get feedback':'Reference expression'}</Button></div>
  {error&&<div className="speaking-error" role="alert"><p>{error}</p><div><Button variant="outline" disabled={!text.trim()} onClick={()=>void analyze()}>Retry</Button><Button variant="ghost" disabled={!text.trim()} onClick={()=>finish(reference(),text.trim())}>Use reference expression</Button></div></div>}
  {feedback&&<div className="speaking-feedback" role="status"><span className="eyebrow">{phase==='Complete'?'COMPLETE · FEEDBACK':'FEEDBACK'}</span><div className="chat-content">{feedback}</div><Button className="mt" variant="outline" onClick={()=>addSentence(submittedText,'Speaking: Café in Tokyo')}><Bookmark size={17}/>Save my sentence</Button><p className="subtle mt">Pronunciation · 未接入音频评测，不生成评分。</p></div>}
 </section><aside className="speaking-context"><span className="eyebrow">SESSION INFORMATION</span><section><span className="eyebrow">TOPIC</span><h2>Ordering coffee.</h2><p>Café in Tokyo</p></section><section><span className="eyebrow">USEFUL EXPRESSIONS</span><p>{target}</p><button className="text-link" onClick={()=>speak(target)}><Volume2 size={17}/>Listen</button></section><section><span className="eyebrow">CONVERSATION GOAL</span><p>礼貌地点一杯咖啡，确认大小，并自然地表达感谢。</p></section></aside></div>
}
