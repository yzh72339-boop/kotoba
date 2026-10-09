import type {AppState} from '../store.ts';
import type {Word} from '../content.ts';
import type {GrammarPoint,ReadingDocument} from './schema.ts';
const grammarCardPrefix='library-card-';
const resultPrefix='library-result-';
export function grammarReviewCard(grammar:GrammarPoint):Word{return {id:grammar.id,word:grammar.pattern,pronunciation:'Grammar · Recall the usage',meaning:grammar.meaningZh,example:grammar.examples[0].target,translation:grammar.examples[0].zh,tag:`${grammar.level} · Grammar`,related:grammar.formation.join(' / '),note:grammar.explanation};}
export function learnedGrammarCards(state:AppState,language=state.profile.language):Word[]{
 const result:Word[]=[];for(const [key,value] of Object.entries(state.notes)){
  if(!key.startsWith(grammarCardPrefix))continue;
  try{const card=JSON.parse(value) as Word&{language?:string};if(card.id.startsWith('grammar-')&&card.language===language&&state.completed.includes(card.id)&&typeof card.word==='string'&&typeof card.meaning==='string'&&typeof card.example==='string'&&key===grammarCardPrefix+card.id)result.push(card)}catch{/* A malformed cached card does not block learning. */}
 }return result;
}
export function learnGrammar(state:AppState,grammar:GrammarPoint,now=Date.now()):AppState{
 return {...state,completed:[...new Set([...state.completed,grammar.id,`${grammar.language}:Grammar`])],notes:{...state.notes,[grammarCardPrefix+grammar.id]:JSON.stringify({...grammarReviewCard(grammar),language:grammar.language})},reviews:{...state.reviews,[grammar.id]:state.reviews[grammar.id]??{id:grammar.id,due:now,interval:0,ease:2.5,repetitions:0,lapses:0}}};
}
export type ReadingResult={articleId:string;language:'ja'|'en';startedAt:number;completedAt:number;readingTime:number;answers:Record<string,number>;score:number;lookedUpWords:string[];savedWords:string[];grammarViewed:string[];difficulty:'easy'|'right'|'hard';attemptId?:string};
export function readingResult(state:AppState,id:string):ReadingResult|null{try{const value=JSON.parse(state.notes[resultPrefix+id]??'null') as ReadingResult|null;return value?.articleId===id&&['ja','en'].includes(value.language)&&['easy','right','hard'].includes(value.difficulty)&&Number.isFinite(value.score)&&value.score>=0&&value.score<=100&&Number.isFinite(value.readingTime)&&value.readingTime>=0&&Number.isFinite(value.completedAt)&&value.answers&&typeof value.answers==='object'&&[value.lookedUpWords,value.savedWords,value.grammarViewed].every(a=>Array.isArray(a)&&a.every(v=>typeof v==='string'))?value:null}catch{return null}}
export function saveReadingResult(state:AppState,result:ReadingResult):AppState{const operation=result.attemptId?`library-reading-operation-${result.articleId}-${result.attemptId}`:null;if(operation&&state.notes[operation])return state;return {...state,notes:{...state.notes,...(operation?{[operation]:String(result.completedAt)}:{}),[resultPrefix+result.articleId]:JSON.stringify(result),[`library-attempt-${result.articleId}-${result.completedAt}`]:JSON.stringify(result)},completed:[...new Set([...state.completed,result.articleId,`${result.language}:Reading`])],readingPositions:{...state.readingPositions,[result.articleId]:{...state.readingPositions[result.articleId],progress:100,updatedAt:result.completedAt}}};}
export function checkExercise(answer:string,accepted:string[]){const normalize=(s:string)=>s.trim().normalize('NFKC').toLowerCase().replace(/[\s。.!?！？、,;；]/g,'');return accepted.some(candidate=>normalize(candidate)===normalize(answer));}
export function recommendedDifficulty(state:AppState,language:'ja'|'en'){
 const results=Object.keys(state.notes).filter(k=>k.startsWith(resultPrefix)).map(k=>readingResult(state,k.slice(resultPrefix.length))).filter((r):r is ReadingResult=>Boolean(r&&r.language===language)).sort((a,b)=>b.completedAt-a.completedAt).slice(0,5);
 if(results.length<3)return 0;
 const score=results.reduce((a,r)=>a+r.score,0)/results.length,lookups=results.reduce((a,r)=>a+r.lookedUpWords.length,0)/results.length;
 return score>=85&&lookups<=2&&results.every(r=>r.difficulty!=='hard')?1:score<60||results.filter(r=>r.difficulty==='hard').length>=2?-1:0;
}
export function knownVocabularyInReading(state:AppState,article:ReadingDocument){return article.vocabulary.filter(id=>(state.reviews[id]?.repetitions??0)>0||Boolean(state.notes[`library-known-${id}`]));}
