import {createClient} from '@supabase/supabase-js';
import {AUTH_STORAGE_KEY} from './private-session';
import {webAuthStorage} from './platform/auth';
import {parseSupabasePublicConfig} from './supabase-config';
// Direct env references allow Next.js to inline only these two public values.
export const supabaseConfiguration=parseSupabasePublicConfig(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
export const supabase=supabaseConfiguration.ok?createClient(supabaseConfiguration.url,supabaseConfiguration.publishableKey,{auth:{storageKey:AUTH_STORAGE_KEY,storage:webAuthStorage,flowType:'pkce',detectSessionInUrl:true,persistSession:true,autoRefreshToken:true}}):null;
// All model requests use the same provider layer. This compatibility method has no separate API path.
export async function askTutor(message:string,context:unknown){const {aiProvider}=await import('./ai-provider');return (await aiProvider.request(message,context)).answer;}
