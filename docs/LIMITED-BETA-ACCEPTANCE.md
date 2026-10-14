# Direct registration checkpoint — 2026-10-14

The user explicitly superseded the earlier email-confirmation/CAPTCHA/SMTP requirement: use email/password direct signup. `NEXT_PUBLIC_AUTH_MODE=direct` skips the frontend CAPTCHA dependency, returns immediate signup sessions to the app and honestly disables mail-based recovery. Verified mode remains available via `NEXT_PUBLIC_AUTH_MODE=verified`. The Supabase server remains authoritative; the frontend cannot turn off its confirmation/CAPTCHA policies. Strong passwords and all admission/RLS/UID/queue/SRS fences remain unchanged. No new migration and no edits to 001–013.

217 Node tests and local actual GoTrue/PostgreSQL pass. The new Auth case disables SMTP completely and auto-confirms signup: 25 concurrent requests fill exactly ten seats including an existing account; eleventh rejected; sessions returned immediately; original admin UUID/data/login and member refresh preserved. Production build `kotoba-2.9.1-0f6bf1208a10` passes. Chromium 360/390/430px direct signup → immediate app → own settings/save → sign-out → other account → refresh passes, including duplicate submission, full-capacity login and honest recovery information. These fixtures do not test real email recovery. This is not production multi-user or real-device acceptance.

Next manual setup after publication: Supabase Authentication → Sign In / Providers → allow email signups and disable Confirm email; CAPTCHA remains disabled. Keep the protected Before User Created Hook and server rate limits. Sign in using the original admin password, verify old records, then Settings → 内测名额管理 → acknowledge the direct-mode configuration and 开放注册. No SQL/replayed migration, SMTP, domain or CAPTCHA Secret is required. Existing unconfirmed accounts, if any, require admin review; do not repeatedly register or delete a real account to fix a configuration mismatch. Sites public access and latest deployment build are defined by the native receipt, not historical notes.

Without email confirmation this does not prove mailbox ownership; without a mail provider, automatic password-recovery email is not advertised. Already signed-in users retain password change. Latest verified aggregate remains zero ordinary accounts, ten remaining and registration closed; actual server settings and direct signup still need live owner/new-user acceptance.

Prior checkpoints below are historical.

---

# Production 013 and CAPTCHA build checkpoint — 2026-10-13

User-supplied real 013 catalog/ledger verification passes: trusted admin UUID and configured password preserved, zero ordinary accounts, capacity ten, no drift, protected Hook ACLs, RLS enabled and registration closed. Read-only production aggregate RPC also returns HTTP 200, ten remaining seats and registration disabled. See PRODUCTION-MIGRATION-013-EVIDENCE.json. The Hook screenshot shows enabled/Postgres, but exact target was obscured; email confirmation is user-reported enabled. Do not replay any migration.

The provided public hCaptcha Site Key is configured in ignored local build environment, not committed. Production build `kotoba-2.9.1-21724cfb3545` embeds the supplied public widget key; no hCaptcha Secret was received or stored. Registration remains closed. Next operational step after this frontend publication: privately configure hCaptcha Secret in Supabase Auth and enable CAPTCHA, then verify actual admin sign-in. Custom SMTP/non-team verification, Edge deployment, public hosting and genuine multi-user/device acceptance remain pending. Local widget tests are simulated and do not prove CAPTCHA service acceptance. Keep the original admin and all learning records.

Previous checkpoints below are historical.

---

# Kotoba V2.9.1 Limited Beta — implementation and acceptance

Date: 2026-10-13. Baseline Sites source `3355c5b` / public source `003db7a`. Branch: `feature/2-9-1-limited-beta`. No production database write, historical migration replay, dependency upgrade or learning-engine rewrite.

## Implemented

- Email/password login, public registration route, confirmation, recovery and password update; shared silver/blue mobile UI. CAPTCHA uses Supabase Auth validation; missing public Site Key fails registration closed. Input validation, non-enumerating errors, immediate duplicate-submit lock.
- Additive 013 defaults registration closed. Trusted original admin UUID excluded; existing ordinary Auth accounts backfilled into finite unique seats 1–10. Config row lock and deferred Auth FK allocate in the same Auth INSERT transaction. Rollback frees allocations; committed hard deletion cascades once. Original admin deletion blocked.
- Before User Created Hook is a protected early check, not a separate reservation. Actual GoTrue invokes the Hook before its Auth-creation transaction; the INSERT guard remains the authoritative atomic fence. Every creation path reaching Auth INSERT is fenced, including privileged API creation. No count-then-register or post-creation deletion workaround.
- Minimal admin aggregate/accounts/reclamation panel, confirmed original UUID and password-authenticated session required to open. Ordinary users have no management access. Hard deletion failure retains the seat. No admin bypass of personal-learning RLS.
- Member authorization, user/project-scoped IndexedDB, fallback state, leases and queues; original admin legacy cache retained. Account switching remounts learning state, stale asynchronous work cancels and snapshot submissions pin the verified user's JWT. Foreground/BFCache identity checks prevent stale-user display. Private downloaded URLs are never served from an account-independent service-worker cache.
- Private learning RLS/RPC/Storage fences retained and adapted to admitted users. User-projected grammar/article/listening copies gain ownership; known shared course seeds remain read-only. Existing IDs preserved. Same-title private grammar uniqueness now includes owner; parent references checked.
- Member-authenticated AI/backup functions and new admin deletion function; service-side AI quota 5/minute and 30/UTC-day. No browser service key or paid model call. Core SRS and snapshot/CAS sync protocol remain unchanged.

