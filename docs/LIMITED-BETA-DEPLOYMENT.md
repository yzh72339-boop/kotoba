# Current mode: direct email/password registration

The latest user request removes confirmation/CAPTCHA/SMTP requirements. Follow [DIRECT-REGISTRATION.md](DIRECT-REGISTRATION.md) instead. Do not rerun 013; keep its fences. The older four-stage verified-email deployment below applies only when choosing `NEXT_PUBLIC_AUTH_MODE=verified`.

---

# Kotoba 2.9.1 Limited Beta — staged deployment

This is an additive upgrade from the actual 2.9 preview. **User-supplied real 013 verification now passes; do not rerun 013 or 001–012.** Hook enabled/Postgres and email confirmation are user-reported; exact Hook target, actual mail/CAPTCHA flows, Edge deployment and public hosting still require verification. No production migration or write was executed by the assistant. The public hCaptcha Site Key is supplied for the frontend build; its Secret stays only in Supabase. Keep new registration closed until this checklist has real evidence. Do not rerun 001–012 or send any password/token/secret in chat.

## Stage 1 — administrator continuity and 013 only

1. In the current Kotoba app, synchronize and export a local backup. Keep the existing Supabase project and Auth account. Never delete/recreate the administrator or copy its data into a new user.
2. Supabase Dashboard → Authentication → Users: locate the original account and privately record its UUID. Compare it with the UUID-bound `private.app_owner` using SQL Editor. Do not determine admin status from editable metadata or a client email.
3. Confirm the existing email/password login works. If the original identity is Google-only, keep Google enabled and its migration entry available. Request password recovery for the **existing email** (or Authentication → Users → existing account → Send password recovery), open it in the same browser, set a strong password, then sign out and actually sign in with email/password. Verify the UUID, old records and one refresh. This sets the password on the same account; do not sign up a replacement. The SQL activation RPC also requires the signed JWT's `amr` to include `password`.
4. SQL Editor → New query: execute **only** [013_deploy.sql](../supabase/dashboard/013_deploy.sql). It runs one transaction, refuses an unbound/unconfirmed admin or more than ten existing ordinary accounts, preserves IDs/history and seeds every existing ordinary account into the ledger. Identical replay skips; differing replay stops. It keeps `enabled=false` and `registration_open=false`. It adds no invitation requirement.
5. New query: execute [013_verify.sql](../supabase/dashboard/013_verify.sql). Expect admin UUID preserved, confirmed email, seat/Auth counts equal and ≤10, no drift, private/public RLS true, Hook-role execute true, browser Hook execute/schema access false, both guards true, three private buckets. `owner_password_configured` should be true before activation. Catalog results alone do not verify the installed Hook or real login.

**Stop at this stage if any result differs.** Do not execute historical migrations, reset the database, release seats manually or delete existing users to make the verification pass.

## Stage 2 — Supabase Auth, CAPTCHA and mail

Only continue after Stage 1's real result is checked.

- Authentication → Hooks → Before User Created → select **Postgres function**, schema `private`, function `before_user_created`. URI: `pg-functions://postgres/private/before_user_created`. Enable and save. `supabase_auth_admin` has only protected execution of this function, not browser access to its schema/tables. The final `auth.users` INSERT trigger still enforces capacity if another creation path skips the Hook.
- Authentication → Sign In / Providers → Email: enable email/password and email confirmation. Allow new signups only after 013 is installed; leave the database registration switch closed during configuration. Set minimum password length **12** with lowercase/uppercase/digits/symbols. Disable anonymous, phone/SMS and unused third-party providers. Disable Google **only after the original UUID has actually signed in by password**. Existing ordinary users remain admitted independently of whether new registration is open.
- Authentication → URL Configuration: Site URL is the real deployed origin. Allow exact callback URLs `https://YOUR-HOST/auth/confirm/` and `https://YOUR-HOST/auth/reset/` (plus local test origin if needed). Current app host is `https://kotoba-language-studio.cleric-motif-0n.chatgpt.site`; its Sites audience remains a separate setting. Never use the Supabase `/rest/v1/` endpoint as app origin.
- hCaptcha Dashboard: create a site and add the deployed hostname. The **Site Key** is public: configure `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` in the project's build environment and rebuild. The **hCaptcha Secret** goes only in Supabase Authentication → Security / CAPTCHA → hCaptcha → Secret. Enable CAPTCHA. Never put this Secret in Next public variables, Git or chat. Without the public widget key, registration and the UI activation button fail closed. Test a direct Auth signup with no/invalid CAPTCHA token; it must fail. Browser-fixture tests do not verify hCaptcha itself.
- Authentication → Rate Limits: configure signup/sign-in IP limits and email resend/recovery limits appropriate to ten accounts (for example signup 10/IP/hour, sign-in 30/IP/5 minutes, email sends 30/hour, resend interval ≥60 seconds where supported). Dashboard controls differ by Supabase plan/version; use the supported Auth limits, do not invent a client-only substitute. Confirm actual 429 responses and recovery availability. Local concurrency tests deliberately raise fixture limits to isolate the seat invariant.
- Authentication → Email / SMTP settings: Supabase default mail service may deliver only to project-team emails. For arbitrary new users, configure custom SMTP. Obtain host/port/username/password from your mail provider, verify the sender domain and SPF/DKIM/DMARC there, and put the SMTP password **only in Supabase SMTP settings**. It is not an app `NEXT_PUBLIC_*` variable. Verify email confirmation, recovery and resend on a real non-team mailbox before activating registration.
- Local CLI configuration in `supabase/config.toml` reflects email/password + Hook, disabled Google/SMS/anonymous. It does **not** update Dashboard production settings automatically. Apply 013 before starting local Auth with this Hook enabled.

