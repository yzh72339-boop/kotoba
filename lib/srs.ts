export type Rating='Again'|'Hard'|'Good'|'Easy';
export type Review={id:string;due:number;interval:number;ease:number;repetitions:number;lapses:number;firstLearned?:number};
const MAX_INTERVAL_DAYS=36500;
export function schedule(previous:Review|undefined,id:string,rating:Rating,now=Date.now()):Review {
 const p:Review=previous??{id,due:now,interval:0,ease:2.5,repetitions:0,lapses:0};
 const easeHundred=Math.round(p.ease*100);
 if(rating==='Again')return {...p,due:now+60000,interval:0,ease:Math.max(130,easeHundred-20)/100,repetitions:0,lapses:p.lapses+1};
 // Integer arithmetic agrees with PostgreSQL NUMERIC rounding at half-day boundaries.
 const rounded=(value:number,scale:number)=>Math.floor((value+scale/2)/scale);
 const candidate=rating==='Hard'?Math.max(1,rounded(p.interval*120,100)):rating==='Easy'?Math.max(4,rounded(p.interval*easeHundred*130,10000)):p.repetitions===0?1:p.repetitions===1?3:Math.max(1,rounded(p.interval*easeHundred,100));
 const interval=Math.min(MAX_INTERVAL_DAYS,candidate);
 return {...p,firstLearned:p.firstLearned??now,interval,due:now+interval*86400000,ease:Math.max(130,easeHundred+(rating==='Hard'?-15:rating==='Easy'?15:0))/100,repetitions:p.repetitions+1};
}
export function dueCards<T extends {id:string}>(cards:T[],reviews:Record<string,Review>,now=Date.now()){return cards.filter(c=>!reviews[c.id]||reviews[c.id].due<=now)}
