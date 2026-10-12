import type {LocalSaveStatus} from '../learning-save-state';

export function hasUnsavedLearning(status:LocalSaveStatus){
 return status==='saving'||status==='failed';
}

// A browser may suppress this warning (notably on mobile process termination).
// It protects explicit reload/close while a local transaction is still pending;
// queued cloud synchronization does not prevent leaving a locally saved page.
export function watchPendingSave(target:Pick<Window,'addEventListener'|'removeEventListener'>,unsaved:boolean){
 if(!unsaved)return ()=>{};
 const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};
 target.addEventListener('beforeunload',warn);
 return ()=>target.removeEventListener('beforeunload',warn);
}
