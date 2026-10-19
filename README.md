> Current continuation: **3.1.0-preview.12 — N3/N1 contexts**. +24 vocabulary cards/+4 full grammar/+2 readers/+30 explained practice items. Current **999 words /216 grammar /100 readers**; all975 prior word payloads and310 complete courses preserved. Full target gap1534. See [scope and verification limits](docs/JAPANESE-CONTEXT-BATCH-10.md). Earlier checkpoints are historical.

> Current continuation: **3.1.0-preview.11 — A1/B1 foundations in context**. +24 distinct vocabulary cards/+4 complete grammar/+2 readers/+30 explained practice items. Current **975 words /212 grammar /98 readers**; all951 prior word payloads and304 courses preserved. Full target gap1540. See [scope, preservation and verification limits](docs/ENGLISH-FOUNDATIONS-BATCH-09.md). Earlier checkpoints are historical.

> Current continuation: **3.1.0-preview.10 — contextual vocabulary and complete units**. +24 distinct word cards/+4 grammar/+2 readers/+30 explained practice items. Current **951 words /208 grammar /96 readers**; old927 word payloads and298 courses preserved. Full target gap1546. See [scope, preservation and verification limits](docs/CONTEXT-VOCABULARY-BATCH-08.md). Earlier checkpoints are historical.

> Current continuation: **3.1.0-preview.9 — contextual reader search and N1/C1 units**. WanaKana aliases and actual wink/Kuroshiro source forms now connect to article vocabulary search; existing IDs/SRS/sync retained. +6 full grammar/+3 readers/+45 explained practice items. Current **927 words /204 grammar /94 readers**; full target gap1552. See [scope, open-source usage and verification limits](docs/READER-SEARCH-CONTEXT-V3.1.md). Earlier checkpoints are historical.

> Current continuation: **3.1.0-preview.8 — N5/A2 foundations in context**. +8 complete grammar/+4 readings/+60 explained practice items; preserve all277 prior documents and927 cards. Current **927 words /198 grammar /91 readings**; full target gap1561. Existing daily IDs, mobile practice, local language workers, SRS and offline/sync reused. See [scope and verification limits](docs/V3-CURRICULUM-BATCH-06.md). Earlier checkpoints are historical.

> Current continuation: **3.1.0-preview.7 — linked N3/B2 contextual units**. +6 complete grammar/+3 readings/+45 explained practice items; all268 prior documents and927 cards preserved. Current **927 words /190 grammar /87 readings**; full target gap1573. Existing mobile, local language workers, stable daily IDs and SRS/sync reused. See [scope and verification limits](docs/V3-CURRICULUM-BATCH-05.md). Earlier checkpoints are historical.

> Current continuation: **3.1.0-preview.6 — N2 contextual curriculum and private lookup recovery**. +3 complete grammar/+2 readings/+25 practice items; preserve all263 prior documents and927 cards. Current **927 words /184 grammar /84 readings**; full target gap1,582. Private lookup IDs now restore from the same-account/same-language dictionary. See [scope and verification limits](docs/V3-CURRICULUM-BATCH-04.md). Earlier checkpoints are historical.

> Current continuation: **3.1.0-preview.5 — reading vocabulary and personal snapshots**. Actual source-matched vocabulary, private word matches, state filters, existing article-scoped SRS and retained original snapshot links. No dependency, database, scheduler or quota change. Current content remains927 words /181 grammar /82 reading. See [scope and verification limits](docs/READER-VOCABULARY-V3.1.md). Earlier checkpoints are historical.

> Current continuation: **3.1.0-preview.4 — dictionary lookup and truthful learning evidence**. Local romaji/kana aliases, opt-in English lemma lookup, original query history and actual review/source counts. No SRS, storage, Auth/RLS, quota or database changes. Current content remains **927 words /181 grammar /82 readings**. See [scope and verification limits](docs/DICTIONARY-LOOKUP-V3.1.md). Earlier checkpoints below are historical.

> Current continuation: **3.1.0-preview.3 — optional Japanese reading analysis**. Preserves the 3.0.1 canonical recovery fix and all learning/account data. Kuroshiro/Kuromoji run only on explicit request; dictionary assets are optional and cached after use. See [integration and verification limits](docs/JAPANESE-READING-INTEGRATION-V3.1.md). Earlier checkpoints below are historical.

