export type LibraryReadinessStatus='checking'|'ready'|'offline-ready'|'offline-unverified'|'network-error'|'auth-error'|'denied'|'migration-required'|'configuration-error'|'interface-unavailable';
export type LibraryReadiness={status:LibraryReadinessStatus;writable:boolean};
export function readinessResult(input:{online:boolean;configured:boolean;cached:boolean;data?:unknown;error?:{code?:string;message?:string}|null}):LibraryReadiness{
 if(!input.online)return {status:input.cached?'offline-ready':'offline-unverified',writable:input.cached};
 if(!input.configured)return {status:'configuration-error',writable:false};
 if(input.error){
  const code=input.error.code;
  return {status:code==='42883'&&input.error.message?.includes('content_library_ready')?'migration-required':code==='PGRST202'||code==='42883'?'interface-unavailable':code==='PGRST301'||code==='PGRST302'||code==='401'?'auth-error':code==='42501'?'denied':'network-error',writable:false};
 }
 return input.data===true?{status:'ready',writable:true}:{status:'denied',writable:false};
}
export const readinessMessage:Record<LibraryReadinessStatus,string>={
 checking:'正在检查课程保存权限…',ready:'', 'offline-ready':'离线学习可用，记录先保存在本设备。',
 'offline-unverified':'本设备尚未验证课程保存接口。请联网检查一次；已下载资料仍可阅读。',
 'network-error':'保存接口暂时无法连接。请联网重试；这不表示缺少数据库迁移。',
 'auth-error':'登录会话需要恢复。请重新登录私人账号后检查。',
 denied:'当前会话未获准保存课程，请确认使用指定私人账号。',
 'migration-required':'服务器确认课程保存函数不存在。先核对已有 010 部署证据，仅在确认缺失时处理；不要重复执行旧迁移。',
 'interface-unavailable':'API schema cache 暂未识别保存接口。已部署 010 时请检查接口缓存后重试；此错误不能证明迁移缺失。',
 'configuration-error':'Supabase 连接配置不可用，请检查部署环境变量。',
};

export const readinessCacheKey=(project:string,userId:string)=>`content-library-ready:${project}:${userId}`;
