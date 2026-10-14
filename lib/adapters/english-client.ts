import type {EnglishToken} from './english-core';
export class EnglishAnalysisClient{
 private worker:Worker|null=null;private request=0;private reject:(()=>void)|null=null;
 analyze(text:string):Promise<EnglishToken[]>{
  this.reject?.();const id=++this.request;
  return new Promise((resolve,reject)=>{
   const worker=this.worker??new Worker(new URL('./english.worker.ts',import.meta.url));this.worker=worker;
   const finish=()=>{clearTimeout(timer);this.reject=null;worker.onmessage=null;worker.onerror=null};
   const fail=()=>{finish();worker.terminate();if(this.worker===worker)this.worker=null;reject(new Error('英文分析暂不可用，请联网加载模型后重试。'))};
   const timer=setTimeout(fail,30000);this.reject=fail;
   worker.onerror=fail;
   worker.onmessage=(event:MessageEvent<{id:number;tokens?:EnglishToken[];error?:string}>)=>{if(event.data.id!==id)return;if(event.data.error||!Array.isArray(event.data.tokens)){fail();return}finish();resolve(event.data.tokens)};
   worker.postMessage({id,text});
  });
 }
 dispose(){this.reject?.();this.worker?.terminate();this.worker=null;this.reject=null}
}
