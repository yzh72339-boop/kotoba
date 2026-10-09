import {readFileSync, writeFileSync} from 'node:fs';

const root = new URL('../', import.meta.url);
const migration = readFileSync(new URL('supabase/migrations/002_personal_backend.sql', root), 'utf8').trim();
const email = process.env.ALLOWED_USER_EMAIL?.trim().toLowerCase();
if (!email || !/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email)) {
  throw new Error('Set ALLOWED_USER_EMAIL in the server environment before preparing 002.');
}
if (migration.includes('$migration_002$')) throw new Error('Migration delimiter collision.');
const literal = value => `'${value.replaceAll("'", "''")}'`;
const originalTables = ['languages', 'users', 'profiles', 'courses', 'lessons', 'vocabulary', 'grammar', 'reviews', 'study_sessions', 'user_progress', 'ai_conversations', 'ai_usage'].sort();
const renamed = ['profiles', 'vocabulary', 'grammar', 'reviews', 'study_sessions', 'ai_conversations'];
const created = [...migration.matchAll(/create table public\.(\w+)\s*\(/gi)].map(match => match[1]);
const expectedTables = [...originalTables.map(table => renamed.includes(table) ? `legacy_${table}` : table), ...created].sort();
if (expectedTables.length !== 41 || new Set(expectedTables).size !== 41) throw new Error('Unexpected 002 table inventory.');
const sqlArray = values => `array[${values.map(literal).join(',')}]`;

const sql = String.raw`-- Only migration 002. Run the WHOLE file once as postgres, after 001 passes.
begin;
set local lock_timeout='5s';
set local statement_timeout='120s';
do $deploy_002$
declare
 migration_sql text:=$migration_002$
${migration}
$migration_002$;
 expected_before text[]:=${sqlArray(originalTables)};
 expected_after text[]:=${sqlArray(expectedTables)};
 helper_oid oid;
 helper_before jsonb;
 event_before jsonb;
 legacy_before jsonb:='{}'::jsonb;
 legacy_after jsonb:='{}'::jsonb;
 t text;
 table_oid oid;
 row_count bigint;
begin
 perform pg_advisory_xact_lock(hashtext('kotoba-dashboard-migrations'));
 if current_user<>'postgres' then raise exception 'Use postgres in SQL Editor';end if;
 if current_setting('server_version_num')::integer<150000 then raise exception 'PostgreSQL 15+ required';end if;
 if to_regclass('supabase_migrations.schema_migrations') is null then
  raise exception 'Migration ledger is missing; stop and recheck';
 end if;
 if (select array_agg(version order by version) from supabase_migrations.schema_migrations) is distinct from array['001']
  or not exists(select 1 from supabase_migrations.schema_migrations where version='001' and name='kotoba') then
  raise exception 'Expected only verified migration 001; do not repeat or skip migrations';
 end if;
 if to_regnamespace('private') is not null then raise exception 'Unexpected private schema; stop and recheck';end if;
 if exists(select 1 from storage.buckets where id in ('personal-audio','personal-backups','personal-content')) then
  raise exception 'Managed bucket already exists; stop and recheck';
 end if;
 if not coalesce((select relrowsecurity from pg_catalog.pg_class where oid='storage.objects'::regclass),false) then
  raise exception 'Storage objects must already have RLS enabled';
 end if;
 if (select array_agg(c.relname::text order by c.relname::text) from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p')) is distinct from expected_before then
  raise exception 'Public table inventory differs from verified 001';
 end if;
 -- Freeze Auth writes and the original tables while preserving their identity.
 lock table auth.users in share row exclusive mode;
 lock table public.ai_conversations,public.ai_usage,public.courses,public.grammar,
  public.languages,public.lessons,public.profiles,public.reviews,public.study_sessions,
  public.user_progress,public.users,public.vocabulary in access exclusive mode;
 if exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind in ('r','p') and not c.relrowsecurity)
  or exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
   cross join (values('anon'),('authenticated')) r(role_name)
   cross join (values('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) p(privilege)
   where n.nspname='public' and c.relkind in ('r','p') and has_table_privilege(r.role_name,c.oid,p.privilege)) then
  raise exception 'Checkpoint 001 RLS or closed table privileges have changed';
 end if;
 if exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind in ('r','p') and not exists(
   select 1 from pg_catalog.pg_policies p where p.schemaname='public' and p.tablename=c.relname
    and p.policyname='stage_001_closed' and p.permissive='RESTRICTIVE' and p.cmd='ALL'
    and p.qual='false' and p.with_check='false' and 'anon'=any(p.roles) and 'authenticated'=any(p.roles))) then
  raise exception 'Checkpoint 001 closed policies have changed';
 end if;
 if (select count(*) from pg_catalog.pg_trigger where tgrelid='auth.users'::regclass and not tgisinternal)<>1
  or not exists(select 1 from pg_catalog.pg_trigger where tgrelid='auth.users'::regclass
   and tgname='on_auth_user_created' and tgfoid=to_regprocedure('public.create_user_profile()') and tgtype=5 and tgenabled='O') then
  raise exception 'Auth trigger inventory differs from verified 001';
 end if;
 helper_oid:=to_regprocedure('public.rls_auto_enable()');
 select to_jsonb(p) into helper_before from pg_catalog.pg_proc p where p.oid=helper_oid;
 select to_jsonb(e) into event_before from pg_catalog.pg_event_trigger e where e.evtname='ensure_rls';
 if helper_before is null or event_before is null
  or md5(helper_before::text) is distinct from (select substring(statements[2] from 'helper_catalog_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations where version='001')
  or md5(event_before::text) is distinct from (select substring(statements[2] from 'ensure_rls_catalog_md5=([a-f0-9]{32})') from supabase_migrations.schema_migrations where version='001') then
  raise exception 'Existing RLS helper differs from verified 001';
 end if;
 foreach t in array ${sqlArray(renamed)} loop
  table_oid:=to_regclass(format('public.%I',t))::oid;
  execute format('select count(*) from public.%I',t) into row_count;
  legacy_before:=legacy_before||jsonb_build_object('legacy_'||t,jsonb_build_object('oid',table_oid,'rows',row_count));
 end loop;

 execute migration_sql;
 perform public.configure_private_owner(${literal(email)});

 foreach t in array ${sqlArray(renamed)} loop
  table_oid:=to_regclass(format('public.%I','legacy_'||t))::oid;
  execute format('select count(*) from public.%I','legacy_'||t) into row_count;
  legacy_after:=legacy_after||jsonb_build_object('legacy_'||t,jsonb_build_object('oid',table_oid,'rows',row_count));
 end loop;
 if legacy_before is distinct from legacy_after then raise exception 'Legacy table identity or row count changed; rollback';end if;
 if (select array_agg(c.relname::text order by c.relname::text) from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p')) is distinct from expected_after then
  raise exception 'Unexpected table inventory after 002; rollback';
 end if;
 if exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind in ('r','p') and not c.relrowsecurity)
  or not (select relrowsecurity from pg_catalog.pg_class where oid='private.app_owner'::regclass) then
  raise exception 'A private application table lacks RLS; rollback';
 end if;
 if exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  cross join (values('anon'),('authenticated')) r(role_name)
  cross join (values('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) p(privilege)
  where ((n.nspname='public' and c.relkind in ('r','p')) or c.oid='private.app_owner'::regclass)
   and has_table_privilege(r.role_name,c.oid,p.privilege)) then
  raise exception 'Browser table privileges are not closed at checkpoint 002; rollback';
 end if;
 if exists(select 1 from storage.buckets where id in ('personal-audio','personal-backups','personal-content') and public)
  or (select count(*) from storage.buckets where id in ('personal-audio','personal-backups','personal-content'))<>3 then
  raise exception 'Managed buckets are missing or public; rollback';
 end if;
 if helper_before is distinct from (select to_jsonb(p) from pg_catalog.pg_proc p where p.oid=helper_oid)
  or event_before is distinct from (select to_jsonb(e) from pg_catalog.pg_event_trigger e where e.evtname='ensure_rls') then
  raise exception 'Existing RLS helper changed; rollback';
 end if;
 insert into supabase_migrations.schema_migrations(version,name,statements)
 values('002','personal_backend',array[
  migration_sql,
  format(E'-- helper_catalog_md5=%s; ensure_rls_catalog_md5=%s\n',md5(helper_before::text),md5(event_before::text)),
  format(E'-- legacy_oid_and_rows=%s\n',legacy_before::text),
  format(E'select public.configure_private_owner(%L);\n',${literal(email)})
 ]);
end;
$deploy_002$;
commit;
select version,name from supabase_migrations.schema_migrations order by version;
`;
writeFileSync(new URL('supabase/dashboard/002_deploy.sql', root), sql);
console.log('Prepared only 002_deploy.sql; no database connection or execution.');
