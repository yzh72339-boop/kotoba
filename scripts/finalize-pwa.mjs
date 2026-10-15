import {readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const walk=async(dir)=>(await Promise.all((await readdir(dir,{withFileTypes:true})).map(async e=>e.isDirectory()?walk(`${dir}/${e.name}`):`${dir}/${e.name}`))).flat();
const files=(await walk('out/_next/static')).filter(x=>/\.(js|css|woff2)$/.test(x)).sort();
// Large optional language models warm only on use, then existing cache-first
// handles their worker/chunk requests. Keep every initial-page asset precached.
const initialHTML=await readFile('out/index.html','utf8');
const initialAssets=new Set([...initialHTML.matchAll(/(?:src|href)="([^"]+)"/g)].map(m=>m[1]));
const deferred=[];for(const file of files){const bytes=await readFile(file);if(!initialAssets.has('/'+file.slice(4))&&(bytes.length>262144||bytes.includes('wink-nlp-2.4.0')||bytes.includes('kuroshiro-kuromoji-1.1.0')))deferred.push(file);}
const shellFiles=files.filter(file=>!deferred.includes(file));
const hash=createHash('sha256');for(const file of [...files,'out/index.html','out/manifest.webmanifest','public/sw.js','out/api/app-update.html','out/api/app-update.js','out/api/update-core.js',...(await walk('out/icons')).sort(),...(await walk('out/content/library')).sort()]){hash.update(file);hash.update(await readFile(file));}
const packageVersion=JSON.parse(await readFile('package.json','utf8')).version;
const version=`kotoba-${packageVersion}-${hash.digest('hex').slice(0,12)}`;
let sw=await readFile('public/sw.js','utf8');sw=sw.replace(/const VERSION='kotoba-[^']+-dev';/,`const VERSION=${JSON.stringify(version)};`);sw=sw.replace("const PRECACHE=[",`const PRECACHE=[${shellFiles.map(x=>JSON.stringify('/'+x.slice(4))).join(',')},`);await writeFile('out/sw.js',sw);console.log(`PWA ${version}: ${shellFiles.length} app assets queued for offline cache; ${deferred.length} large/worker assets cached only after use.`);

// Server identity is independent of registration.waiting and is always fetched
// through the network-only /api/ path with a unique query + no-store request.
let gitCommit=null,sourceDirty=false;
try{gitCommit=(process.env.GITHUB_SHA??execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'})).trim();sourceDirty=Boolean(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim())}catch{gitCommit=null}
if(!/^[a-f0-9]{40,64}$/.test(gitCommit??''))gitCommit=null;
const builtAt=new Date(process.env.SOURCE_DATE_EPOCH?Number(process.env.SOURCE_DATE_EPOCH)*1000:Date.now()).toISOString();
const metadata={schema:1,version:packageVersion,buildId:version,builtAt,gitCommit,sourceDirty};
await writeFile('out/api/app-version.json',JSON.stringify(metadata,null,2)+'\n');
for(const file of (await walk('out')).filter(file=>file.endsWith('.html')&&!file.startsWith('out/api/'))){
 let html=await readFile(file,'utf8');html=html.replace('</head>',`<meta name="kotoba-build" content="${version}"/><meta name="kotoba-version" content="${packageVersion}"/></head>`);await writeFile(file,html);
}
console.log(`Version metadata: ${version}; git ${gitCommit??'unavailable'}${sourceDirty?' (worktree changes recorded)':''}.`);
