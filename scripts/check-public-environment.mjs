import {existsSync} from 'node:fs';
import {parseSupabasePublicConfig,publicEnvironmentIssues} from '../lib/supabase-config.ts';
const mode=process.argv[2]??process.env.NODE_ENV??'production';
for(const file of [`.env.${mode}.local`,'.env.local',`.env.${mode}`,'.env'])if(existsSync(file))process.loadEnvFile(file);
const issues=publicEnvironmentIssues(process.env);
if(issues.length){for(const issue of issues)console.error(issue);process.exitCode=1}
else{
 const config=parseSupabasePublicConfig(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
 console.log(config.ok?'Supabase public environment validated.':'Supabase public configuration incomplete; the private login gate remains closed.');
}
