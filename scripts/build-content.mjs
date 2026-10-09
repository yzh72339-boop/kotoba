import {mkdir,writeFile,rm} from 'node:fs/promises';
import {loadDocuments} from './content-files.mjs';
import {contentEntry} from '../lib/content-library/schema.ts';
import {allCourseWords} from '../lib/course-library.ts';
const documents=await loadDocuments();const ids=new Set();
const words=new Map(['ja','en'].flatMap(language=>allCourseWords(language).map(word=>[word.id,word])));
const grammar=new Map(documents.filter(item=>item.kind==='grammar').map(item=>[item.id,item]));
const entries=documents.map(item=>contentEntry(item,item.kind==='reading'?[
 ...item.vocabulary.flatMap(id=>{const word=words.get(id);return word?[word.word,word.meaning,word.pronunciation]:[]}),
 ...item.grammar.flatMap(ref=>{const point=grammar.get(ref.id);return point?[ref.surface,point.pattern,point.meaningZh]:[ref.surface]})
]:[]));
await rm('public/content/library',{recursive:true,force:true});
await mkdir('public/content/library',{recursive:true});
for(const item of documents){if(ids.has(item.id))throw new Error(`Duplicate content ID: ${item.id}`);ids.add(item.id);await writeFile(`public/content/library/${item.id}.json`,JSON.stringify(item));}
await writeFile('public/content/library/index.json',JSON.stringify({version:1,entries}));
console.log(`Content compiled: ${documents.filter(d=>d.kind==='grammar').length} grammar, ${documents.filter(d=>d.kind==='reading').length} reading. Article bodies are not bundled into Today.`);
