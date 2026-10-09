-- Read-only account provisioning verification. Not a migration.
-- Run as postgres AFTER creating the private account in Auth Dashboard.
with owner as (
 select o.email,o.user_id from private.app_owner o where o.singleton
), matching_users as (
 select u.id,u.email_confirmed_at from auth.users u
 join owner o on lower(u.email)=o.email
)
select jsonb_build_object(
 'owner_configured',exists(select 1 from owner o where o.email='owner@example.com'),
 'owner_auth_users',(select count(*) from matching_users),
 'email_confirmed',exists(select 1 from matching_users u where u.email_confirmed_at is not null),
 'owner_uid_bound',exists(select 1 from owner o join matching_users u on u.id=o.user_id),
 'profile_created',exists(select 1 from public.profiles p join owner o on o.user_id=p.id),
 'languages',coalesce((
  select jsonb_agg(jsonb_build_object('language',l.language_code,'level',l.current_level,'primary',l.primary_language) order by l.language_code)
  from public.user_languages l join owner o on l.user_id=o.user_id
 ),'[]'::jsonb)
) as private_account_readiness;
