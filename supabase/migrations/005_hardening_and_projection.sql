-- Allow growing personal archives; normalized history tables remain the backup source.
alter table public.user_progress drop constraint user_progress_state_check;
alter table public.user_progress add constraint bounded_personal_snapshot check(octet_length(state::text)<=16777216);
-- Never let client code change scheduled fields behind the scheduler.
revoke insert,update,delete on public.review_items from authenticated;
revoke insert,update,delete on public.sync_batches,public.client_id_map from authenticated;
-- Composite mistake ownership, retaining mistake memory after vocabulary removal.
alter table public.mistakes drop constraint mistakes_vocabulary_id_user_id_fkey;
alter table public.mistakes add constraint mistakes_vocabulary_owner foreign key(vocabulary_id,user_id) references public.vocabulary(id,user_id) on delete set null(vocabulary_id);
-- Stronger state shape guard without changing the public RPC contract.
create or replace function private.validate_personal_snapshot() returns trigger language plpgsql set search_path='' as $$begin
 if jsonb_typeof(new.state) is distinct from 'object' or new.state->>'version' is distinct from '2' or not new.state ?& array['profile','reviews','dictionary','reviewHistory','sentences','sessions','_clock','_deleted'] then raise exception 'Invalid personal snapshot';end if;return new;end;$$;
create trigger validate_personal_snapshot before insert or update of state on public.user_progress for each row execute function private.validate_personal_snapshot();
-- This helper is invoked by its trigger, never directly by a browser.
revoke all on function private.validate_personal_snapshot() from public,anon,authenticated;
-- No Realtime publication: foreground/focus/network events perform versioned sync.
