import type {Language} from './content';
export type DailyStep='Review'|'Grammar'|'Reading'|'Speaking';
export type DailySession={language:Language;step:number;startedAt:number;baseline:number;completed:DailyStep[];done:boolean};
export const DAILY_STEPS:DailyStep[]=['Review','Grammar','Reading','Speaking'];
export function shouldPauseDailySession(session:DailySession|null,page:string,language:Language){return Boolean(session&&!session.done&&(page!==DAILY_STEPS[session.step]||language!==session.language))}
export function restoreDailySession(state:{activeSession:DailySession|null;_clock:Record<string,number>},legacy:DailySession|null|undefined){
 const candidate=state.activeSession??(state._clock.activeSession?null:legacy);
 return candidate&&Number.isInteger(candidate.step)&&candidate.step>=0&&candidate.step<DAILY_STEPS.length?candidate:null;
}
export function advanceDailySession(s:DailySession):DailySession{if(s.done)return s;const completed=[...new Set([...s.completed,DAILY_STEPS[s.step]])];return {...s,completed,step:Math.min(3,s.step+1),done:s.step===3};}
export function swipeRating(dx:number,dy:number){if(Math.abs(dy)>Math.abs(dx)&&dy < -65)return 'Easy' as const;if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy))return dx<0?'Again' as const:'Good' as const;return null;}
