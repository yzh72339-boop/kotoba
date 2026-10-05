'use client';
import {useEffect,useRef,useState,useCallback} from 'react';
import {Play,Pause,Upload,RotateCcw,RotateCw,Check,CloudDownload} from 'lucide-react';
import {useStudy} from './study-context';
import {read,write} from '@/lib/platform/storage';
import {supabase} from '@/lib/supabase';
import {Button} from './ui/button';
import {audioMediaId,audioResumeOffset,commitAudioUpload,newestAudio} from '@/lib/audio-state';
type CachedAudio={blob:Blob;title:string;type:string;at:number;uploadId?:string;pending?:boolean;storagePath?:string};
export function PersonalAudio(){
 const {state,setState,userId,notify,online}=useStudy();const language=state.profile.language,id=`audio-${language}`,cloud=state.audioFiles[id],cloudPath=cloud?.storagePath;
 const input=useRef<HTMLInputElement>(null),audio=useRef<HTMLAudioElement>(null),objectURL=useRef(''),uploading=useRef(false);
 const [url,setURL]=useState(''),[name,setName]=useState(''),[playing,setPlaying]=useState(false),[position,setPosition]=useState(0),[duration,setDuration]=useState(0),[rate,setRate]=useState(state.settings.audioRate),[busy,setBusy]=useState(false),[media,setMedia]=useState<{id:string;selectedAt:number}|null>(null);
 const stateRef=useRef(state),alive=useRef(true);stateRef.current=state;
 useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[]);
 const lastSaved=useRef(0);
 function show(entry:CachedAudio){if(!alive.current)return;if(objectURL.current)URL.revokeObjectURL(objectURL.current);objectURL.current=URL.createObjectURL(entry.blob);setURL(objectURL.current);setName(entry.title);setMedia({id:entry.uploadId??audioMediaId(entry.storagePath??''),selectedAt:entry.at});setPlaying(false);setPosition(0);setDuration(0)}
 useEffect(()=>{let alive=true;setURL('');setName('');void read<CachedAudio>('content',id).then(entry=>{if(entry&&alive&&(!cloudPath||entry.storagePath===cloudPath||entry.pending))show(entry)}).catch(()=>notify('无法读取此设备的音频。'));return()=>{alive=false;if(objectURL.current){URL.revokeObjectURL(objectURL.current);objectURL.current=''}}},[id,cloudPath,notify]);
 const upload=useCallback(async function upload(entry:CachedAudio){
  if(!online||!supabase||!userId||uploading.current)return;uploading.current=true;
  try{const path=`${userId}/${id}/${entry.uploadId??crypto.randomUUID()}`;const {error}=await supabase.storage.from('personal-audio').upload(path,entry.blob,{contentType:entry.blob.type||'audio/mpeg',upsert:true});if(error)throw error;
   const latest=await read<CachedAudio>('content',id);if(latest?.uploadId!==entry.uploadId)return;
   const file={language,title:entry.title,storagePath:path,mimeType:entry.blob.type||'audio/mpeg',size:entry.blob.size,updatedAt:entry.at};
   await write('content',id,{...entry,pending:false,storagePath:path});
   const current=stateRef.current.audioFiles[id],superseded=current&&newestAudio(current,file)===current&&current.storagePath!==path;
   setState(s=>commitAudioUpload(s,id,file));
   if(alive.current)notify(superseded?'另一台设备已有更新的音频；本设备录音已保留，没有覆盖它。':'音频已保存到私人云端，其他设备可以下载。');
  }catch{if(alive.current)notify('音频保留在本设备，联网后可再次上传。')}finally{uploading.current=false;if(alive.current)void read<CachedAudio>('content',id).then(next=>{if(next?.pending&&next.uploadId!==entry.uploadId)void upload(next)}).catch(()=>{})}
 },[online,userId,id,language,setState,notify]);
 useEffect(()=>{if(online&&userId)void read<CachedAudio>('content',id).then(entry=>{if(entry?.pending)void upload(entry)}).catch(()=>{})},[online,userId,id,upload]);
 async function add(file:File){
  if(file.size>50*1048576){notify('音频文件最大 50 MB。');return}if(!file.type.startsWith('audio/')){notify('请选择音频文件。');return}setBusy(true);
  try{const entry:CachedAudio={blob:file,title:file.name,type:'Audio',at:Date.now(),uploadId:crypto.randomUUID(),pending:true};await write('content',id,entry);show(entry);setState(s=>({...s,listeningPositions:{...s.listeningPositions,[id]:{offset:0,progress:0,updatedAt:Date.now()}}}));notify('音频已保存到此设备，可离线播放。');await upload(entry)}catch{notify('音频保存失败，请检查可用存储空间。')}finally{setBusy(false);if(input.current)input.current.value=''}
 }
 async function download(){if(!supabase||!cloud||!online)return;setBusy(true);try{const {data,error}=await supabase.storage.from('personal-audio').download(cloud.storagePath);if(error||!data)throw error;if(stateRef.current.audioFiles[id]?.storagePath!==cloud.storagePath)return;const entry:CachedAudio={blob:data,title:cloud.title,type:'Audio',at:cloud.updatedAt,storagePath:cloud.storagePath};await write('content',id,entry);show(entry);if(alive.current)notify('音频已下载，可离线播放。')}catch{if(alive.current)notify('音频暂时无法下载，请稍后重试。')}finally{if(alive.current)setBusy(false)}}
 function persist(){const el=audio.current;if(!el||!media||el.currentSrc!==url||!Number.isFinite(el.duration)||el.duration<=0)return;const offset=el.currentTime,progress=Math.min(100,Math.round(offset/el.duration*100))||0;setState(s=>({...s,listeningPositions:{...s.listeningPositions,[id]:{offset,progress,mediaId:media.id,updatedAt:Date.now()}}}))}
 const fmt=(s:number)=>`${Math.floor(s/60).toString().padStart(2,'0')}:${Math.floor(s%60).toString().padStart(2,'0')}`;
 async function toggle(){if(!audio.current)return;if(playing){audio.current.pause();setPlaying(false);persist()}else{try{await audio.current.play();setPlaying(true)}catch{notify('音频暂时无法播放，请检查文件格式。')}}}
 function seek(seconds:number){if(audio.current){audio.current.currentTime=Math.min(duration,Math.max(0,seconds));setPosition(audio.current.currentTime);persist()}}
 return <section className="personal-audio"><input ref={input} type="file" accept="audio/*" hidden onChange={e=>{const file=e.target.files?.[0];if(file)void add(file)}}/>{url?<>
 <div className="section-heading"><h2>{name}</h2><span className="tag"><Check size={12}/>Available offline</span></div>
 <audio ref={audio} src={url} preload="metadata" onLoadedMetadata={()=>{const el=audio.current;if(el&&media&&Number.isFinite(el.duration)){setDuration(el.duration);el.currentTime=Math.min(el.duration,audioResumeOffset(stateRef.current.listeningPositions[id],media.id,media.selectedAt));setPosition(el.currentTime);el.playbackRate=rate}}} onTimeUpdate={()=>{const el=audio.current;if(!el)return;setPosition(el.currentTime);if(Date.now()-lastSaved.current>1000){lastSaved.current=Date.now();persist()}}} onPause={()=>{setPlaying(false);persist()}} onEnded={()=>{setPlaying(false);persist()}}/>
 <input className="audio-seek" type="range" aria-label="音频播放进度" min="0" max={duration||1} step=".1" value={position} onChange={e=>seek(+e.target.value)}/><div className="audio-position"><span>{fmt(position)}</span><span>{fmt(duration)}</span></div>
 <div className="play-controls"><button className="audio-skip" aria-label="后退十秒" onClick={()=>seek(position-10)}><RotateCcw size={19}/><span>10</span></button><button className="play-button" aria-label={playing?'暂停音频':'播放音频'} onClick={()=>void toggle()}>{playing?<Pause size={23}/>:<Play size={23}/>}</button><button className="audio-skip" aria-label="前进十秒" onClick={()=>seek(position+10)}><RotateCw size={19}/><span>10</span></button></div>
 <div className="playback-rates">{[.75,1,1.25,1.5].map(r=><button className={rate===r?'active':''} key={r} onClick={()=>{setRate(r);if(audio.current)audio.current.playbackRate=r}}>{r}×</button>)}</div><p className="subtle">个人录音独立播放；下方逐句朗读使用配套文字，未自动推断录音时间戳。</p><div className="settings-actions"><Button variant="ghost" disabled={busy} onClick={()=>input.current?.click()}><Upload size={17}/>Replace audio</Button>{cloud&&media?.id!==audioMediaId(cloud.storagePath)&&<Button variant="outline" disabled={!online||busy} onClick={()=>void download()}><CloudDownload size={17}/>Download current audio</Button>}</div>
 </>:<div className="audio-upload-prompt"><p>{cloud?cloud.title:'添加自己的录音，或私人听力素材。'}</p><div className="settings-actions">{cloud&&<Button disabled={!online||busy} onClick={()=>void download()}><CloudDownload size={17}/>Download for offline</Button>}<Button variant="outline" disabled={busy} onClick={()=>input.current?.click()}><Upload size={17}/>Add personal audio</Button></div>{cloud&&!online&&<p className="subtle">此设备尚未下载这段音频，联网后可下载。</p>}</div>}</section>
}
