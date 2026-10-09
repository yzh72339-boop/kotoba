import type {AppState} from './store';
import type {Word} from './content';
import {schedule,type Rating} from './srs';
import {today} from './store';
import {captureWord,captureSentence,createMistake} from './learning-memory';
import {readingSources,collectReadingMistake} from './content-library/reading-collection';
export type ReviewRun={id:string;language:'ja'|'en';startedAt:number;cardIds:string[]};
const runKey=(s:AppState,articleId?:string)=>`review-run-${s.activeSession&&!s.activeSession.done?`${s.activeSession.startedAt}-`:''}${s.profile.language}-${articleId??'daily'}`;
export function savedReviewRun(s:AppState,articleId?:string):ReviewRun|null{
 try{const value=JSON.parse(s.notes[runKey(s,articleId)]??'null');return value&&typeof value.id==='string'&&/^[a-z0-9-]{1,80}$/i.test(value.id)&&value.language===s.profile.language&&Number.isFinite(value.startedAt)&&value.startedAt>0&&Array.isArray(value.cardIds)&&value.cardIds.length<=100&&value.cardIds.every((v:unknown)=>typeof v==='string'&&/^[a-z0-9-]+$/.test(v))?value:null}catch{return null}
}
export function saveReviewRun(s:AppState,run:ReviewRun,articleId?:string):AppState{return {...s,notes:{...s.notes,[runKey(s,articleId)]:JSON.stringify(run)}}}
export function reviewedInRun(s:AppState,run:ReviewRun):Set<string>{return new Set(s.reviewHistory.filter(e=>e.language===run.language&&e.at>=run.startedAt&&run.cardIds.includes(e.cardId)).map(e=>e.cardId))}
export function unfinishedRun(s:AppState,run:ReviewRun,cards:Word[]):Word[]{const done=reviewedInRun(s,run);const byId=new Map(cards.map(c=>[c.id,c]));return run.cardIds.filter(id=>!done.has(id)).map(id=>byId.get(id)).filter((card):card is Word=>Boolean(card))}
// One atomic local change goes through the existing snapshot/sync queue. IDs are created
// at the action boundary, so a React updater retry cannot duplicate history or statistics.
export function applyCardRating(s:AppState,word:Word,rating:Rating,event:{id:string;sessionId:string;at:number;minutes:number;review:boolean;mistake:ReturnType<typeof createMistake>|null}):AppState{
 if(s.reviewHistory.some(e=>e.id===event.id))return s;
 const vocabularyWord=!word.id.startsWith('sentence-')&&!word.id.startsWith('grammar-');
 const captured=vocabularyWord?captureWord(word.word,s.profile.language,event.review?'Review':'Vocabulary',word.meaning):null;
 const sentence=word.id.startsWith('sentence-')?{...captureSentence(word.id.startsWith('sentence-mistake-')?word.example:word.word,s.profile.language,word.id.startsWith('sentence-mistake-')?'Mistake practice':'Listening',word.id.startsWith('sentence-mistake-')?word.translation:word.meaning),id:word.id}:null;
 let next:AppState={...s,sessions:event.review?[...s.sessions,{id:event.sessionId,day:today(s.profile.timezone,event.at),minutes:Math.max(0,Math.round(event.minutes*60000)/60000),type:'Review',count:1,language:s.profile.language,at:event.at}]:s.sessions,reviews:{...s.reviews,[word.id]:schedule(s.reviews[word.id],word.id,rating,event.at)},reviewHistory:[...s.reviewHistory,{id:event.id,language:s.profile.language,cardId:word.id,rating,at:event.at}],dictionary:captured?{...s.dictionary,[word.id]:s.dictionary[word.id]??{...captured,id:word.id}}:s.dictionary,sentences:sentence&&!s.sentences.some(x=>x.id===sentence.id)?[...s.sentences,sentence]:s.sentences};
 if(event.mistake){const source=readingSources(s,word.id)[0];next=source?collectReadingMistake(next,event.mistake,source):{...next,mistakes:[...next.mistakes,event.mistake]}}
 return next;
}
