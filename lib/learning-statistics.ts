import type {AppState} from './store';
import {allCourseWords,coursePack} from './course-library';
import {learnedGrammarCards} from './content-library/learning';
import {calendarDay,sessionDay,shiftDay,validTimeZone} from './study-calendar';
import {reviewOverview} from './review-queue';
import {streak} from './store';

export type StatsPeriod='day'|'week'|'month';
export function learningStatistics(state:AppState,period:StatsPeriod='week',now=Date.now()){
 const language=state.profile.language,zone=validTimeZone(state.profile.timezone),day=calendarDay(now,zone);
 const first=shiftDay(day,period==='day'?0:period==='week'?-6:-29);
 const sessions=[...new Map(state.sessions.filter(s=>s.language===language||!s.language).map(s=>[s.id,s])).values()].filter(s=>{const key=sessionDay(s,zone);return key>=first&&key<=day});
 const reviews=[...new Map(state.reviewHistory.filter(r=>r.language===language).map(r=>[r.id,r])).values()].filter(r=>{const key=calendarDay(r.at,zone);return key>=first&&key<=day});
 const words=[...new Map([...allCourseWords(language),...Object.values(state.dictionary).filter(w=>w.language===language)].map(w=>[w.id,w])).values()];
 const familiar=words.filter(w=>(state.reviews[w.id]?.repetitions??0)>0),mastered=familiar.filter(w=>state.reviews[w.id].repetitions>=3);
 const learned=words.filter(w=>{const at=state.reviews[w.id]?.firstLearned;if(!at)return false;const key=calendarDay(at,zone);return key>=first&&key<=day}).length;
 const levelWords=coursePack(language,state.profile.level).words;
 const vocabularyProgress=levelWords.length?Math.round(levelWords.filter(w=>(state.reviews[w.id]?.repetitions??0)>0).length/levelWords.length*100):0;
 const hour=(at:number)=>new Intl.DateTimeFormat('en',{timeZone:zone,hour:'2-digit',hourCycle:'h23'}).format(at);
 const keys=period==='day'?Array.from({length:24},(_,i)=>String(i).padStart(2,'0')):Array.from({length:period==='week'?7:30},(_,i)=>shiftDay(first,i));
 const trend=keys.map(key=>({key,minutes:sessions.filter(s=>period==='day'?typeof s.at==='number'&&hour(s.at)===key:sessionDay(s,zone)===key).reduce((sum,s)=>sum+s.minutes,0)}));
 const vocabularyTrend=keys.map(key=>({key,count:words.filter(w=>{const at=state.reviews[w.id]?.firstLearned;if(!at)return false;const learnedDay=calendarDay(at,zone);return period==='day'?learnedDay<day||learnedDay===day&&hour(at)<=key:learnedDay<=key}).length}));
 const readingCompleted=Object.entries(state.readingPositions).filter(([id,p])=>(id===`article-${language}`||id.startsWith(`article-${language}-`))&&p.progress>=100).length;
 return {language,day,first,minutes:sessions.reduce((sum,s)=>sum+s.minutes,0),listeningMinutes:sessions.filter(s=>s.type==='Listening').reduce((sum,s)=>sum+s.minutes,0),reviews:reviews.length,accuracy:reviews.length?Math.round(reviews.filter(r=>r.rating!=='Again').length/reviews.length*100):null,newWords:learned,familiar:familiar.length,mastered:mastered.length,learning:words.filter(w=>state.reviews[w.id]&&state.reviews[w.id].repetitions<3).length,grammar:Math.max(learnedGrammarCards(state,language).length,state.completed.includes(`${language}:Grammar`)?1:0),vocabularyProgress,streak:streak(state,now),due:reviewOverview(state,now),trend,vocabularyTrend,readingCompleted,legacyUndated:sessions.some(s=>!s.at)};
}
export function latestReading(state:AppState){
 const language=state.profile.language;
 const entries=Object.entries(state.readingPositions).filter(([id,p])=>(id===`article-${language}`||id.startsWith(`article-${language}-`))&&p.progress>0&&p.progress<100).sort((a,b)=>b[1].updatedAt-a[1].updatedAt);
 for(const [id,position] of entries){
  if(id===`article-${language}`){const article=coursePack(language,state.profile.level).readings[0];return {id,title:article.title,progress:position.progress,legacy:true}}
  try{const meta:unknown=JSON.parse(state.notes[`library-reading-meta-${id}`]??'null');if(meta&&typeof meta==='object'&&'title' in meta&&typeof meta.title==='string'&&'language' in meta&&meta.language===language)return{id,title:meta.title,progress:position.progress,legacy:false}}catch{/* Skip incomplete metadata; do not guess a different article. */}
 }
 return null;
}
