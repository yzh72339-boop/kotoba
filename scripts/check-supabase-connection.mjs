import {existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {parseSupabasePublicConfig,publicEnvironmentIssues} from '../lib/supabase-config.ts';
// Node 24 opt-in keeps managed proxy and CA routing intact, like curl/npm.
if((process.env.HTTPS_PROXY||process.env.HTTP_PROXY)&&!process.execArgv.includes('--use-env-proxy')&&process.env.NODE_USE_ENV_PROXY!=='1'){
 if(Number(process.versions.node.split('.')[0])<24){console.error('A configured HTTP proxy requires Node 24 with --use-env-proxy for this connection check.');process.exit(1)}
 const result=spawnSync(process.execPath,['--use-env-proxy',fileURLToPath(import.meta.url)],{stdio:'inherit'});process.exit(result.status??1);
}
if(existsSync('.env.local'))process.loadEnvFile('.env.local');
const issues=publicEnvironmentIssues(process.env),config=parseSupabasePublicConfig(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
if(issues.length||!config.ok){console.error('Connection check blocked: configure the project root URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. No credentials were printed.');process.exitCode=1}
else{
 try{
  // The OpenAPI root requires a Secret Key on current Supabase gateways.
  // Probe a real private table without credentials beyond the Publishable Key.
  const response=await fetch(`${config.url}/rest/v1/vocabulary?select=id&limit=1`,{headers:{apikey:config.publishableKey},signal:AbortSignal.timeout(15000)});
  const result=await response.json().catch(()=>null);
  const expectedDenial=[401,403].includes(response.status)&&result?.code==='42501';
  if(!expectedDenial){console.error(response.ok?'Unexpected anonymous table access. Inspect private grants before owner tests.':`Data API returned HTTP ${response.status}; expected private-table denial was not confirmed.`);process.exitCode=1}
  else{
  console.log('Data API reached with the Publishable Key; anonymous vocabulary access denied (42501). Authenticated owner access and full RLS behavior remain untested.');
  const auth=await fetch(`${config.url}/auth/v1/settings`,{headers:{apikey:config.publishableKey},signal:AbortSignal.timeout(15000)});
  if(auth.ok){const settings=await auth.json();console.log(`Auth endpoint reached. Google provider: ${settings.external?.google===true?'enabled':'not enabled'}. Public signup: ${settings.disable_signup===true?'disabled':'not confirmed disabled'}.`)}
  else{console.error(`Auth settings returned HTTP ${auth.status}; OAuth configuration verification did not pass.`);process.exitCode=1}
  }
 }catch(error){const code=error?.cause?.code;console.error(['ECONNREFUSED','ENOTFOUND','ETIMEDOUT','CERT_HAS_EXPIRED','UNABLE_TO_VERIFY_LEAF_SIGNATURE'].includes(code)?`Data API check failed: ${code}. No credentials or response contents were printed.`:'Data API check failed. Verify project availability, public key, API settings and network connectivity. No credentials or response contents were printed.');process.exitCode=1}
}
