import {parseDocument,type ContentEntry,type LearningDocument} from './schema';
import {z} from 'zod';
import {readDownloadedContent,cacheDownloadedContent} from '../platform/content-cache';
const entry=z.object({id:z.string().regex(/^[a-z0-9-]+$/),kind:z.enum(['grammar','reading']),language:z.enum(['ja','en']),level:z.string(),title:z.string(),summary:z.string(),topic:z.string(),tags:z.array(z.string()),keywords:z.array(z.string()).default([]),length:z.number(),minutes:z.number(),grammar:z.array(z.string()),vocabulary:z.array(z.string()),difficulty:z.number(),prerequisites:z.array(z.string())});
const recentDocuments=new Map<string,LearningDocument>();
export function peekDocument(id:string){return recentDocuments.get(id)??null}
async function getJSON(path:string,signal?:AbortSignal):Promise<unknown>{try{const response=await fetch(path,{signal});if(!response.ok||!response.headers.get('content-type')?.includes('application/json'))throw new Error('课程暂时无法读取。请联网重试或先下载资料。');return await response.json()}catch(error){if(signal?.aborted)throw error;const saved=await readDownloadedContent(path);if(saved!==null)return saved;throw error}}
export async function fetchCatalog(signal?:AbortSignal):Promise<ContentEntry[]>{return z.object({version:z.literal(1),entries:z.array(entry)}).parse(await getJSON('/content/library/index.json',signal)).entries;}
export async function fetchDocument(id:string,signal?:AbortSignal):Promise<LearningDocument>{if(!/^[a-z0-9-]+$/.test(id))throw new Error('Invalid content ID');const data=parseDocument(await getJSON(`/content/library/${id}.json`,signal));if(data.id!==id)throw new Error('Content identity mismatch');recentDocuments.delete(id);recentDocuments.set(id,data);if(recentDocuments.size>16)recentDocuments.delete(recentDocuments.keys().next().value!);return data;}
export async function downloadDocuments(ids:string[],catalog:ContentEntry[],onProgress:(count:number)=>void){
 if(ids.length>50)throw new Error('请分批下载资料。');
 await cacheDownloadedContent('/content/library/index.json',{version:1,entries:catalog});
 let completed=0;for(const id of ids){const doc=await fetchDocument(id);await cacheDownloadedContent(`/content/library/${id}.json`,doc);onProgress(++completed)}
}