> Current engineering release **3.0.1 — PWA update-system repair**. Based on the latest preserved 3.1 preview source, with no feature/data rollback. Independent server metadata, page/controller/waiting identities, save-first acknowledged activation and automatic checks are implemented. Production Sites and GitHub CI are separate; CI is not an automatic Sites publisher. See [mechanism, deployment limits and actual acceptance](docs/PWA-UPDATE-SYSTEM-3.0.1.md). Prior checkpoints below are historical.

> Current **3.1.0-preview.2**: ordered prerequisite learning and protected daily task IDs, +4 complete N4 grammar /+2 linked readings. **927 words /181 grammar /82 readings**. Full 1,260/590 library remains unfinished. Run existing `npm ci`, `npm run dev`; static production `npm run build` produces `out/`. No dependency upgrade or SQL required. See [batch scope and verification](docs/V3-CURRICULUM-BATCH-03.md).

> Current: **3.1.0-preview.1** — local Japanese input and English reader morphology via WanaKana/winkNLP, retained original SRS/sync/permissions. 927 words /177 full grammar /80 full readings; complete 1,260/590 curriculum still pending. See [integration and license review](docs/OPEN-SOURCE-REVIEW-V3.1.md), [curriculum batch](docs/V3-CURRICULUM-BATCH-02.md) and the latest deployment receipt.

# Kotoba 3.0 content preview

Current release `3.0.0-preview.1` adds 12 full N2/N1 grammar topics, 5 original readings and 85 explained exercises/questions. Existing 224 course documents, all 927 vocabulary IDs and learning data remain compatible. All 166 current grammar topics have a reading link; total readings 75. This is a staged V3 preview: full 1,260/590 targets and real AI/service work remain unfinished.

Run `npm ci`, configure ignored `.env.local` from `.env.example`, then `npm run dev` or `npm run build` → static `out/`. Keep `NEXT_PUBLIC_AUTH_MODE=direct` for the current ten-user beta. No new SQL or dependency upgrade. Original admin and user-isolated learning/sync remain preserved. See [batch scope, checks and next breakpoint](docs/V3-CURRICULUM-BATCH-01.md), [current state](docs/CURRENT-STATUS.md) and [per-level audit](CONTENT-AUDIT.md). Historical version notes below are superseded by current state and deployment receipts.

---

# Kotoba V2.9.1 — direct registration

Latest user requirement: email/password direct signup, no CAPTCHA/confirmation mail/SMTP setup. Default `.env.example` selects `NEXT_PUBLIC_AUTH_MODE=direct`; verified mode remains supported. Ten ordinary-user seats, original administrator UUID/data, member RLS, SRS and account-scoped offline/sync remain unchanged. No production migration is needed or replayed.

The frontend handles immediate sessions and exposes honest mail-recovery limitations. Supabase must be configured to disable Confirm email and CAPTCHA; only the original password-authenticated admin can open database registration from Settings. Do not claim signup is live while status is closed. Read [current direct setup and actual evidence](docs/DIRECT-REGISTRATION.md). The older verified-email setup below is historical unless selecting verified mode.

---

# Kotoba V2.9.1 Limited Beta

Email/password registration, confirmation/recovery, ten ordinary-user seats and compatible multi-user learning isolation are implemented. The original administrator UUID and learning records are preserved and excluded from the ten seats. **Production registration is not open or verified.** 013 starts closed; CAPTCHA, Auth Hook, SMTP and hosted multi-user checks require the staged setup.

Run `npm ci`, copy `.env.example` to ignored `.env.local` and configure only public build values. `npm run dev`; production static export: `npm run build` → `out/`. Never put server secrets in public environment variables or Git.

Checks: `npm run typecheck`, `npm run lint`, `npm test`, `npm run content:audit`, `npm run build`. Disposable Docker checks: `npm run test:beta:backend` and `npm run test:beta:auth`. Browser fixtures: `npm run qa:beta:mobile` against a loopback dev server with a public hCaptcha test Site Key; they are not live security proof.

See [actual acceptance and remaining work](docs/LIMITED-BETA-ACCEPTANCE.md) and [one-stage-at-a-time deployment/rollback](docs/LIMITED-BETA-DEPLOYMENT.md). Do not replay 001–012. Existing content: 927 vocabulary / 154 grammar / 70 reading; full expansion remains pending. Prior owner-only/version notes below are historical.

---

# Kotoba 2.9 preview

