-- Safe emergency pause only: keeps seats, logins, learning data and sync.
begin;
update private.beta_config set registration_open=false where singleton;
commit;
select public.beta_signup_status();
