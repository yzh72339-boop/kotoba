import {mkdir,copyFile,readdir,stat} from 'node:fs/promises';
const directory='public/language/kuromoji-0.1.2/dict';await mkdir(directory,{recursive:true});
let bytes=0;
for(const file of await readdir('node_modules/kuromoji/dict'))if(file.endsWith('.dat.gz')){await copyFile('node_modules/kuromoji/dict/'+file,directory+'/'+file);bytes+=(await stat(directory+'/'+file)).size;}
const licenses=[['kuroshiro/LICENSE','kuroshiro-1.2.1.txt'],['kuroshiro-analyzer-kuromoji/LICENSE','kuroshiro-analyzer-kuromoji-1.1.0.txt'],['kuromoji/LICENSE-2.0.txt','kuromoji-0.1.2.txt'],['kuromoji/NOTICE.md','kuromoji-ipadic-NOTICE.txt'],['path-browserify/LICENSE','path-browserify-1.0.1.txt'],['async/LICENSE','async-MIT.txt'],['doublearray/LICENSE.txt','doublearray-MIT.txt'],['zlibjs/LICENSE','zlibjs-MIT.txt'],['lodash/LICENSE','lodash-MIT.txt'],['@babel/runtime/LICENSE','babel-runtime-MIT.txt']];
await mkdir('public/licenses',{recursive:true});
for(const [source,target] of licenses)await copyFile('node_modules/'+source,'public/licenses/'+target);
console.log(`Optional Japanese dictionary: ${bytes} bytes; not included in app shell precache.`);
