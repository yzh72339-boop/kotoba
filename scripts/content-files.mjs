import {readdir,readFile} from 'node:fs/promises';
import {parseDocument} from '../lib/content-library/schema.ts';
export async function contentFiles(directory='content'){
 const result=[];
 async function walk(path){for(const entry of await readdir(path,{withFileTypes:true}).catch(error=>{if(error.code==='ENOENT')return [];throw error})){const name=`${path}/${entry.name}`;if(entry.isDirectory())await walk(name);else if(entry.name.endsWith('.json'))result.push(name)}}
 await walk(directory);return result.sort();
}
export async function loadDocuments(directory='content'){
 const documents=[];for(const path of await contentFiles(directory)){
  const raw=JSON.parse(await readFile(path,'utf8'));const values=Array.isArray(raw)?raw:[raw];
  for(const value of values){try{documents.push(parseDocument(value))}catch(error){throw new Error(`${path}: ${error.message}`)}}
 }return documents;
}
