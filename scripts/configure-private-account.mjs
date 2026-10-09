// Server-only bootstrap. Credentials are environment variables; never included in browser builds.
import {createClient} from '@supabase/supabase-js';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY,email=process.env.ALLOWED_USER_EMAIL,password=process.env.PRIVATE_ACCOUNT_PASSWORD;
if(!url||!key||!email)throw new Error('Set server-side Supabase URL, service role key, and ALLOWED_USER_EMAIL.');
const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const {error}=await admin.rpc('configure_private_owner',{p_email:email});if(error)throw new Error('Owner configuration failed. Apply migrations first.');
let owner=null;for(let page=1;!owner;page++){const {data,error:listError}=await admin.auth.admin.listUsers({page,perPage:100});if(listError)throw new Error('Unable to inspect private account.');owner=data.users.find(u=>u.email?.toLowerCase()===email.toLowerCase())??null;if(data.users.length<100)break;}
if(owner&&password){const {error:updateError}=await admin.auth.admin.updateUserById(owner.id,{password,email_confirm:true});if(updateError)throw new Error('Private password update failed.');}
if(!owner){const {data,error:createError}=await admin.auth.admin.createUser({email,...(password?{password}:{}),email_confirm:true,user_metadata:{name:'Learner'}});if(createError)throw new Error('Private account provisioning failed.');owner=data.user;}
console.log('Private owner configured. Google OAuth and email/password use this one existing identity. Public registration remains closed.');
