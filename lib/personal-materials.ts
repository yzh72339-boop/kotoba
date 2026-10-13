import {z} from 'zod';
import type {AppState} from './store';
import type {Language} from './content';
import {contentLevels} from './content-library/schema';
import {stableId} from './learning-memory';

export const MATERIAL_LIMIT={characters:12000,bytes:48000,paragraphs:100};
const identifier=z.string().regex(/^[a-z0-9-]+$/).max(200);
const paragraph=z.object({id:identifier,start:z.number().int().nonnegative(),end:z.number().int().positive()}).strict();
const snapshotSchema=z.object({id:identifier,materialId:identifier,version:z.number().int().positive(),language:z.enum(['ja','en']),text:z.string().min(1).max(MATERIAL_LIMIT.characters),paragraphs:z.array(paragraph).min(1).max(MATERIAL_LIMIT.paragraphs),createdAt:z.number().finite().nonnegative()}).strict();
const materialSchema=z.object({id:identifier,title:z.string().trim().min(1).max(180),language:z.enum(['ja','en']),level:z.string().nullable(),source:z.string().max(2000),hash:z.string().regex(/^[a-f0-9]{64}$/),snapshotId:identifier,version:z.number().int().positive(),createdAt:z.number().finite().nonnegative(),updatedAt:z.number().finite().nonnegative()}).strict();
export type PersonalMaterial=z.infer<typeof materialSchema>;
export type MaterialSnapshot=z.infer<typeof snapshotSchema>;
export type MaterialInput={title:string;language:Language;level:string|null;source:string;text:string};
export type PreparedMaterial={material:PersonalMaterial;snapshot:MaterialSnapshot};
const materialKey=(id:string)=>'personal-material-'+id;
const snapshotKey=(id:string)=>'personal-snapshot-'+id;
function decode<T>(value:string|undefined,schema:z.ZodType<T>):T|null{try{const parsed=schema.safeParse(JSON.parse(value??'null'));return parsed.success?parsed.data:null}catch{return null}}
export function personalMaterials(state:AppState,language?:Language){return Object.keys(state.notes).filter(key=>key.startsWith('personal-material-')).map(key=>personalMaterial(state,key.slice('personal-material-'.length))).filter((value):value is PersonalMaterial=>Boolean(value&&(!language||value.language===language))).sort((a,b)=>b.updatedAt-a.updatedAt||a.id.localeCompare(b.id))}
export function personalMaterial(state:AppState,id:string){const m=decode(state.notes[materialKey(id)],materialSchema);return m&&m.id===id&&id.startsWith(`article-${m.language}-personal-`)&&(m.level===null||(contentLevels[m.language] as readonly string[]).includes(m.level))?m:null}
export function materialSnapshot(state:AppState,material:PersonalMaterial,snapshotId=material.snapshotId){const s=decode(state.notes[snapshotKey(snapshotId)],snapshotSchema);if(!s||s.id!==snapshotId||s.materialId!==material.id||s.language!==material.language||new Set(s.paragraphs.map(p=>p.id)).size!==s.paragraphs.length||s.paragraphs.some((p,i)=>p.end>s.text.length||p.start>=p.end||i>0&&p.start<s.paragraphs[i-1].end))return null;return s}
export function snapshotById(state:AppState,id:string){return decode(state.notes[snapshotKey(id)],snapshotSchema)}
export function materialParagraphs(snapshot:MaterialSnapshot){return snapshot.paragraphs.map(p=>({...p,text:snapshot.text.slice(p.start,p.end)}))}
export function validateMaterialText(value:string){const text=value.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').trim();if(!text)throw new Error('请粘贴或导入非空正文。');if(/\u0000|[\u0001-\u0008\u000B\u000C\u000E-\u001F]/u.test(text))throw new Error('正文包含控制字符，请使用 UTF-8 文本。');if(text.length>MATERIAL_LIMIT.characters||new TextEncoder().encode(text).length>MATERIAL_LIMIT.bytes)throw new Error('素材过长：最多12000字符 / 48 KB，请分篇导入。');return text}
export function decodeMaterialFile(name:string,bytes:Uint8Array){if(!/\.(txt|md|markdown)$/i.test(name))throw new Error('仅支持 UTF-8 TXT / Markdown 文件。');if(bytes.byteLength>MATERIAL_LIMIT.bytes)throw new Error('文件超过48 KB，请分篇导入。');let text;try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes)}catch{throw new Error('无法按 UTF-8 解码，请先转换文件编码。');}return validateMaterialText(text)}
function paragraphRanges(text:string){const result:{id:string;start:number;end:number}[]=[],seen=new Map<string,number>();const separators=/\n[\t ]*\n+/g;let start=0;
 const append=(end:number)=>{let a=start,b=end;while(a<b&&/\s/u.test(text[a]))a++;while(b>a&&/\s/u.test(text[b-1]))b--;if(a===b)return;const value=text.slice(a,b),occurrence=seen.get(value)??0;seen.set(value,occurrence+1);result.push({id:stableId('p',value+'\u0000'+occurrence),start:a,end:b})};
 for(const match of text.matchAll(separators)){append(match.index);start=match.index+match[0].length}append(text.length);if(result.length>MATERIAL_LIMIT.paragraphs)throw new Error('段落超过100个，请分篇导入。');return result;
}
export function materialSentences(text:string,language:Language){
 const output:{id:string;text:string;start:number;end:number}[]=[];let start=0;const stack:string[]=[];const closing:Record<string,string>={'「':'」','『':'』','（':'）','“':'”','‘':'’','(' :')'};
 const push=(end:number)=>{const raw=text.slice(start,end);if(raw.trim())output.push({id:stableId('s',start+':'+raw),text:raw,start,end});start=end};
 for(let i=0;i<text.length;i++){const c=text[i];if(closing[c])stack.push(closing[c]);else if(stack.at(-1)===c)stack.pop();else if(c==='"'){if(stack.at(-1)==='"')stack.pop();else stack.push('"')}
  if(stack.length||!/[。！？!?\.]/u.test(c))continue;
  if(c==='.'&&language==='en'){const token=text.slice(0,i+1).match(/([A-Za-z.]+)\.$/u)?.[1]?.toLowerCase();if(token&&['mr','mrs','ms','dr','prof','sr','jr','st','vs','etc','e.g','i.e','u.s','u.k'].includes(token)||/\d/u.test(text[i-1]??'')&&/\d/u.test(text[i+1]??'')||/[A-Za-z]/u.test(text[i+1]??''))continue}
  if(language==='en'&&text[i+1]&&!/\s/u.test(text[i+1]))continue;
  push(i+1);
 }push(text.length);return output;
}
async function digest(text:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),b=>b.toString(16).padStart(2,'0')).join('')}
export async function prepareMaterial(input:MaterialInput,existing?:PersonalMaterial,now=Date.now()):Promise<PreparedMaterial>{
 const text=validateMaterialText(input.text),hash=await digest(input.language+'\u0000'+text);const id=existing?.id??`article-${input.language}-personal-${hash.slice(0,24)}`;
 if(!input.title.trim()||input.title.trim().length>180)throw new Error('标题须为1–180个字符。');if(input.source.length>2000)throw new Error('来源说明最多2000个字符。');
 if(existing&&existing.language!==input.language)throw new Error('编辑已有素材时保留语言；另一语言请新建素材。');
 const version=(existing?.version??0)+1,snapshotId='snapshot-'+crypto.randomUUID(),snapshot=snapshotSchema.parse({id:snapshotId,materialId:id,version,language:input.language,text,paragraphs:paragraphRanges(text),createdAt:now});
 const material=materialSchema.parse({id,title:input.title.trim(),language:input.language,level:input.level,source:input.source.trim(),hash,snapshotId,version,createdAt:existing?.createdAt??now,updatedAt:now});
 if(material.level!==null&&!(contentLevels[material.language] as readonly string[]).includes(material.level))throw new Error('所选等级不属于素材语言。');
 if(JSON.stringify(snapshot).length>32000)throw new Error('段落定位数据过大，请分篇导入。');return {material,snapshot};
}
export function duplicateMaterial(state:AppState,prepared:PreparedMaterial){return personalMaterials(state).find(m=>m.id!==prepared.material.id&&m.language===prepared.material.language&&m.hash===prepared.material.hash)||personalMaterials(state).find(m=>prepared.material.version===1&&m.language===prepared.material.language&&m.hash===prepared.material.hash)||null}
export function putMaterial(state:AppState,prepared:PreparedMaterial,copy=false):AppState{
 if(duplicateMaterial(state,prepared)&&!copy)return state;
 let {material,snapshot}=prepared;const collision=personalMaterial(state,material.id);if(copy||collision&&material.version===1&&collision.hash!==material.hash){const id=material.id+'-'+snapshot.id.slice('snapshot-'.length);material={...material,id,version:1};snapshot={...snapshot,materialId:id,version:1};if(personalMaterial(state,id))return state}
 // An edit based on a superseded revision requires an explicit retry, never silent overwrite.
 if(material.version>1&&(!collision||collision.version!==material.version-1))throw new Error('素材已更新或删除，请重新打开后编辑。');
 if(collision&&material.version>1&&collision.hash===material.hash&&collision.title===material.title&&collision.source===material.source&&collision.level===material.level)return state;
 const notes={...state.notes,[snapshotKey(snapshot.id)]:JSON.stringify(snapshot),[materialKey(material.id)]:JSON.stringify(material)},readingPositions={...state.readingPositions};if(collision&&collision.hash!==material.hash){delete notes['library-reading-anchor-'+material.id];delete readingPositions[material.id]}
 return {...state,notes,readingPositions};
}
export function removeMaterial(state:AppState,id:string):AppState{if(!personalMaterial(state,id))return state;const notes={...state.notes},positions={...state.readingPositions};delete notes[materialKey(id)];delete positions[id];return {...state,notes,readingPositions:positions};}
export function materialProgress(state:AppState,id:string,version:number){return decode(state.notes['personal-reading-'+id+'-'+version],z.object({paragraphId:identifier,completed:z.boolean(),updatedAt:z.number().finite().nonnegative()}).strict())}
export function saveMaterialProgress(state:AppState,material:PersonalMaterial,paragraphId:string,completed=false,now=Date.now()):AppState{const snapshot=materialSnapshot(state,material);if(!snapshot?.paragraphs.some(p=>p.id===paragraphId))return state;const key='personal-reading-'+material.id+'-'+material.version,previous=materialProgress(state,material.id,material.version);if(previous?.paragraphId===paragraphId&&previous.completed===completed)return state;return {...state,notes:{...state.notes,[key]:JSON.stringify({paragraphId,completed:completed||previous?.completed===true,updatedAt:now})},readingPositions:completed?{...state.readingPositions,[material.id]:{...state.readingPositions[material.id],progress:100,updatedAt:now}}:state.readingPositions}}