## Stage 3 — authenticated Edge Functions and public app

Deploy the existing `ai-tutor` and `backup` functions with their updated member verifier, plus the new `beta-admin`. Use Supabase Dashboard → Edge Functions or your authenticated Supabase CLI:

```bash
supabase functions deploy ai-tutor --project-ref YOUR_PROJECT_REF --no-verify-jwt
supabase functions deploy backup --project-ref YOUR_PROJECT_REF --no-verify-jwt
supabase functions deploy beta-admin --project-ref YOUR_PROJECT_REF --no-verify-jwt
```

`--no-verify-jwt` is needed for the project's existing Publishable Key flow; each handler itself calls Auth `getUser()` and protected learning-access RPCs. `beta-admin` additionally checks the trusted administrator UUID. It must never be made unauthenticated in code. Configure Edge secrets in Dashboard → Edge Functions → Secrets:

| Variable | Source / safe location |
| --- | --- |
| `PROJECT_PUBLISHABLE_KEY` | Supabase project's public Publishable Key; Edge environment |
| `SITE_ORIGIN` | Exact deployed HTTPS origin; Edge CORS allowlist |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase supplies the legacy service role in Edge environment; server only, never browser/Git/chat |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | Model provider console; Edge Secrets only, optional until AI is enabled |

The old `ALLOWED_USER_EMAIL` is not a beta permission mechanism. Admin management cannot read other people's learning records. Auth deletion is a hard delete only after explicit confirmation; if files/FKs prevent deletion, the operation fails and the seat remains occupied. Review/delete that **test account's** Storage files in Dashboard before retrying; never just decrement a counter or delete the ledger entry.

Build/run the existing app normally. Auth pages are static-exported directory routes (`/login/`, `/register/`, `/auth/reset/`, `/auth/confirm/`) so callbacks work on static hosting. No new Next server or service key is needed. Existing hash learning URLs remain unchanged.

The currently hosted Sites audience is `custom`; code publication does not make it public. After database/Auth/CAPTCHA readiness is verified, Sites sharing must change to **Public** so anyone can open `/register/` without ChatGPT invitation/sign-in. Public hosting grants no learning-data permission. This step is distinct from opening Supabase registration.

## Stage 4 — activation and real acceptance

1. Sign in by password as the original administrator; verify old progress again. Settings → 内测名额管理: check the configuration acknowledgement and choose 开放注册. The server requires a confirmed original UUID, a configured password and password-authenticated JWT; capacity can never exceed 10. The initial acknowledgement is an operational checklist, not proof of external CAPTCHA/SMTP configuration.
2. From a normal/incognito browser, register a real non-admin email, confirm email and sign in. Check the account count increases by one, the admin remains excluded and no private admin history is visible.
3. Verify the tenth succeeds and the eleventh fails, including >20 simultaneous requests in a reviewed test environment. Do not spam real SMTP or create/delete production accounts automatically for testing. Unverified users count; duplicate signup/resend does not allocate an additional seat.
4. At full capacity, test existing login/recovery/password change. Reclaim an explicit unverified **test** account in management, confirm Auth row is gone and the seat opens once. Repeat/retry must not release a second seat.
5. Test A/B/admin RLS and Storage with real access tokens kept in local tools, not chat. Admin cannot read A/B notes/SRS/AI messages. Test account switching, downloaded material, offline save, reconnect, second device, Android Chrome, Mobile Safari and installed PWA separately.
6. Test actual model service if enabled: authenticated bounded context, idempotent request cache, 5/minute and 30/UTC-day server quotas, no anonymous invocation. No real AI request was made by fixture tests.

Record real evidence before declaring this production beta open.

## Rollback / emergency pause

- Run [013_pause_registration.sql](../supabase/dashboard/013_pause_registration.sql) to stop **new** accounts. Existing logins/recovery/learning/sync and all seats/data remain intact. Also disable Auth new signup in Dashboard if needed; do not disable normal login.
- Revert the app/Edge source via Git after confirming owner access. Keep additive 013 schema/ledger and its guards; do not drop columns/tables, replay 001–012, restore the old global grammar uniqueness constraint over multiple users, or delete beta accounts. Old 2.9 UI is owner-only, so rolling the UI back blocks ordinary app access while retaining their cloud data.
- A full security shutdown can set `enabled=false, registration_open=false` in one reviewed SQL transaction; admin remains allowed, ordinary private data stays preserved. This intentionally suspends ordinary learning access; it is not the default rollback.
- Original definitions/policies are archived in RLS-protected `private.beta_upgrade_backup` for forensic review. Do not blindly execute them after users have joined; old owner-only semantics and shared-content constraints require a separately reviewed downgrade.
