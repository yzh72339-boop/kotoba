import type {AppState} from '../store';
import type {Word,Language} from '../content';
import {captureWord,captureSentence,createMistake,stableId} from '../learning-memory';
import {learnGrammar} from './learning';
import {readingDraft,saveReadingDraft} from './practice-state';
import type {GrammarPoint,ReadingDocument} from './schema';
export type ReadingSource={articleId:string;title:string;sentence:string;language:Language;legacy?:boolean;prompt?:string};
const sourcePrefix=(cardId:string)=>`reading-source-${cardId}--`;
export function readingSources(state:AppState,cardId:string):ReadingSource[]{
 const sources:ReadingSource[]=[];
 for(const [key,text] of Object.entries(state.notes)){if(!key.startsWith(sourcePrefix(cardId)))continue;
  try{const value=JSON.parse(text);if(value.cardId!==cardId||!/^article-(ja|en)(?:-[a-z0-9-]+)?$/.test(value.articleId)||!['ja','en'].includes(value.language)||!value.articleId.startsWith(`article-${value.language}`)||typeof value.title!=='string'||!value.title.trim()||value.title.length>500||typeof value.sentence!=='string'||value.sentence.length>12000)continue;
   sources.push({articleId:value.articleId,title:value.title,sentence:value.sentence,language:value.language,...(value.legacy===true?{legacy:true}:{}),...(typeof value.prompt==='string'?{prompt:value.prompt.slice(0,4000)}:{})});
  }catch{}
 }return sources;
}
export function attachReadingSource(state:AppState,cardId:string,source:ReadingSource):AppState{
 if(!/^article-(ja|en)(?:-[a-z0-9-]+)?$/.test(source.articleId)||!source.articleId.startsWith(`article-${source.language}`))return state;
 const key=sourcePrefix(cardId)+source.articleId;
 // First encounter and the learner's schedule/notes stay intact; different articles get separate sync keys.
 if(state.notes[key])return state;
 return {...state,notes:{...state.notes,[key]:JSON.stringify({...source,cardId})}};
}
export function collectReadingWord(state:AppState,word:Word,source:ReadingSource):AppState{
 const captured={...captureWord(word.word,source.language,`Reading: ${source.title}`,word.meaning),...word};
 return attachReadingSource({...state,dictionary:{...state.dictionary,[word.id]:state.dictionary[word.id]??captured},saved:[...new Set([...state.saved,word.id])]},word.id,source);
}
export function collectReadingSentence(state:AppState,source:ReadingSource,translation:string,vocabulary:string[]=[],grammar:string[]=[]):AppState{
 const captured=captureSentence(source.sentence,source.language,`Reading: ${source.title}`,translation);
 const existing=state.sentences.find(s=>s.id===captured.id);
 const sentence=existing?{...existing,vocabulary:[...new Set([...existing.vocabulary,...vocabulary])],grammar:[...new Set([...existing.grammar,...grammar])]}:{...captured,vocabulary:[...new Set(vocabulary)],grammar:[...new Set(grammar)]};
 return attachReadingSource({...state,sentences:existing?state.sentences.map(s=>s.id===captured.id?sentence:s):[...state.sentences,sentence]},captured.id,source);
}
export function collectReadingGrammar(state:AppState,grammar:GrammarPoint,source:ReadingSource):AppState{return attachReadingSource(learnGrammar(state,grammar),grammar.id,source)}
export function collectReadingMistake(state:AppState,mistake:ReturnType<typeof createMistake>,source:ReadingSource):AppState{
 return attachReadingSource({...state,mistakes:state.mistakes.some(m=>m.id===mistake.id)?state.mistakes:[...state.mistakes,mistake]},`sentence-mistake-${mistake.id}`,source);
}
// Confirm and collect in one state update so correcting an answer cannot erase the encounter.
export function confirmReadingQuestion(state:AppState,article:ReadingDocument,questionId:string):AppState{
 const draft=readingDraft(state,article),question=article.questions.find(q=>q.id===questionId),answer=draft.answers[questionId];
 if(!question||draft.phase==='complete'||draft.checked[questionId]||!Number.isInteger(answer))return state;
 let next=saveReadingDraft(state,article,{...draft,questionId,checked:{...draft.checked,[questionId]:true}});
 if(answer!==question.answer&&draft.attemptId){
  const mistake={...createMistake(article.language,'reading',question.prompt,question.options[answer],question.options[question.answer],`Reading: ${article.title}`),id:stableId('reading-mistake',article.id+':'+draft.attemptId+':'+question.id)};
  next=collectReadingMistake(next,mistake,{articleId:article.id,title:article.title,sentence:article.paragraphs[0],language:article.language,prompt:question.prompt});
 }
 return next;
}
export function collectedCardIds(state:AppState,articleId:string):string[]{
 const ids=new Set<string>();for(const [key,text] of Object.entries(state.notes)){if(!key.startsWith('reading-source-'))continue;try{const v=JSON.parse(text);if(v.articleId===articleId&&typeof v.cardId==='string'&&readingSources(state,v.cardId).some(s=>s.articleId===articleId))ids.add(v.cardId)}catch{}}
 return [...ids];
}
