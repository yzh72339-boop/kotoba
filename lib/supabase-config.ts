export type SupabaseConfig=
 |{ok:true;url:string;publishableKey:string}
 |{ok:false;reason:'missing-url'|'invalid-url'|'missing-publishable-key'|'invalid-publishable-key'};

export function parseSupabasePublicConfig(rawUrl:string|undefined,rawKey:string|undefined):SupabaseConfig{
 const url=rawUrl?.trim(),publishableKey=rawKey?.trim();
 if(!url)return {ok:false,reason:'missing-url'};
 try{
  const parsed=new URL(url),local=['localhost','127.0.0.1','[::1]'].includes(parsed.hostname);
  if((parsed.protocol!=='https:'&&!(local&&parsed.protocol==='http:'))||parsed.username||parsed.password||parsed.search||parsed.hash||(parsed.pathname!==''&&parsed.pathname!=='/'))return {ok:false,reason:'invalid-url'};
  if(!publishableKey)return {ok:false,reason:'missing-publishable-key'};
  if(!/^sb_publishable_[A-Za-z0-9_-]{16,}$/.test(publishableKey))return {ok:false,reason:'invalid-publishable-key'};
  return {ok:true,url:parsed.origin,publishableKey};
 }catch{return {ok:false,reason:'invalid-url'}}
}

export function publicEnvironmentIssues(environment:Record<string,string|undefined>){
 const issues:string[]=[];
 for(const [name,value] of Object.entries(environment)){
  if(!name.startsWith('NEXT_PUBLIC_')||!value)continue;
  let serviceRole=false;
  if(value.split('.').length===3){try{serviceRole=JSON.parse(atob(value.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).role==='service_role'}catch{/* Not a JWT. */}}
  if(/SECRET|SERVICE_ROLE|PASSWORD|DATABASE|OPENAI|(?:^|_)AI_.*KEY/i.test(name)||value.startsWith('sb_secret_')||serviceRole)issues.push(`${name}: server credentials cannot be public`);
 }
 if(environment.NEXT_PUBLIC_SUPABASE_ANON_KEY)issues.push('NEXT_PUBLIC_SUPABASE_ANON_KEY: replace with NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
 const config=parseSupabasePublicConfig(environment.NEXT_PUBLIC_SUPABASE_URL,environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
 if(!config.ok&&!config.reason.startsWith('missing-'))issues.push(`Supabase public configuration: ${config.reason}`);
 return issues;
}