**2026-10-13 update recovery fix:** preview build names are recognized in Settings and the standalone updater. Build/auth/HTTP/installation failures no longer all say to reconnect. Confirmed activation keeps existing learning storage; see [verification and phone acceptance limits](docs/UPDATE-RECOVERY-2026-10-13.md).

**2026-10-13:** user supplied real 012 catalog verification with no problems; live read-only Data API/Auth connection confirmed. Owner write/SRS/two-device/PWA acceptance remains pending. Do not rerun migrations. See [production readiness](docs/PRODUCTION-READINESS-2026-10-13.md).

A personal English/Japanese learning app, built on the existing Next.js/Supabase/PWA project. Current preview adds personal text import, versioned reading, manual context recall cards, listening/local shadowing, and 5/10/20-minute tasks. Existing learning records and qualified course IDs remain compatible.

Run `npm ci`, configure the public Supabase URL/publishable key using `.env.example`, then `npm run dev` (or `npm run build` for the existing static hosting export). Server secrets never go in public environment variables. **Do not rerun historical database migrations.** Context cards require reviewed additive 012; text imports use existing snapshot sync. See [scope, safe deployment and acceptance boundaries](docs/KOTOBA-2.9-IMPLEMENTATION.md).

Local check commands: `npm run typecheck`, `npm run lint`, `npm test`, `npm run content:audit`, `npm run build`; isolated SQL: `node --import tsx scripts/test-personal-context-backend.mjs`. The SQL test uses a disposable Docker database, never production. Physical device/owner/second-device acceptance remains separate. Current version is a preview, not full 2.9 completion.

# Kotoba — Private English & Japanese Learning

Project code and original course content are licensed under [MIT](LICENSE).
Anyone may fork, modify and redistribute them; contributions use pull requests.
See [contribution guidelines](CONTRIBUTING.md), [independent setup](docs/OPEN-SOURCE-SETUP.md)
and [security policy](SECURITY.md). Learning data and deployed owner access remain private.

Existing Next.js / TypeScript / Supabase / PWA application. Current package version is **2.8.1**, continuing the Version 13 / V2.5.2 foundation and its compatible mobile fixes. This is a single-owner personal system, not an open-registration SaaS.

The silver/graphite/blue UI now covers all workspaces, sign-in, dialogs and the update page. Shared course transitions retain learning state; native transitions gracefully fall back on constrained devices and reduced motion. Chromium mobile emulation, screenshots, recording and offline reload have been verified with an isolated simulated backend. Real owner/device acceptance remains separate. See [UI verification](docs/UI-UNIFICATION.md).

## V2.8.1 — inference, concession and cause

Five more existing N2 grammar topics now link to two original readings: 発送の通知、その先は and 「最終版」はどれだったか. Ten additive contrast exercises distinguish strong inference, subjective conviction, contrary results, explanations and regret. Existing questions, all 927 cards and their schedules stay compatible.

Current content: **154 grammar / 70 readings**, N2 **54 / 19**; 144 grammar topics have reading links and 10 remain unlinked. Full targets still lack 1,626 documents. Reading time estimates for this batch use an explicit 200 Japanese characters/minute rule (4 / 5 minutes), not personal measured results. See [batch 03 and its acceptance limits](docs/N2-CONTENT-BATCH-03.md). 2.8 course expansion and the full roadmap remain incomplete.

## V2.8.0 — linked N2 course batch

Connect five existing N2 grammar topics to two new original readings: gradual change / rule-following, and information channels / representative examples / expanded scope. Ten additive contrast exercises preserve all old question IDs, answers and 927 vocabulary cards. The existing daily planner, mobile reader, collection, review and offline download paths consume these documents without a new schema or migration.

Current content: **154 grammar / 68 readings**, including N2 **54 / 17**. Grammar with explicit reading links rises from 134 to 139; 15 topics remain unlinked. **186 Node tests**, TypeScript, zero-warning Lint and production build pass. Full content targets remain incomplete by 1,628 documents; strict target checking still fails intentionally. See [this batch and verification boundary](docs/N2-CONTENT-BATCH-02.md). This is the first 2.8 course-linkage batch, not completion of the full roadmap.

## V2.7.2 engineering closeout