## Actual local checks

216/216 Node tests pass; TypeScript and zero-warning ESLint pass. Disposable PostgreSQL 17 tests and actual local GoTrue v2.184.0 + PostgreSQL + in-memory SMTP tests pass. Each exercises 25 concurrent requests: exactly ten ordinary Auth users including the existing member; eleventh denied. Real fixture mail failure rolls back both user and seat. At capacity, verification/login/refresh/recovery/password change still work. Admin password migration preserves the UUID and old learning snapshot; no production admin password was changed.

Chromium emulation at 360/390/430px passes registration validation, simulated CAPTCHA, duplicate-submit prevention, full-capacity login/recovery, account-switch isolation, refresh restoration, old-admin cache/queue retention, admin UI, dark/reduced-motion combinations and no horizontal overflow. This is fixture UI validation, not physical devices or real CAPTCHA/SMTP.

Production static build passes: `kotoba-2.9.1-ef5109edd393`. Exported `/register/`, `/login/`, `/auth/reset/`, `/auth/confirm/` directory routes exist. Compiled Chromium daily review → grammar → reading → collect → explained practice → complete → refreshed home passes, including duplicate review/completion protection. Real compiled service-worker update checks at 360/390/430px preserve isolated IndexedDB, queued state, downloaded sentinel and session; repeat checks and offline errors are correctly classified. These do not verify a physical installed PWA. See generated delivery reports. SQL catalog evidence is exported table-by-table in `rls-catalog.json`. Executed RLS checks cover A/B/admin SELECT, INSERT, UPDATE, DELETE, parent references, SRS RPC, private projected content and Storage prefixes; catalog review alone is not presented as production RLS proof.

## Acceptance boundaries

| Requirement | Evidence / status |
| --- | --- |
| Admin old identity/data and password login | Local actual Auth + PG pass; production unverified |
| Ordinary users 1 / 10 / 11 and >20 concurrency | Local actual Auth + PG pass; production unverified |
| Failed signup / unverified email seat behavior | SMTP failure rollback + unconfirmed seat/no access pass locally |
| Full-capacity login / recovery / password update | Actual local Auth pass |
| Safe reclaim / retry / replacement / admin protection | Actual local Auth and SQL pass |
| A/B/admin private data / RPC / Storage isolation | Disposable PG pass; real hosted tokens unverified |
| Local account switch / refresh / legacy data | Chromium fixtures pass |
| Mobile registration/login | Chromium widths pass; Android/iOS devices unverified |
| Installed PWA / real offline reconnect / second device | Production/physical acceptance unverified |
| SRS and course compatibility | Existing Node suite + SQL SRS/idempotent sync pass |
| AI model invocation | Auth/quota code + SQL checks; actual paid model unverified |
| 001–012 compatibility and identical 013 replay | Disposable PG pass; production 013 not executed |

## Production readiness and next breakpoint

Read-only existing-project probes reached Supabase Auth/Data API; anonymous private vocabulary access was denied. The beta-status RPC returned 404/PGRST202 (not available in the exposed schema cache); this does not prove the catalog state by itself. Google remains enabled in the production Auth settings. Production 013/Hook/CAPTCHA/custom SMTP/Edge deployment/public hosting and authenticated multi-user acceptance are **not completed**.

Follow [the staged checklist](LIMITED-BETA-DEPLOYMENT.md). Current manual stage only: synchronize/export the original admin, verify same-UUID password login, apply `supabase/dashboard/013_deploy.sql` once, then run `013_verify.sql` and inspect results. Stop before Auth/provider/public-signup activation until that real result passes. Do not share any secret in chat. Pause rollback closes new registrations without deleting users, slots or learning data; historical owner-only rollback needs review and is not a destructive SQL reset.

Content unchanged: 927 vocabulary cards, 154 complete grammar topics, 70 readings. Long-term targets remain incomplete (1,106 grammar and 520 readings remaining). This release is a locally verified implementation, not a claim that production Limited Beta is open.
