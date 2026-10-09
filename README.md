# Kotoba — Private English & Japanese Learning

Project code and original course content are licensed under [MIT](LICENSE).
Anyone may fork, modify and redistribute them; contributions use pull requests.
See [contribution guidelines](CONTRIBUTING.md), [independent setup](docs/OPEN-SOURCE-SETUP.md)
and [security policy](SECURITY.md). Learning data and deployed owner access remain private.

Existing Next.js / TypeScript / Supabase / PWA application. Current package version is **2.6.0**, continuing the Version 13 / V2.5.2 foundation and its compatible mobile fixes. This is a single-owner personal system, not an open-registration SaaS.

The silver/graphite/blue UI now covers all workspaces, sign-in, dialogs and the update page. Shared course transitions retain learning state; native transitions gracefully fall back on constrained devices and reduced motion. Chromium mobile emulation, screenshots, recording and offline reload have been verified with an isolated simulated backend. Real owner/device acceptance remains separate. See [UI verification](docs/UI-UNIFICATION.md).

## Current source

- Japanese N5–N1 and English A1–C2 vocabulary layers and stable word IDs are preserved.
- SRS, Auth/RLS, IndexedDB and the revision-based offline sync engine are retained.
- The staged grammar/reading library has **150 grammar courses and 60 original articles**. Full V3 targets are not yet met; see [CONTENT-AUDIT.md](CONTENT-AUDIT.md).
- Production migrations **001–011** have user-supplied verification receipts. This update does not rerun or change them. Authenticated runtime readiness still protects curriculum persistence; a failed network or API cache check does not mean 010 must be deployed again.
- Compatible improvements cover shared review queues, timezone-aware statistics/streak, exact reading continuation, history/deep links, all-level dictionary search, System theme and lazy page loading.

Read [the V3 engineering audit](docs/V3-ENGINEERING-AUDIT.md), [current status](docs/CURRENT-STATUS.md), [content deployment instructions](docs/V3-CONTENT-EXPANSION.md) and [the original handoff](docs/CODEX-HANDOFF.md). Historical handoff version/count statements do not override current code or deployment evidence.

The follow-up [2.6 sync repair](docs/KOTOBA-2.6-SYNC-REPAIR.md) fixes corrected-error capture, background restoration and save retries. A reproduced PostgreSQL UUID cast failure requires the minimal **011_text_event_identity** compatibility patch. The owner has supplied successful production 011 read-only verification and reported mobile learning/sync/reload success; migrations 001–011 remain unchanged in this phone round. Node regression coverage is now **163 tests**. See [the phone checkpoint](docs/PHONE-EXPERIENCE-CHECKPOINT.md) for one-question practice, restored question IDs and device acceptance still pending.

See [the 2.6 checkpoint](docs/KOTOBA-2.6-CHECKPOINT.md) for mobile changes, grade counts, verification results and remaining device acceptance. The 2.6 content minimum is met; the complete 1,260/590 target is not.

## Local verification

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run content:audit
npm run build
```

Use the lockfile; do not upgrade dependencies as part of ordinary verification. If dependencies are already installed and inputs unchanged, use them. `npm run backend:check` performs a read-only connection/anonymous-denial check; it does not certify owner writes or every RLS policy.

## Environment and safety

Copy `.env.example` to ignored `.env.local`. Client initialization uses `NEXT_PUBLIC_SUPABASE_URL` (project root, not `/rest/v1`) and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Server/Edge secrets must never use `NEXT_PUBLIC_`, enter Git, browser code or logs. Do not send secrets in chat.

Keep production learning data and migration history intact. Do not rerun 001–010, disable RLS, reset the database or rewrite existing card IDs. Real-device login, offline/cross-device and PWA acceptance remains distinct from local tests. See [acceptance](docs/ACCEPTANCE.md) and [deployment](docs/DEPLOYMENT.md).
