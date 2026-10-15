import {validateJapaneseParagraphs,type JapaneseToken} from './japanese-types';
export class JapaneseAnalysisClient{
 private worker:Worker|null=null;private request=0;private cancel:(()=>void)|null=null;
 analyze(paragraphs:string[]):Promise<JapaneseToken[][]>{
  validateJapaneseParagraphs(paragraphs);this.cancel?.();const id=++this.request;
  return new Promise((resolve,reject)=>{
   const worker=this.worker??new Worker(new URL('./japanese.worker.ts',import.meta.url));this.worker=worker;
   const finish=()=>{clearTimeout(timer);this.cancel=null;worker.onmessage=null;worker.onerror=null};
   const fail=()=>{finish();worker.terminate();if(this.worker===worker)this.worker=null;reject(new Error('日语词典加载失败，请联网重试或使用轻量注音。'))};
   const timer=setTimeout(fail,90000);this.cancel=fail;worker.onerror=fail;
   worker.onmessage=(event:MessageEvent<{id:number;tokens?:JapaneseToken[][];error?:string}>)=>{if(event.data.id!==id)return;if(event.data.error||!Array.isArray(event.data.tokens)){fail();return}finish();resolve(event.data.tokens)};
   try{worker.postMessage({id,paragraphs})}catch{fail()}
  });
 }
 dispose(){this.cancel?.();this.worker?.terminate();this.worker=null;this.cancel=null}
}
