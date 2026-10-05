-- READ ONLY: inspect provenance clues and DDL hooks; do not call the function.
-- Supabase Dashboard > SQL Editor > New query > postgres.
select jsonb_build_object(
 'function',p.oid::regprocedure::text,
 'owner',pg_get_userbyid(p.proowner),
 'language',l.lanname,
 'return_type',pg_get_function_result(p.oid),
 'security_definer',p.prosecdef,
 'settings',p.proconfig,
 'comment',obj_description(p.oid,'pg_proc'),
 'definition',pg_get_functiondef(p.oid),
 'anon_execute',has_function_privilege('anon',p.oid,'EXECUTE'),
 'authenticated_execute',has_function_privilege('authenticated',p.oid,'EXECUTE'),
 'extension_membership',coalesce((
  select jsonb_agg(e.extname order by e.extname)
  from pg_catalog.pg_depend d join pg_catalog.pg_extension e on e.oid=d.refobjid
  where d.classid='pg_proc'::regclass and d.objid=p.oid
   and d.refclassid='pg_extension'::regclass and d.deptype='e'
 ),'[]'::jsonb),
 'event_triggers',coalesce((
  select jsonb_agg(jsonb_build_object(
   'name',t.evtname,'event',t.evtevent,'enabled',t.evtenabled,
   'tags',t.evttags,'owner',pg_get_userbyid(t.evtowner)
  ) order by t.evtname)
  from pg_catalog.pg_event_trigger t where t.evtfoid=p.oid
 ),'[]'::jsonb),
 'regular_triggers',coalesce((
  select jsonb_agg(jsonb_build_object(
   'name',t.tgname,'table',t.tgrelid::regclass::text,'enabled',t.tgenabled
  ) order by t.tgname)
  from pg_catalog.pg_trigger t where t.tgfoid=p.oid and not t.tgisinternal
 ),'[]'::jsonb)
) as rls_auto_enable_inspection
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid=p.pronamespace
join pg_catalog.pg_language l on l.oid=p.prolang
where n.nspname='public' and p.proname='rls_auto_enable'
 and p.pronargs=0 and p.prokind='f';
