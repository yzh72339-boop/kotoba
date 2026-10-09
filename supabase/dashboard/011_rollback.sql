-- Emergency rollback only, after explicit operator review. NOT part of normal deployment.
-- Restores the old UUID-only behavior; textual-event synchronization will fail again.
-- Leaves every row, client ID, policy and migration history entry intact.
begin;
set local lock_timeout='5s';
set local statement_timeout='120s';
do $repair_text_events$
declare
 v_oid regprocedure:=to_regprocedure('private.project_learning_state(uuid,jsonb)');
 v_definition text;
 v_mistake_old text:=$old$event_id:=case when j->>'id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then (j->>'id')::uuid else entity end;$old$;
 v_mistake_new text:=$new$event_id:=(j->>'id')::uuid;$new$;
 v_study_old text:=$old$(j->>'count')::int,case when j->>'id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then (j->>'id')::uuid else entity end)$old$;
 v_study_new text:=$new$(j->>'count')::int,(j->>'id')::uuid)$new$;
begin
 if v_oid is null then raise exception 'Missing private learning projection; stop';end if;
 select pg_get_functiondef(v_oid) into v_definition;
 if strpos(v_definition,v_mistake_new)>0 and strpos(v_definition,v_study_new)>0 then
  raise notice 'Original UUID-only projection already restored; no change';return;
 end if;
 if (length(v_definition)-length(replace(v_definition,v_mistake_old,'')))/length(v_mistake_old)<>1
  or (length(v_definition)-length(replace(v_definition,v_study_old,'')))/length(v_study_old)<>1 then
  raise exception 'Unexpected learning projection definition; stop without changes';
 end if;
 execute replace(replace(v_definition,v_mistake_old,v_mistake_new),v_study_old,v_study_new);
end;
$repair_text_events$;

commit;
