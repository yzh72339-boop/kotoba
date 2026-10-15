import {createJapaneseAnalyzer} from './japanese-core';
import {validateJapaneseParagraphs} from './japanese-types';
let model:ReturnType<typeof createJapaneseAnalyzer>|null=null;
self.onmessage=async(event:MessageEvent<{id?:unknown;paragraphs?:unknown}>)=>{
 const {id,paragraphs}=event.data??{};
 if(!Number.isInteger(id)||!Array.isArray(paragraphs))return;
 try{
  validateJapaneseParagraphs(paragraphs);
  model??=createJapaneseAnalyzer('/language/kuromoji-0.1.2/dict/').catch(error=>{model=null;throw error});
  const analyze=await model;
  self.postMessage({id,analyzer:'kuroshiro-kuromoji-1.1.0',tokens:await analyze(paragraphs)});
 }catch{self.postMessage({id,error:'日语词典暂不可用。首次需联网下载；也可继续使用轻量词库注音。'})}
};
