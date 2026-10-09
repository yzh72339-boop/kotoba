const CACHE='kotoba-personal-downloads';
function contentPath(path:string){if(!/^\/content\/library\/(?:index|[a-z0-9-]+)\.json$/.test(path))throw new Error('Only validated library content can be downloaded');return path;}
export async function readDownloadedContent(path:string):Promise<unknown|null>{contentPath(path);if(typeof caches==='undefined')return null;const response=await(await caches.open(CACHE)).match(path);return response?response.json():null;}
export async function cacheDownloadedContent(path:string,value:unknown){contentPath(path);if(typeof caches==='undefined')throw new Error('此浏览器不支持离线下载。');const response=new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});await(await caches.open(CACHE)).put(path,response);}
