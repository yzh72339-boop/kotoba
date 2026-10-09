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
