-- Read-only catalog/ledger verification. This does NOT prove live Auth/CAPTCHA/SMTP.
select jsonb_build_object(
 'migration_013_recorded',exists(select 1 from supabase_migrations.schema_migrations where version='013'),
 'ordinary_accounts',(select count(*) from private.beta_members),
 'ordinary_auth_accounts',(select count(*) from auth.users u where u.id<>(select admin_user_id from private.beta_config)),
 'maximum',10,
 'capacity',(select capacity from private.beta_config),
 'registration_open',(select registration_open from private.beta_config),
 'owner_uid_preserved',exists(select 1 from private.beta_config c join private.app_owner o on o.user_id=c.admin_user_id),
 'owner_email_confirmed',exists(select 1 from private.beta_config c join auth.users u on u.id=c.admin_user_id where u.email_confirmed_at is not null),
 'owner_password_configured',exists(select 1 from private.beta_config c join auth.users u on u.id=c.admin_user_id where coalesce(u.encrypted_password,'')<>''),
 'slot_drift',exists(select 1 from auth.users u where u.id<>(select admin_user_id from private.beta_config) and not exists(select 1 from private.beta_members m where m.user_id=u.id)),
 'private_tables_rls',not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='private' and c.relname like 'beta_%' and c.relkind='r' and not c.relrowsecurity),
 'public_tables_rls',not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity),
 'hook_role_execute',has_function_privilege('supabase_auth_admin','private.before_user_created(jsonb)','execute'),
 'hook_browser_execute',has_function_privilege('anon','private.before_user_created(jsonb)','execute') or has_function_privilege('authenticated','private.before_user_created(jsonb)','execute'),
 'hook_browser_schema_access',has_schema_privilege('anon','private','usage') or has_schema_privilege('authenticated','private','usage'),
 'auth_insert_guard',exists(select 1 from pg_trigger where tgrelid='auth.users'::regclass and tgname='allow_private_owner_only' and tgenabled='O'),
 'admin_delete_guard',exists(select 1 from pg_trigger where tgrelid='auth.users'::regclass and tgname='protect_beta_admin' and tgenabled='O'),
 'private_buckets',(select count(*) from storage.buckets where id in ('personal-audio','personal-content','personal-backups') and not public)
) as migration_013_verification;
