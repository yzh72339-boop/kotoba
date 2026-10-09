-- Run only after migrations 001–010 are verified. Do not execute another migration here.
begin;
set local lock_timeout='5s';
set local statement_timeout='120s';
do $deploy_011$
declare v_sql text:=$migration_011$
-- Compatibility repair only: retain client IDs and use their existing mapped UUID
-- for relational event keys when a mistake/study event has a textual ID.
-- No tables, rows, policies, review functions or migration 001–010 are changed.
do $repair_text_events$
declare
 v_oid regprocedure:=to_regprocedure('private.project_learning_state(uuid,jsonb)');
 v_definition text;
 v_mistake_old text:=$old$event_id:=(j->>'id')::uuid;$old$;
 v_mistake_new text:=$new$event_id:=case when j->>'id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then (j->>'id')::uuid else entity end;$new$;
 v_study_old text:=$old$(j->>'count')::int,(j->>'id')::uuid)$old$;
 v_study_new text:=$new$(j->>'count')::int,case when j->>'id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then (j->>'id')::uuid else entity end)$new$;
begin
 if v_oid is null then raise exception 'Missing private learning projection; stop';end if;
 select pg_get_functiondef(v_oid) into v_definition;
 if strpos(v_definition,v_mistake_new)>0 and strpos(v_definition,v_study_new)>0 then
  raise notice 'Text event compatibility already installed; no change';return;
 end if;
 if (length(v_definition)-length(replace(v_definition,v_mistake_old,'')))/length(v_mistake_old)<>1
  or (length(v_definition)-length(replace(v_definition,v_study_old,'')))/length(v_study_old)<>1 then
  raise exception 'Unexpected learning projection definition; stop without changes';
 end if;
 execute replace(replace(v_definition,v_mistake_old,v_mistake_new),v_study_old,v_study_new);
end;
$repair_text_events$;

$migration_011$;v_policies text;v_helper text;v_rows jsonb;v_after jsonb;
begin
 if exists(select 1 from supabase_migrations.schema_migrations m where m.version='011') then
  if not exists(select 1 from supabase_migrations.schema_migrations m where m.version='011' and m.name='text_event_identity' and m.statements=array[v_sql]) then
   raise exception 'Migration 011 already exists with different SQL; stop and inspect';
  end if;
  raise notice 'Migration 011 already recorded; no changes made';return;
 end if;
 if (select count(*) from supabase_migrations.schema_migrations m where m.version in ('001','002','003','004','005','006','007','008','009','010'))<>10 then
  raise exception 'Verified migrations 001–010 are required';end if;
 if to_regprocedure('private.project_learning_state(uuid,jsonb)') is null or to_regprocedure('public.content_library_ready()') is null then
  raise exception 'Expected 010 projection is missing; stop';end if;
 v_policies:=(select md5(coalesce(jsonb_agg(to_jsonb(p) order by p.schemaname,p.tablename,p.policyname)::text,'[]')) from pg_catalog.pg_policies p where p.schemaname in ('public','storage'));
 v_helper:=coalesce(pg_get_functiondef(to_regprocedure('public.rls_auto_enable()')),'');
 select jsonb_object_agg(c.relname,c.oid) into v_rows from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r';
 execute v_sql;
 if v_policies is distinct from (select md5(coalesce(jsonb_agg(to_jsonb(p) order by p.schemaname,p.tablename,p.policyname)::text,'[]')) from pg_catalog.pg_policies p where p.schemaname in ('public','storage')) then
  raise exception 'RLS policy changed; rollback';end if;
 if v_helper is distinct from coalesce(pg_get_functiondef(to_regprocedure('public.rls_auto_enable()')),'') then
  raise exception 'RLS helper changed; rollback';end if;
 select jsonb_object_agg(c.relname,c.oid) into v_after from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r';
 if v_rows is distinct from v_after then raise exception 'Existing tables changed; rollback';end if;
 insert into supabase_migrations.schema_migrations(version,name,statements) values('011','text_event_identity',array[v_sql]);
end;
$deploy_011$;
commit;
select version,name from supabase_migrations.schema_migrations order by version;
