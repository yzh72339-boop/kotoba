import {initialState,type AppState} from './store.ts';
import type {Language} from './content.ts';
export type PrivateAccount={
 profile:{id:string;display_name:string|null;native_language:string;timezone:string;daily_goal_minutes:number;preferred_explanation_level:'simple'|'normal'|'detailed'|'immersion';theme:'light'|'dark'|'system';updated_at:string};
 languages:{user_id:string;language_code:Language;current_level:string|null;target_level:string|null;primary_language:boolean;learning_goal:string|null;interests:string[];updated_at:string}[];
 progress:{revision:number;state:unknown}|null;
};
const timestamp=(value:string)=>Math.max(1,Date.parse(value)||1);

// Used only when a private account has no learning snapshot yet. Subsequent
// sessions use the PostgreSQL revision/snapshot and existing conflict merger.
export function initialAccountState(account:PrivateAccount,systemTheme:'light'|'dark'='light'):AppState{
 const state=structuredClone(initialState),profile=account.profile;
 const primary=account.languages.find(language=>language.primary_language)?.language_code??'ja';
 for(const language of account.languages){
  state.languageProfiles[language.language_code]={level:language.current_level??state.languageProfiles[language.language_code].level,targetLevel:language.target_level??'',goal:language.learning_goal??'日常交流',interests:language.interests};
  state._clock[`languageProfiles/${language.language_code}`]=timestamp(language.updated_at);
 }
 state.profile={...state.profile,name:profile.display_name?.trim()||'Learner',language:primary,level:state.languageProfiles[primary].level,goal:state.languageProfiles[primary].goal,dailyGoal:profile.daily_goal_minutes,nativeLanguage:profile.native_language,timezone:profile.timezone,explanationLevel:profile.preferred_explanation_level};
 const at=timestamp(profile.updated_at),primaryAt=timestamp(account.languages.find(language=>language.language_code===primary)?.updated_at??profile.updated_at);
 for(const key of ['name','dailyGoal','nativeLanguage','timezone','explanationLevel'])state._clock[`profile/${key}`]=at;
 for(const key of ['language','level','goal'])state._clock[`profile/${key}`]=primaryAt;
 state.theme=profile.theme==='system'?systemTheme:profile.theme;state._clock.theme=at;if(profile.theme==='system'){state.notes['app-theme-preference']='system';state._clock['notes/app-theme-preference']=at;}
 return state;
}
