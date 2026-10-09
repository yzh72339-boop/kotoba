// The same daily plan request has one ID across devices, avoiding duplicate AI calls.
export async function dailyPlanRequestId(userId:string,day:string,language:string,minutes:number){
 const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`kotoba-daily-v1:${userId}:${day}:${language}:${minutes}`))).slice(0,16);
 bytes[6]=(bytes[6]&15)|80;bytes[8]=(bytes[8]&63)|128;
 const hex=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
