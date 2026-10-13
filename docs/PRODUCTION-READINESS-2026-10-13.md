# Production readiness — 2026-10-13

- User supplied successful real SQL Editor migration 012 verification: recorded, owner RLS/policy, readiness function, unified target, prior projector and vocabulary uniqueness; problems empty; private helpers hidden. See PRODUCTION-MIGRATION-012-EVIDENCE.json. No SQL was executed by this environment.
- Read-only live Publishable Key probe reached Supabase Data API and Auth. Anonymous vocabulary read denied with PostgreSQL 42501. Google provider enabled; global signup disabling not confirmed by the Auth settings response. Existing owner signup guard/RLS are retained; this probe does not prove full registration behavior.
- Local implementation, 206 tests, type/lint/build and prior browser emulation evidence remain unchanged; reuse the verified static export.
- Sites publication follows this checkpoint; inspect the native deployment receipt for actual status/version. Preserve existing custom audience.
- Still pending: actual owner login and context-card write/review/readback, unauthorized-account rejection, physical Android/iOS/PWA and second-device consistency.

## Owner acceptance after publication

1. Open /api/app-update.html, check/apply the preview update without clearing IndexedDB; settings must show 2.9.0-preview.1.
2. Import a short ja/en text, fill manual gloss, add a context card, review once, refresh and verify one review with the same source.
3. Edit/delete the original; verify retained source snapshot remains readable.
4. On a second device, log into the same private account and confirm text/card/progress. Local recording metadata is not the audio file: missing-file notices are expected until media is transferred.
5. Offline test: cached text/card → one review → reconnect → one cloud history entry; confirm trustworthy save/sync labels.

Report failures with the on-screen message; do not share passwords, tokens or secret keys in chat. No old migrations should be rerun.

A local scope regression was fixed before final publication: article/budget reviews do not inherit an unfinished or completed daily plan card filter, and cannot advance that daily session. No scheduling/state protocol changes.
