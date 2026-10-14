// Browser-safe winkNLP model. Imported only by the explicit-analysis worker/tests.
import winkNLP,{type ItemToken,type ItsFunction} from 'wink-nlp';
import model from 'wink-eng-lite-web-model';
export type EnglishToken={start:number;end:number;surface:string;lemma:string;pos:string};
const nlp=winkNLP(model);
// Upstream 2.4.0 has mismatched out/lemma callback declarations. The runtime
// whitelists mapper identity, so a wrapper silently returns surface forms.
// Preserve that verified function identity at this one typed adapter boundary.
const lemmaMapper=nlp.its.lemma as unknown as ItsFunction<string>;
export function analyzeEnglish(text:string):EnglishToken[]{
 if(text.length>50000)throw new Error('请将英文分成不超过 50,000 字符的段落。');
 let cursor=0;const result:EnglishToken[]=[];
 nlp.readDoc(text).tokens().each((token:ItemToken)=>{
  const surface=String(token.out(nlp.its.value)),start=text.indexOf(surface,cursor);
  // Never guess offsets if the model normalizes a contraction or unknown symbol.
  if(start<0)return;
  cursor=start+surface.length;
  result.push({start,end:cursor,surface,lemma:String(token.out(lemmaMapper)),pos:String(token.out(nlp.its.pos))});
 });return result;
}
