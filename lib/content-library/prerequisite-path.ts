import type {ContentEntry} from './schema';

export type PrerequisitePath={lessons:ContentEntry[];completed:number;unavailable:string[]};

// Only authored, same-language grammar relations are suggestions. A completed
// prerequisite needs no recursive re-teaching, and damaged graphs fail visibly.
export function prerequisitePath(target:Pick<ContentEntry,'id'|'language'|'prerequisites'>,catalog:ContentEntry[],completedIds:readonly string[]):PrerequisitePath{
 const completed=new Set(completedIds),seen=new Set<string>(),visiting=new Set([target.id]);
 const byId=new Map(catalog.filter(e=>e.kind==='grammar'&&e.language===target.language).map(e=>[e.id,e]));
 const result:PrerequisitePath={lessons:[],completed:0,unavailable:[]};
 function visit(id:string):boolean{
  if(visiting.has(id)){result.unavailable.push(id);return false}
  if(seen.has(id))return !result.unavailable.includes(id);
  const entry=byId.get(id);
  if(!entry){seen.add(id);result.unavailable.push(id);return false}
  if(completed.has(id)){seen.add(id);result.completed++;return true}
  visiting.add(id);let available=true;
  for(const child of entry.prerequisites)if(!visit(child))available=false;
  visiting.delete(id);seen.add(id);
  if(available)result.lessons.push(entry);else result.unavailable.push(id);
  return available;
 }
 for(const id of target.prerequisites)visit(id);
 result.unavailable=[...new Set(result.unavailable)];return result;
}
