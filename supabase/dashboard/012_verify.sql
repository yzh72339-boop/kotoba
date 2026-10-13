-- Read-only catalog inspection; does not perform owner CRUD or prove cross-device sync.
with checks as (
 select
 exists(select 1 from supabase_migrations.schema_migrations where version='012' and name='personal_context_cards') as recorded,
 coalesce((select relrowsecurity from pg_class where oid=to_regclass('public.personal_context_cards')),false) as card_rls,
 exists(select 1 from pg_policies where schemaname='public' and tablename='personal_context_cards' and cmd='ALL' and qual like '%auth.uid()%' and qual like '%is_private_owner()%' and with_check like '%auth.uid()%') as owner_policy,
 to_regprocedure('private.project_pre_context_state(uuid,jsonb)') is not null as prior_projection_preserved,
 to_regprocedure('public.personal_context_ready()') is not null as readiness_present,
 not has_schema_privilege('authenticated','private','USAGE') as helpers_hidden,
 exists(select 1 from pg_constraint where conrelid='public.vocabulary'::regclass and contype='u' and pg_get_constraintdef(oid) like '%user_id, language_code, term%') as vocabulary_unique_preserved,
 exists(select 1 from pg_constraint where conrelid='public.review_items'::regclass and conname='review_items_item_type_check' and pg_get_constraintdef(oid) like '%context%') as unified_target_ready
)
select jsonb_build_object('migration_012_recorded',recorded,'card_rls',card_rls,'owner_policy',owner_policy,'prior_projection_preserved',prior_projection_preserved,'readiness_present',readiness_present,'private_helpers_browser_access',not helpers_hidden,'vocabulary_unique_preserved',vocabulary_unique_preserved,'unified_target_ready',unified_target_ready,'problems',to_jsonb(array(select name from (values('012-not-recorded',recorded),('card-rls-missing',card_rls),('owner-policy-missing',owner_policy),('prior-projection-missing',prior_projection_preserved),('readiness-missing',readiness_present),('private-helpers-visible',helpers_hidden),('legacy-uniqueness-missing',vocabulary_unique_preserved),('context-target-missing',unified_target_ready)) t(name,ok) where not ok))) as migration_012_verification from checks;
