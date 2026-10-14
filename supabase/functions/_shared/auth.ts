import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import {parseSupabasePublicConfig} from '../../../lib/supabase-config.ts';
export function cors(req:Request){const allowed=Deno.env.get('SITE_ORIGIN')??'';return {'Access-Control-Allow-Origin':req.headers.get('origin')===allowed?allowed:'','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Vary':'Origin'};}
export async function privateClients(req:Request){
 // PROJECT_* is used because Supabase reserves SUPABASE_* secret names.
 const config=parseSupabasePublicConfig(Deno.env.get('SUPABASE_URL'),Deno.env.get('PROJECT_PUBLISHABLE_KEY'));
 const serviceRole=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!config.ok||!serviceRole)throw new Error('AUTH_CONFIGURATION_MISSING');
 const authorization=req.headers.get('authorization')??'';
 if(!/^Bearer \S+$/i.test(authorization))throw new Error('PRIVATE_ACCESS_DENIED');
 const client=createClient(config.url,config.publishableKey,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error}=await client.auth.getUser();
 if(error||!user||!user.email_confirmed_at)throw new Error('AUTH_ACCESS_DENIED');
 const {data:member,error:rlsError}=await client.rpc('has_learning_access');
 if(rlsError||member!==true)throw new Error('AUTH_ACCESS_DENIED');
 const admin=createClient(config.url,serviceRole,{auth:{persistSession:false,autoRefreshToken:false}});
 return {client,admin,user};
}
