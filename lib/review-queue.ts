import type {AppState} from './store';
import type {Language,Word} from './content';
import {levels} from './course-library';
import {reviewContent} from './review-content';
import {learnedGrammarCards} from './content-library/learning';
import {calendarDay} from './study-calendar';

const catalogs=new Map<Language,Word[]>();
function catalog(language:Language){let cards=catalogs.get(language);if(!cards){cards=[...new Map(levels[language].flatMap(level=>reviewContent(language,level)).map(w=>[w.id,w])).values()];catalogs.set(language,cards)}return cards}
export function reviewCards(state:AppState,language=state.profile.language):Word[]{
 const level=language===state.profile.language?state.profile.level:state.languageProfiles[language].level;
 const personal=Object.values(state.dictionary).filter(w=>w.language===language);
 const sentences=state.sentences.filter(s=>s.language===language).map(s=>({id:s.id,word:s.sentence,pronunciation:'Recall the meaning',meaning:s.translation||'我的收藏句子',example:s.sentence,translation:s.translation,tag:'My sentence'}));
 const mistakes=state.mistakes.filter(m=>m.language===language&&!m.resolved&&m.area!=='vocabulary').slice(-12).map(m=>({id:`sentence-mistake-${m.id}`,word:m.original,pronunciation:'Find a better expression',meaning:m.correction,example:m.correction,translation:m.pattern,tag:'Personal mistake practice'}));
 // Keep already learned cards available when the learner changes level.
 const learned=catalog(language).filter(w=>Boolean(state.reviews[w.id]));
 return [...new Map([...reviewContent(language,level),...learned,...personal,...learnedGrammarCards(state,language),...sentences,...mistakes].map(w=>[w.id,w])).values()];
}
export function reviewQueue(state:AppState,now=Date.now(),language=state.profile.language){
 return reviewCards(state,language).filter(w=>!state.reviews[w.id]||state.reviews[w.id].due<=now).sort((a,b)=>{
  const ra=state.reviews[a.id],rb=state.reviews[b.id];
  if(Boolean(ra)!==Boolean(rb))return ra?-1:1;
  return (ra?.due??now)-(rb?.due??now)||a.id.localeCompare(b.id);
 });
}
export function reviewOverview(state:AppState,now=Date.now(),language=state.profile.language){
 const day=calendarDay(now,state.profile.timezone);let due=0,overdue=0,upcoming=0,newCards=0;
 for(const card of reviewCards(state,language)){const r=state.reviews[card.id];if(!r){newCards++;continue}if(r.due<=now){due++;if(calendarDay(r.due,state.profile.timezone)<day)overdue++}else upcoming++}
 return {due,overdue,upcoming,newCards,ready:due+newCards};
}
