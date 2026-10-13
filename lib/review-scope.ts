import type {AppState} from './store';
// Only the current unfinished daily Review step may limit cards to its pinned plan.
// Source/budget reviews are independent, while their original session remains intact.
export function isDailyReview(session:AppState['activeSession'],paused:boolean,scope?:string){return Boolean(session&&!session.done&&session.step===0&&!paused&&!scope)}
