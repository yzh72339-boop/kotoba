import {z} from 'zod';
import type {AppState} from './store';
import type {Language,Word} from './content';
import {stableId} from './learning-memory';
import {attachReadingSource} from './content-library/reading-collection';
import {materialParagraphs,snapshotById,type PersonalMaterial,type MaterialSnapshot} from './personal-materials';

const schema=z.object({id:z.string().regex(/^context-card-(ja|en)-[a-f0-9]{32}$/),materialId:z.string().regex(/^article-(ja|en)-personal-[a-z0-9-]+$/),snapshotId:z.string().regex(/^[a-z0-9-]+$/),paragraphId:z.string().regex(/^p-[a-f0-9]{32}$/),version:z.number().int().positive(),title:z.string().min(1).max(180),source:z.string().max(2000),level:z.string().nullable(),language:z.enum(['ja','en']),expression:z.string().trim().min(1).max(1200),meaning:z.string().trim().min(1).max(4000),sentence:z.string().min(1).max(12000),translation:z.string().max(4000),kind:z.enum(['word','sentence']),mode:z.enum(['expression','context']),paused:z.boolean(),archived:z.boolean(),createdAt:z.number().finite().nonnegative(),updatedAt:z.number().finite().nonnegative()}).strict();
export type PersonalContextCard=z.infer<typeof schema>;
export type ContextInput={expression:string;meaning:string;sentence:string;translation:string;kind:'word'|'sentence';mode:'expression'|'context';paragraphId:string};
const key=(id:string)=>'personal-context-'+id;
export function personalContextCard(state:AppState,id:string):PersonalContextCard|null{try{const result=schema.safeParse(JSON.parse(state.notes[key(id)]??'null'));const c=result.success?result.data:null;return c&&c.id===id&&c.id.startsWith('context-card-'+c.language+'-')&&c.materialId.startsWith('article-'+c.language+'-personal-')?c:null}catch{return null}}
export function personalContextCards(state:AppState,language?:Language,includeArchived=false){return Object.keys(state.notes).filter(k=>k.startsWith('personal-context-context-card-')).map(k=>personalContextCard(state,k.slice('personal-context-'.length))).filter((c):c is PersonalContextCard=>Boolean(c&&(!language||c.language===language)&&(includeArchived||!c.archived))).sort((a,b)=>b.createdAt-a.createdAt||a.id.localeCompare(b.id))}
export function createContextCard(material:PersonalMaterial,snapshot:MaterialSnapshot,input:ContextInput,now=Date.now()):PersonalContextCard{
 const sentence=input.sentence.trim(),expression=input.expression.trim(),meaning=input.meaning.trim();const paragraph=materialParagraphs(snapshot).find(p=>p.id===input.paragraphId);
 if(snapshot.materialId!==material.id||snapshot.language!==material.language||!paragraph||!paragraph.text.includes(sentence)||!sentence.includes(expression)||!expression||!meaning)throw new Error('请填写原句中实际出现的表达及个人释义，并保留正确来源段落。');
 const id=stableId('context-card-'+material.language,[material.id,input.paragraphId,sentence,expression,meaning,input.kind].join('\u0000'));
 const card=schema.parse({id,materialId:material.id,snapshotId:snapshot.id,paragraphId:input.paragraphId,version:snapshot.version,title:material.title,source:material.source,level:material.level,language:material.language,expression,meaning,sentence,translation:input.translation,kind:input.kind,mode:input.mode,paused:false,archived:false,createdAt:now,updatedAt:now});
 if(JSON.stringify(card).length>32000)throw new Error('语境过长，请选取较短的原句。');return card;
}
export function contextDuplicate(state:AppState,candidate:PersonalContextCard){return personalContextCards(state,undefined,true).find(c=>c.materialId===candidate.materialId&&c.paragraphId===candidate.paragraphId&&c.sentence===candidate.sentence&&c.expression===candidate.expression&&c.meaning===candidate.meaning&&c.kind===candidate.kind)??null}
export function saveContextCard(state:AppState,card:PersonalContextCard,reactivate=false):AppState{
 const duplicate=contextDuplicate(state,card);if(duplicate&&!reactivate)return state;let current=duplicate?{...duplicate,paused:false,archived:false,updatedAt:card.updatedAt}:card;
 // Editing a gloss preserves its ID; recapturing the original gloss must not
 // overwrite that edited card just because its original semantic hash matches.
 const occupied=personalContextCard(state,current.id);
 if(!duplicate&&occupied){current={...current,id:stableId('context-card-'+current.language,current.id+'\u0000semantic-recapture')};const collision=personalContextCard(state,current.id);if(collision)throw new Error('语境身份冲突，请检查已有卡片；没有覆盖任何记录。')}
 const snapshot=snapshotById(state,current.snapshotId);if(!snapshot||snapshot.materialId!==current.materialId||snapshot.language!==current.language)throw new Error('原文快照不可用，未保存卡片。');
 let next:AppState={...state,notes:{...state.notes,[key(current.id)]:JSON.stringify(current)},reviews:{...state.reviews,[current.id]:state.reviews[current.id]??{id:current.id,due:current.createdAt,interval:0,ease:2.5,repetitions:0,lapses:0}}};
 next=attachReadingSource(next,current.id,{articleId:current.materialId,title:current.title,sentence:current.sentence,language:current.language,snapshotId:current.snapshotId,paragraphId:current.paragraphId,version:current.version});return next;
}
export function editContextCard(state:AppState,id:string,changes:{meaning?:string;translation?:string;mode?:PersonalContextCard['mode'];paused?:boolean;archived?:boolean},now=Date.now()):AppState{
 const current=personalContextCard(state,id);if(!current)return state;const card=schema.parse({...current,...changes,updatedAt:now});if(JSON.stringify(card).length>32000)throw new Error('卡片标注过长。');return {...state,notes:{...state.notes,[key(id)]:JSON.stringify(card)}};
}
export function contextCloze(card:PersonalContextCard){const start=card.sentence.indexOf(card.expression);return start<0?card.sentence:card.sentence.slice(0,start)+'［回忆原文表达］'+card.sentence.slice(start+card.expression.length)}
export function contextReviewCards(state:AppState,language:Language):Word[]{return personalContextCards(state,language).filter(c=>!c.paused).map(c=>({id:c.id,word:c.mode==='context'?contextCloze(c):c.expression,pronunciation:c.mode==='context'?'原文回忆 · 翻面自评，不自动判语言错误':'个人语境 · 回忆自己填写的含义',meaning:c.mode==='context'?c.expression+' · '+c.meaning:c.meaning,example:c.sentence,translation:c.translation||'译文尚未填写',tag:c.kind==='sentence'?'个人句卡':'个人词卡'}))}
