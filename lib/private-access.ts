export type VerifiedOwner={id:string;projectUrl:string;verifiedAt:number};
export function verifiedOwnerForProject(value:unknown,projectUrl:string):VerifiedOwner|undefined{
 if(!value||typeof value!=='object')return;
 const cached=value as Partial<VerifiedOwner>;
 if(typeof cached.id!=='string'||typeof cached.projectUrl!=='string'||typeof cached.verifiedAt!=='number'||!Number.isFinite(cached.verifiedAt)||cached.verifiedAt<=0)return;
 if(cached.projectUrl!==projectUrl)return;
 return cached as VerifiedOwner;
}
export function privateAccessAllowed({online,locked,cached,sessionId,owner,requestFailed=false}:{online:boolean;locked:boolean;cached?:VerifiedOwner;sessionId?:string;owner?:boolean;requestFailed?:boolean}){
 if(locked)return false;
 if(!online)return Boolean(cached);
 if(!sessionId)return false;
 if(owner===false)return false;
 return owner===true||Boolean(requestFailed&&cached?.id===sessionId);
}
