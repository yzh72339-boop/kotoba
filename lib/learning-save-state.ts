import type {SyncStatus} from './sync-engine';

export type LocalSaveStatus='saving'|'saved'|'fallback'|'failed';
export function learningSaveMessage(local:LocalSaveStatus,online:boolean,sync:SyncStatus,pending:number){
 if(local==='saving')return '正在保存到本地…';
 if(local==='failed')return '本地保存失败，请重试或导出进度。';
 if(local==='fallback')return '已备用保存，恢复本地数据库后才能同步。';
 if(!online)return '本地已保存 · 离线，联网后同步';
 if(sync==='failed')return '本地已保存 · 同步失败';
 if(sync==='syncing')return '本地已保存 · 同步中';
 return sync==='synced'&&pending===0?'已保存并同步':'本地已保存 · 等待同步';
}