Explicit reload/close now requests confirmation while local saving is unfinished or failed. Locally saved/offline records and cloud retries can leave normally; some mobile browsers may suppress the warning. Active daily readings also derive their shared grammar expression from the saved plan ID; paused/free browsing keeps the explicit clicked-grammar hint. No storage protocol or owner access changes. See [current task-state table and acceptance boundary](docs/KOTOBA-2.7-CLOSEOUT.md) and [continued development plan](docs/Kotoba-Development-Plan-2026-10-12.md).

## V2.7.1 content update

Four new N2 grammar/reading topic units cover 〜次第, 〜次第で, 〜に先立って and 〜をきっかけに. Each has four example sentences, five explained grammar exercises and one original 731–747-character reading with five explained comprehension questions. All 40 new N2 cards occur in these readings. See [batch checkpoint](docs/N2-CONTENT-BATCH-01.md).

## V2.7 update

- **927 vocabulary cards**: 260 original contextual additions, including 40 N2 cards in the latest batch, preserving all 667 existing cards and IDs. [Graded vocabulary audit](VOCABULARY-AUDIT.md). This is a graded supplement, not an exhaustive dictionary.
- Phone dictionary list and word sheets, actual due counts, content-language speech/source handling, prior-day completion correction, and linked foundation/N2 readings.
- **182 Node tests**, TypeScript, zero-warning Lint, content/vocabulary audits and production build pass. [2.7 scope and verification limits](docs/KOTOBA-2.7-CHECKPOINT.md); [changelog](CHANGELOG.md).
- Chromium mobile emulation and offline fixture tests do not certify real owner/device/cross-device/installed-PWA acceptance.

## Current source

- Japanese N5–N1 and English A1–C2 vocabulary layers and stable word IDs are preserved.
- SRS, Auth/RLS, IndexedDB and the revision-based offline sync engine are retained.
- The staged grammar/reading library has **154 grammar courses and 70 original articles**. Full V3 targets are not yet met; see [CONTENT-AUDIT.md](CONTENT-AUDIT.md).
- Production migrations **001–011** have user-supplied verification receipts. This update does not rerun or change them. Authenticated runtime readiness still protects curriculum persistence; a failed network or API cache check does not mean 010 must be deployed again.
- Compatible improvements cover shared review queues, timezone-aware statistics/streak, exact reading continuation, history/deep links, all-level dictionary search, System theme and lazy page loading.

Read [the V3 engineering audit](docs/V3-ENGINEERING-AUDIT.md), [current status](docs/CURRENT-STATUS.md), [content deployment instructions](docs/V3-CONTENT-EXPANSION.md) and [the original handoff](docs/CODEX-HANDOFF.md). Historical handoff version/count statements do not override current code or deployment evidence.

The follow-up [2.6 sync repair](docs/KOTOBA-2.6-SYNC-REPAIR.md) fixes corrected-error capture, background restoration and save retries. A reproduced PostgreSQL UUID cast failure requires the minimal **011_text_event_identity** compatibility patch. The owner has supplied successful production 011 read-only verification and reported mobile learning/sync/reload success; migrations 001–011 remain unchanged in this phone round. That historical sync/phone checkpoint had **163 tests**. See [the phone checkpoint](docs/PHONE-EXPERIENCE-CHECKPOINT.md) for one-question practice, restored question IDs and device acceptance still pending.

See [the 2.6 checkpoint](docs/KOTOBA-2.6-CHECKPOINT.md) for mobile changes, grade counts, verification results and remaining device acceptance. The 2.6 content minimum is met; the complete 1,260/590 target is not.

## Local verification

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run content:audit
npm run vocabulary:audit
npm run build
```

Use the lockfile; do not upgrade dependencies as part of ordinary verification. If dependencies are already installed and inputs unchanged, use them. `npm run backend:check` performs a read-only connection/anonymous-denial check; it does not certify owner writes or every RLS policy.

## Environment and safety

Copy `.env.example` to ignored `.env.local`. Client initialization uses `NEXT_PUBLIC_SUPABASE_URL` (project root, not `/rest/v1`) and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Server/Edge secrets must never use `NEXT_PUBLIC_`, enter Git, browser code or logs. Do not send secrets in chat.

Keep production learning data and migration history intact. Do not rerun 001–010, disable RLS, reset the database or rewrite existing card IDs. Real-device login, offline/cross-device and PWA acceptance remains distinct from local tests. See [acceptance](docs/ACCEPTANCE.md) and [deployment](docs/DEPLOYMENT.md).
