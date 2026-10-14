import {analyzeEnglish} from './english-core';
const scope=self as unknown as {onmessage:((event:MessageEvent<{id?:unknown;text?:unknown}>)=>void)|null;postMessage:(message:unknown)=>void};
scope.onmessage=(event:MessageEvent<{id?:unknown;text?:unknown}>)=>{
 const {id,text}=event.data??{};
 if(!Number.isInteger(id)||typeof text!=='string')return;
 try{scope.postMessage({id,analyzer:'wink-nlp-2.4.0',tokens:analyzeEnglish(text)})}catch{scope.postMessage({id,error:'英文分析暂不可用，请缩短正文后重试。'})}
};
