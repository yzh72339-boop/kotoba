import {z} from 'https://esm.sh/zod@3';
import {privateClients,cors} from '../_shared/auth.ts';
const input=z.object({action:z.enum(['list','delete']),userId:z.string().uuid().optional(),confirmation:z.literal('DELETE TEST ACCOUNT').optional()}).strict();
Deno.serve(async(req:Request)=>{
 const headers=cors(req),reply=(status:number,value:unknown)=>new Response(JSON.stringify(value),{status,headers});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST'||!headers['Access-Control-Allow-Origin'])return reply(403,{error:'Not allowed'});
 let body:z.infer<typeof input>;try{const raw=await req.text();if(raw.length>2048)return reply(413,{error:'Request too large'});body=input.parse(JSON.parse(raw))}catch{return reply(400,{error:'Invalid request'})}
 try{
  const {client,admin,user}=await privateClients(req);
  const {data:owner,error:permission}=await client.rpc('is_private_owner');if(permission||owner!==true)return reply(403,{error:'Administrator required'});
  if(body.action==='list'){const {data,error}=await client.rpc('beta_admin_accounts');return error?reply(503,{error:'Account list unavailable'}):reply(200,data)}
  if(!body.userId||body.userId===user.id||body.confirmation!=='DELETE TEST ACCOUNT')return reply(400,{error:'Protected administrator or missing confirmation'});
  const {data:before,error:checkError}=await client.rpc('beta_admin_delete_check',{p_target:body.userId});if(checkError)return reply(403,{error:'Deletion not authorized'});
  if(!before.exists)return reply(200,{deleted:true,alreadyDeleted:true});
  if(!before.member)return reply(409,{error:'Account is not a tracked beta member; no deletion performed'});
  // Auth performs a hard delete. The database releases a seat only if that
  // deletion commits. Storage-owned accounts can fail here without losing seats.
  const {error:deletion}=await admin.auth.admin.deleteUser(body.userId,false);
  if(deletion)return reply(409,{error:'Auth account could not be safely deleted. Seat retained; review owned Storage files in Dashboard.'});
  const {data:after,error:afterError}=await client.rpc('beta_admin_delete_check',{p_target:body.userId});
  if(afterError||after.exists||after.member)return reply(503,{error:'Deletion result not confirmed. Refresh before retrying.'});
  return reply(200,{deleted:true});
 }catch{return reply(403,{error:'Authenticated administrator required'})}
});
