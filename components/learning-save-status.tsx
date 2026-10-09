'use client';
import {useState} from 'react';
import {useStudy} from './study-context';
import {learningSaveMessage} from '@/lib/learning-save-state';
import {Button} from './ui/button';
export function LearningSaveStatus(){
 const {localSaveStatus,online,syncStatus,pendingCount,flush,syncNow,notify,navigate}=useStudy();const [retrying,setRetrying]=useState(false);
 const localError=localSaveStatus==='failed'||localSaveStatus==='fallback';
 async function retry(){if(retrying)return;setRetrying(true);try{if(online)await syncNow();else await flush();notify(online?'保存并同步完成。':'已保存到本地，联网后同步。')}catch{notify('重试尚未完成，学习状态仍保留。请检查网络或在设置中导出进度。')}finally{setRetrying(false)}}
 return <div className="course-save-status"><p role={localSaveStatus==='failed'?'alert':'status'} aria-live="polite">{learningSaveMessage(localSaveStatus,online,syncStatus,pendingCount)}</p>{(localError||online&&syncStatus==='failed')&&<div className="settings-actions"><Button variant="outline" disabled={retrying} onClick={()=>void retry()}>{retrying?'正在重试…':localError?'重试保存':'重试同步'}</Button>{localError&&<Button variant="ghost" onClick={()=>navigate('Settings')}>导出进度</Button>}</div>}</div>
}
