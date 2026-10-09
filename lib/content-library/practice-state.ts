import type {AppState} from '../store';
import type {GrammarPoint,ReadingDocument} from './schema';
export type GrammarDraft={answers:Record<string,string>;checked:Record<string,boolean>;accepted:Record<string,boolean>;logged:string[];section:'lesson'|'examples'|'mistakes'|'comparison'|'practice';questionId?:string};
export function practiceCursor(items:{id:string}[],requested:string|undefined,completed:Record<string,boolean>){
 const saved=items.findIndex(item=>item.id===requested),pending=items.findIndex(item=>!completed[item.id]);
 const index=saved>=0?saved:pending>=0?pending:0;
 return {index,id:items[index]?.id??'',total:items.length,completed:items.filter(item=>completed[item.id]).length};
}
export function grammarDraft(s:AppState,g:GrammarPoint):GrammarDraft{
 const result:GrammarDraft={answers:{},checked:{},accepted:{},logged:[],section:'lesson'};
 try{
  const value=JSON.parse(s.notes[`library-grammar-draft-${g.id}`]??'{}');
  for(const e of g.exercises){if(typeof value.answers?.[e.id]==='string')result.answers[e.id]=value.answers[e.id].slice(0,4000);if(value.checked?.[e.id]===true)result.checked[e.id]=true;if(value.accepted?.[e.id]===true&&result.checked[e.id])result.accepted[e.id]=true}
  if(Array.isArray(value.logged))result.logged=value.logged.filter((v:unknown):v is string=>typeof v==='string'&&v.length<=5000).slice(-100);
  if(['lesson','examples','mistakes','comparison','practice'].includes(value.section))result.section=value.section;
  if(g.exercises.some(e=>e.id===value.questionId))result.questionId=value.questionId;
 }catch{}return result;
}
export function saveGrammarDraft(s:AppState,g:GrammarPoint,value:GrammarDraft):AppState{return {...s,notes:{...s.notes,[`library-grammar-draft-${g.id}`]:JSON.stringify(value)}}}
export type ReadingDraft={answers:Record<string,number>;checked:Record<string,boolean>;phase:'practice'|'complete';difficulty:'easy'|'right'|'hard';startedAt:number;activeSeconds:number;attemptId:string;lookedUpWords:string[];grammarViewed:string[];savedWords:string[];questionId?:string};
export function readingDraft(s:AppState,a:ReadingDocument):ReadingDraft{
 const result:ReadingDraft={answers:{},checked:{},phase:'practice',difficulty:'right',startedAt:0,activeSeconds:0,attemptId:'',lookedUpWords:[],grammarViewed:[],savedWords:[]};
 try{
  const value=JSON.parse(s.notes[`library-reading-draft-${a.id}`]??s.notes[`library-draft-${a.id}`]??'{}');
  const answers=value.answers??value;
  for(const q of a.questions)if(Number.isInteger(answers[q.id])&&answers[q.id]>=0&&answers[q.id]<q.options.length)result.answers[q.id]=answers[q.id];
  for(const q of a.questions)if(value.checked?.[q.id]===true&&Number.isInteger(result.answers[q.id]))result.checked[q.id]=true;
  for(const field of ['lookedUpWords','grammarViewed','savedWords'] as const)if(Array.isArray(value[field]))result[field]=[...new Set<string>(value[field].filter((id:unknown):id is string=>typeof id==='string'&&(field==='grammarViewed'?a.grammar.some(g=>g.id===id):a.vocabulary.includes(id))))];
  if(value.phase==='complete')result.phase='complete';
  if(['easy','right','hard'].includes(value.difficulty))result.difficulty=value.difficulty;
  if(Number.isFinite(value.startedAt)&&value.startedAt>0)result.startedAt=value.startedAt;
  if(Number.isFinite(value.activeSeconds)&&value.activeSeconds>=0)result.activeSeconds=Math.min(value.activeSeconds,86400);
  if(typeof value.attemptId==='string'&&/^[a-z0-9-]{1,80}$/i.test(value.attemptId))result.attemptId=value.attemptId;
  if(a.questions.some(q=>q.id===value.questionId))result.questionId=value.questionId;
 }catch{}return result;
}
export function saveReadingDraft(s:AppState,a:ReadingDocument,value:ReadingDraft):AppState{return {...s,notes:{...s.notes,[`library-reading-draft-${a.id}`]:JSON.stringify(value)}}}
