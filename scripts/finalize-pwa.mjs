import {readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const walk=async(dir)=>(await Promise.all((await readdir(dir,{withFileTypes:true})).map(async e=>e.isDirectory()?walk(`${dir}/${e.name}`):`${dir}/${e.name}`))).flat();
const files=(await walk('out/_next/static')).filter(x=>/\.(js|css|woff2)$/.test(x)).sort();
const hash=createHash('sha256');for(const file of [...files,'out/index.html','out/manifest.webmanifest','public/sw.js',...(await walk('out/icons')).sort()]){hash.update(file);hash.update(await readFile(file));}
const packageVersion=JSON.parse(await readFile('package.json','utf8')).version;
const version=`kotoba-${packageVersion}-${hash.digest('hex').slice(0,12)}`;
let sw=await readFile('public/sw.js','utf8');sw=sw.replace(/const VERSION='kotoba-[^']+-dev';/,`const VERSION=${JSON.stringify(version)};`);sw=sw.replace("const PRECACHE=[",`const PRECACHE=[${files.map(x=>JSON.stringify('/'+x.slice(4))).join(',')},`);await writeFile('out/sw.js',sw);console.log(`PWA ${version}: ${files.length} app assets queued for offline cache.`);
