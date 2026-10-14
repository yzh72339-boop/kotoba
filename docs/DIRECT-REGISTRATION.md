# Direct registration checkpoint — 2026-10-14

The user explicitly superseded the earlier email-confirmation/CAPTCHA/SMTP requirement: use email/password direct signup. `NEXT_PUBLIC_AUTH_MODE=direct` skips the frontend CAPTCHA dependency, returns immediate signup sessions to the app and honestly disables mail-based recovery. Verified mode remains available via `NEXT_PUBLIC_AUTH_MODE=verified`. The Supabase server remains authoritative; the frontend cannot turn off its confirmation/CAPTCHA policies. Strong passwords and all admission/RLS/UID/queue/SRS fences remain unchanged. No new migration and no edits to 001–013.

217 Node tests and local actual GoTrue/PostgreSQL pass. The new Auth case disables SMTP completely and auto-confirms signup: 25 concurrent requests fill exactly ten seats including an existing account; eleventh rejected; sessions returned immediately; original admin UUID/data/login and member refresh preserved. Production build `kotoba-2.9.1-0f6bf1208a10` passes. Chromium 360/390/430px direct signup → immediate app → own settings/save → sign-out → other account → refresh passes, including duplicate submission, full-capacity login and honest recovery information. These fixtures do not test real email recovery. This is not production multi-user or real-device acceptance.

Next manual setup after publication: Supabase Authentication → Sign In / Providers → allow email signups and disable Confirm email; CAPTCHA remains disabled. Keep the protected Before User Created Hook and server rate limits. Sign in using the original admin password, verify old records, then Settings → 内测名额管理 → acknowledge the direct-mode configuration and 开放注册. No SQL/replayed migration, SMTP, domain or CAPTCHA Secret is required. Existing unconfirmed accounts, if any, require admin review; do not repeatedly register or delete a real account to fix a configuration mismatch. Sites public access and latest deployment build are defined by the native receipt, not historical notes.

Without email confirmation this does not prove mailbox ownership; without a mail provider, automatic password-recovery email is not advertised. Already signed-in users retain password change. Latest verified aggregate remains zero ordinary accounts, ten remaining and registration closed; actual server settings and direct signup still need live owner/new-user acceptance.

Prior checkpoints below are historical.

---

## Exact setup

1. Use the newly published frontend or `npm run build` with ignored `.env.local` containing public Supabase URL/key and `NEXT_PUBLIC_AUTH_MODE=direct`. The optional hCaptcha Site Key is unused in this mode. No server secrets in the client.
2. Supabase Dashboard → Authentication → Sign In / Providers: Email enabled, Allow new users to sign up enabled, **Confirm email OFF**. Attack Protection → CAPTCHA protection OFF. Save. Keep anonymous/SMS/unused third-party account creation disabled and existing password requirements/rate limits; keep the protected `private.before_user_created` Hook enabled.
3. No SQL or account recreation. Existing 013 auto-confirmed users naturally satisfy `email_confirmed_at`; this timestamp in direct mode means Auth activation, not proof of mailbox ownership. Admin remains trusted by its immutable original UUID; entering the same email never elevates a new UUID.
4. Original admin signs in using its password; check existing notes/SRS and refresh. In My → 内测名额管理, acknowledge the direct setup, then 开放注册. Server requires the original password-authenticated JWT and never accepts capacity above ten. Pausing new signup leaves existing access intact.
5. Verify a real normal account opens learning immediately, saves/restores its own state and cannot see original admin records. At ten users reject the eleventh; test concurrency in an isolated reviewed environment. Physical phones, installed PWA, second device and production RLS writes remain separate acceptance.

## Configuration mismatch / recovery

If direct signup yields a user without a session, display the real mismatch: server still requires confirmation; do not claim a confirmation email was sent or pretend signup completed. The account may occupy a seat, so review it before retrying. If Auth still enables CAPTCHA, display server-configuration feedback instead of demanding a hidden widget. No fake CAPTCHA token or browser-made admin identity is used.

Mail-based recovery is disabled in direct UI. Already logged-in users can change password via existing settings/session verification. A lost password without mail service requires a separately authenticated administrator-assisted recovery process; no claim that such a new recovery feature was implemented. Restoring `verified` mode requires its actual mail/CAPTCHA setup. Registration can be paused from the existing admin panel or 013_pause_registration.sql without deleting learning data.

## Latest production read-only check — 2026-10-14

Auth settings HTTP 200: email provider enabled, signup not disabled, `mailer_autoconfirm=false` (confirmation still ON). Aggregate status HTTP 200: `enabled=false`, `open=false`, total/remaining ten. Direct signup is therefore not yet enabled on production; administrator must change Confirm email and then open admission. No privileged production writes were performed.
