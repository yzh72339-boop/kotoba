import type {AppState,Mistake} from './store';
import type {ReadingDocument} from './content-library/schema';
import {readingSources} from './content-library/reading-collection';

export function readingMistakeSource(state:AppState,mistake:Mistake){
 if(mistake.area!=='reading')return null;
 const sources=readingSources(state,`sentence-mistake-${mistake.id}`).filter(s=>s.language===mistake.language&&!s.legacy&&!s.snapshotId&&s.prompt===mistake.pattern);
 return sources.length===1?sources[0]:null;
}
export function readingRevisit(state:AppState,article:ReadingDocument,mistake:Mistake){
 const source=readingMistakeSource(state,mistake);
 if(!source||source.articleId!==article.id||article.language!==mistake.language)return null;
 // Require an unambiguous original question AND its retained answer, never title-only guesses.
 const matches=article.questions.filter(q=>q.prompt===mistake.pattern&&q.options[q.answer]===mistake.correction&&q.options.includes(mistake.original));
 return matches.length===1?{source,article,question:matches[0]}:null;
}
export type RevisitDraft={questionId:string;signature:string;answer:number|null;checked:boolean;recorded:boolean};
const key=(mistakeId:string)=>`reading-revisit-${mistakeId}`;
export function revisitDraft(state:AppState,mistakeId:string,question:ReadingDocument['questions'][number]):RevisitDraft{
 const signature=JSON.stringify([question.options,question.answer]);const empty:RevisitDraft={questionId:question.id,signature,answer:null,checked:false,recorded:false};
 try{const d=JSON.parse(state.notes[key(mistakeId)]??'null');return d?.questionId===question.id&&d.signature===signature&&(d.answer===null&&d.checked===false||Number.isInteger(d.answer)&&d.answer>=0&&d.answer<question.options.length)&&typeof d.checked==='boolean'&&typeof d.recorded==='boolean'?{questionId:question.id,signature,answer:d.answer,checked:d.checked,recorded:d.recorded}:empty}catch{return empty}
}
export function saveRevisitDraft(state:AppState,mistakeId:string,draft:RevisitDraft):AppState{
 const value=JSON.stringify(draft);return state.notes[key(mistakeId)]===value?state:{...state,notes:{...state.notes,[key(mistakeId)]:value}};
}
