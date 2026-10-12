import type {GrammarPoint} from './content-library/schema';
import type {AppState,Mistake} from './store';
export function alternativeGrammarExercise(state:AppState,grammar:GrammarPoint,mistake:Mistake){
 if(grammar.language!==mistake.language||mistake.area!=='grammar'||mistake.source!==`Grammar: ${grammar.title}`)return null;
 let questionId:string|undefined;try{const link=JSON.parse(state.notes['mistake-question-'+mistake.id]??'null');if(link?.grammarId===grammar.id)questionId=link.questionId}catch{}
 const original=grammar.exercises.find(e=>e.id===questionId)??grammar.exercises.find(e=>e.acceptedAnswers.includes(mistake.correction)&&e.options?.includes(mistake.original));
 const alternative=original?grammar.exercises.find(e=>e.id!==original.id&&e.prompt!==original.prompt&&Boolean(e.options)):null;
 return {exercise:alternative??original??grammar.exercises[0],alternative:Boolean(alternative),originalId:original?.id,grammarId:grammar.id};
}
