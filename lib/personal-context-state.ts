import {readinessResult,type LibraryReadiness} from './content-library/readiness-state';
export function personalContextResult(input:Parameters<typeof readinessResult>[0]):LibraryReadiness{
 if(input.online&&input.error?.code==='42883'&&input.error.message?.includes('personal_context_ready'))return {status:'migration-required',writable:false};
 const result=readinessResult(input);return result.status==='migration-required'?{status:'interface-unavailable',writable:false}:result;
}
