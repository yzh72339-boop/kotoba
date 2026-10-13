# Production 013 and CAPTCHA build checkpoint — 2026-10-13

User-supplied real 013 catalog/ledger verification passes: trusted admin UUID and configured password preserved, zero ordinary accounts, capacity ten, no drift, protected Hook ACLs, RLS enabled and registration closed. Read-only production aggregate RPC also returns HTTP 200, ten remaining seats and registration disabled. See PRODUCTION-MIGRATION-013-EVIDENCE.json. The Hook screenshot shows enabled/Postgres, but exact target was obscured; email confirmation is user-reported enabled. Do not replay any migration.

The provided public hCaptcha Site Key is configured in ignored local build environment, not committed. Production build `kotoba-2.9.1-21724cfb3545` embeds the supplied public widget key; no hCaptcha Secret was received or stored. Registration remains closed. Next operational step after this frontend publication: privately configure hCaptcha Secret in Supabase Auth and enable CAPTCHA, then verify actual admin sign-in. Custom SMTP/non-team verification, Edge deployment, public hosting and genuine multi-user/device acceptance remain pending. Local widget tests are simulated and do not prove CAPTCHA service acceptance. Keep the original admin and all learning records.

Previous checkpoints below are historical.

---

# Current: V2.9.1 Limited Beta implementation — 2026-10-13

Branch `feature/2-9-1-limited-beta`, based on 2.9 preview. Email/password/confirmation/recovery, max ten ordinary accounts excluding trusted original admin UUID, atomic admission/deletion, multi-user RLS and local/queue isolation are implemented. Migration 013 is additive and defaults closed; 001–012 are unchanged. No production SQL/Auth/provider setting was modified.

216 Node tests, typecheck, zero-warning lint, disposable PG and real local GoTrue/SMTP concurrency/rollback/recovery tests pass. 360/390/430px account-flow simulation passes. Final build/compiled learning/PWA evidence is in delivery reports. Production owner/RLS, SMTP/CAPTCHA, second device, physical mobile/PWA and paid AI remain unverified. Read [acceptance](LIMITED-BETA-ACCEPTANCE.md) and [staged setup](LIMITED-BETA-DEPLOYMENT.md); current manual breakpoint is original admin continuity + 013 deploy/verify only. Latest hosting receipt, not older historical text, defines the deployed site version.

Content unchanged: 927 cards /154 grammar /70 reading. Prior checkpoints below are historical.

---

# Update recovery checkpoint — 2026-10-13

Fixed rejection of `2.9.0-preview.1` build IDs in the standalone updater and Settings, plus misleading blanket network errors. 209 Node tests, type/lint/build and real-worker loopback Chromium update flows at 360/390/430px pass, including explicit confirmation, other-window blocking and retained storage/download fixtures. No production SQL or learning protocol changed. The exact new production version comes from the native deployment receipt. Physical owner/PWA acceptance remains pending. See [update recovery evidence and next check](UPDATE-RECOVERY-2026-10-13.md).

The previous production checkpoint and older notes below are historical.

# Production checkpoint — 2026-10-13

Migration **012 catalog verification passed in real Supabase**, based on the user's SQL Editor result. Live read-only Data API/Auth connectivity also passed; anonymous vocabulary access is denied (42501). This does not verify authenticated owner writes, SRS replay or cross-device consistency. 2.9 remains a preview. Publication of the verified static export follows this checkpoint, preserving the existing custom audience. See [production evidence and current owner acceptance](PRODUCTION-READINESS-2026-10-13.md). No production SQL was executed here.

The 2026-10-12 notes below describe the prior checkpoint; their “012 not deployed” status is superseded by the evidence above.

---

# V2.9.0-preview.1 — personal study workspaces (2026-10-12)

Personal UTF-8 text import/versioned reading, manual context cards in the existing SRS, listening/recording workspace and adjustable 5/10/20-minute tasks are implemented. This is a **preview**, not a declaration of complete production/device acceptance. Context creation requires additive migration **012**, which has only been tested in disposable PostgreSQL; historical 001–011 remain unchanged. Text imports work with existing snapshot storage. No AI scoring, streaming, auto-audio alignment or automatic recording uploads were added.

Current local checks: **206 Node tests**, TypeScript, zero-warning Lint, vocabulary/content audits and static production build pass. Six ja/en × 360/390/430 context workflows pass with source return, duplicate save/rating and snapshot restoration. Six listening/budget workflows pass with actual audio decoding and synthetic microphone encoding/storage/replay; **not** physical microphone or real voice quality. Existing core learning regression is separately recorded in the delivery.

Qualified content remains **927 vocabulary / 154 grammar / 70 reading** (the preceding local 2.8.1 added two N2 readings and ten contrast exercises). Personal materials/cards are not counted as qualified curriculum. Full target gap remains **1,626**; strict target checking still fails. Actual owner, production 012/RLS, second-device, physical Android/iOS and installed-PWA update acceptance are **unverified**. Last confirmed live site is 2.8.0/version 25; this preview has not been deployed to that website.

See [implementation, current deployment step and exact remaining acceptance](KOTOBA-2.9-IMPLEMENTATION.md).

The following checkpoints are historical.

---

# V2.8.1 — N2 inference and cause (2026-10-12)

Baseline Sites 8628c0a / GitHub 756df8c, package 2.8.0. This batch reuses 5 more N2 grammar IDs, adds 2 original readings and 10 explained contrast exercises. All 927 vocabulary cards and original question identities/answers stay compatible. Current totals: **927 vocabulary / 154 grammar / 70 readings**; N2 **210 / 54 / 19**. Explicit grammar-reading coverage: **144**; unlinked: **10**. Full target gap: **1626**; every grade still meets its own phase minimum.

TypeScript, zero-warning Lint, 186 Node tests, content/vocabulary audits and production build pass. Seven linked mobile combinations, current daily 3/3 flow, refresh/source/SRS restoration, strict offline save labels and simulated reconnect pass. Current checks and mobile evidence are recorded in [batch 03](N2-CONTENT-BATCH-03.md), separately from physical device/owner/second-device/installed-PWA acceptance. No Auth/RLS, SRS, sync protocol, dependencies or migrations changed. 2.8 and the full course target remain incomplete.

The following checkpoints are historical.

---

# V2.8.0 — N2 linked courses (2026-10-12)

Baseline Sites 089681e / GitHub 5f16eb2, package 2.7.2. This first 2.8 batch reuses 5 N2 grammar IDs, adds 2 original readings and 10 contrast exercises, and preserves all old prompts/answers/card payloads. Current totals: **927 vocabulary / 154 grammar / 68 reading**; N2 **210 / 54 / 17**. Explicit grammar-reading coverage: **139**, unlinked **15**. Full target gap: **1628**; phase coverage remains met.

186 Node tests, TypeScript, zero-warning Lint, content/vocabulary audits and production build pass. Current isolated mobile/offline/recording evidence is recorded in [batch 02](N2-CONTENT-BATCH-02.md) and its delivery. Real owner/RLS writes, devices, second-device and installed-PWA update remain unverified. No migrations, Auth/RLS, SRS, storage/sync protocol or dependency changes. See the updated roadmap for the next exact batch; 2.8/RC/full targets are not declared complete.

The following checkpoints are historical.

---

# V2.7.2 — engineering closeout (2026-10-12)

Baseline 0572968 / f4da3be, package 2.7.1. Current patch 2.7.2 adds an explicit reload/close warning for unfinished local saving and improves the save-state wording. No storage/sync protocol, scheduler, owner, Auth/RLS, course ID or migration changes. Content remains **927 / 154 / 66**; first-stage grade coverage is met, full targets still lack 1,630 documents.

182 Node tests, TypeScript, zero-warning Lint and production build pass. Current browser/recording/publication evidence is recorded in the closeout delivery; physical owner/Android/iOS/IME/safe-area/second-device/installed-PWA checks remain separately unverified. A warning can be suppressed by a browser or OS process termination.

Read [the requirement state table and next breakpoint](KOTOBA-2.7-CLOSEOUT.md) and [the adopted development plan](Kotoba-Development-Plan-2026-10-12.md). The following checkpoints are historical.

---

# V2.7.1 — N2 practical content batch (2026-10-12)

Current totals: **927 vocabulary cards / 154 complete grammar topics / 66 readings**. This batch adds 40 distinct N2 words, four N2 grammar topics and four linked readings. Every new word has an actual occurrence in its associated reading; each unit has five explained grammar questions and five explained comprehension questions. N2 totals: **210 / 54 / 15**. The original 667 and prior 220 contextual cards retain their IDs and payloads.

180 Node tests, TypeScript, Lint, content/vocabulary audits and production build pass. Current mobile and publication evidence is recorded in the batch checkpoint/external delivery, distinct from earlier 2.7 validation. Real owner/device/second-device/installed-PWA acceptance remains unverified. No production SQL, Auth/RLS/SRS or sync changes.

See [N2 batch checkpoint](N2-CONTENT-BATCH-01.md). The following checkpoints are historical.

---

# V2.7 — current source checkpoint (2026-10-09)

Package 2.7.0; branch feature/kotoba-2-7. Silver/graphite/blue is the only current visual system. **887 vocabulary cards (+220), 150 grammar, 62 readings (+2)**. Every supported grade meets the phase minimum. Full curriculum still lacks 1,638 documents; vocabulary is not exhaustive.

178 Node tests, TypeScript, zero-warning ESLint and production build pass; content/vocabulary audit errors and content length warnings are zero. Full Chromium phone matrix and core/offline fixture workflow pass; final release evidence is recorded in the delivery. Real Supabase read-only connectivity/anonymous denial were rechecked. Production owner CRUD/RLS, second-device, installed PWA and physical mobile tests remain unverified.

No migrations 001–011, Auth/RLS, SRS semantics or sync protocol changes. New lexical content is additive and all original 667 payloads/IDs are hash-guarded. See [2.7 checkpoint](KOTOBA-2.7-CHECKPOINT.md), [changelog](../CHANGELOG.md) and [word counts](../VOCABULARY-AUDIT.md).

The following 2.6 and earlier checkpoints are historical, superseded by this section.

---

# Latest UI acceptance — 2026-10-09

This section supersedes historical UI/test counts below. Package remains 2.6.0.
Silver / graphite / blue replaces violet across the app and update page.
170/170 Node tests, TypeScript, zero-warning ESLint and production build pass.
45 Chromium phone emulation checks (15 routes × 360/390/430) pass without overflow or undersized visible buttons. The daily review → grammar → reading → results → home flow, refresh recovery, rapid navigation, Back, note editor in a shorter viewport, reading collection, wrong-answer explanation, actual local SW offline shell/IndexedDB article/note restoration and reconnection to a simulated backend pass.
These are NOT real owner/RLS/cross-device/iOS/Android installation or physical frame-rate tests.
Content stays 667 vocabulary / 150 grammar / 60 reading; quality audit has zero errors and zero length warnings. Complete V3 targets still lack 1,640 units; --require-targets fails as expected.
No production SQL or data changes; migrations 001–011, Auth/owner/RLS, SRS and sync protocol preserved.
See UI-UNIFICATION.md and UI-SILVER-CHECKPOINT.md for scope, artifacts and release steps.

---

# Kotoba — Current source and verification status

Updated 2026-10-09. Package version: **2.6.0**. Compatible V3 development is underway; the full V3 library and production/mobile acceptance are **not complete**.

The retained foundation includes private owner Auth/RLS, vocabulary for every supported JLPT/CEFR level, the existing SRS algorithm, IndexedDB offline persistence, revision/idempotency sync, personal notes, audio/speaking records, AI provider, PWA and responsive layouts. No production data has been deleted or reset.

The staged library contains **150 grammar courses / 60 original reading articles**. Full content targets still have a 1,640-document gap. See CONTENT-AUDIT.md and V3-CONTENT-EXPANSION.md.

The current engineering update fixes shared review counts/queue ordering, cross-level scheduled-card retention, timezone/DST statistics, visible study time, exact reading resumption, navigation history, dictionary scope/search, System theme and AI client validation/timeout. Noninitial pages load on demand. Full details and verification limits are in V3-ENGINEERING-AUDIT.md.

## Whole-app UI — current checkpoint

All App routes, private sign-in, portals, controls and the independent update page now use the shared ink/violet system. The conditional route theme was removed. Reader Light/Dark/Sepia settings remain. **165/165 tests PASS**; real viewport/device acceptance remains unverified. See [unified UI checkpoint](UI-UNIFICATION.md). Earlier pilot limits and version counts below are historical; the user explicitly requested this full rollout.

## Expressive UI pilot — current checkpoint

Today and the active daily learning flow now share an ink/violet visual language, actual course hero, stronger question/answer/feedback hierarchy, measured footer spacing and device-aware effects. **165/165 Node tests PASS**. No library/data/auth/sync/migration changes. See [UI pilot](UI-EXPERIENCE-PILOT.md). **Before/after mobile screenshots and browser interaction acceptance remain unavailable/unverified**, so this design has not been extended to other workspaces. Earlier test totals below are historical.

## Phone-first update — current checkpoint

**163/163 Node tests PASS**. Phone grammar/reading practice shows one question, retains its stable question ID across restore, and displays feedback before explicit continuation. Library search is directly reachable; mobile parent navigation remains selected; new daily progress correctly shows three steps while old four-step archives restore. Footer spacing uses its measured height, including multiline/safe-area content. See [phone checkpoint](PHONE-EXPERIENCE-CHECKPOINT.md). Content remains 150/60; no new migration is needed.

**Production 011**: the owner supplied a successful deployment list and verification (`problems: []`, private helper browser access false, three private buckets); exact receipt saved. Owner also reported success for the mobile learning/sync/reload step. Physical offline/PWA/second-device/viewport acceptance remains pending.

## 2.6 follow-up — current verification

Reading errors remain collectable after correction; background/bfcache return restores visible-time tracking and synchronization; local/cloud save retry feedback no longer reports synced with pending operations. **159/159 Node tests, TypeScript and Lint PASS**, stage content audit PASS. No content count change.

Isolated PostgreSQL reproduced textual mistake/study IDs failing UUID projection. The minimal additive **011_text_event_identity** repair is prepared and tested (including repetition and emergency rollback); **production 011 is now recorded and read-only verified by the owner receipt**. Existing migrations 001–010, RLS, owner, scheduler, client IDs and records are unchanged. See [deployment steps and acceptance breakpoint](KOTOBA-2.6-SYNC-REPAIR.md). Owner/device/offline/second-device acceptance is still pending.

## Database and production

- Production **001–009**: recorded and user-supplied verification results showed `problems: []`.
- **010**: production deployment and read-only verification confirmed by the owner's receipt (`problems: []`, three private buckets, private helpers inaccessible to browsers). A subsequent real API probe recognized the readiness RPC and denied anonymous execution (42501). Owner learning write/sync acceptance remains pending; the live owner-authenticated readiness check is retained.
- The current read-only connectivity check reached the real Supabase Data API. Anonymous vocabulary access was denied (42501); Google Provider was enabled.
- Public signup is not confirmed disabled in Auth settings. The database signup guard/private owner fences remain intact. Confirm the existing owner works before changing that Dashboard setting.
- Owner read/write, current cross-device state and real PWA/browser flows have not been re-certified by the worker. User's earlier success reports remain historical evidence, not a substitute for new acceptance.
- AI server/Edge deployment and real model calls remain operator-dependent; no API secrets are available here.

## Current 2.6 verification

The 2.6 Node regression suite has **155/155 PASS**. TypeScript, ESLint and stage content audit PASS; isolated PostgreSQL 17 migration compatibility / owner fences / identity / idempotency tests PASS. Production build evidence and device limits are in [KOTOBA-2.6-CHECKPOINT.md](KOTOBA-2.6-CHECKPOINT.md). All following version-specific numbers are historical checkpoints.

## Historical verification

Version 13 baseline: **113 tests**, TypeScript, Lint and production build passed. The mobile core round adds 15 targeted regressions: **128/128 tests, TypeScript, ESLint and production build PASS**. Isolated PostgreSQL compatibility/RLS tests also passed. Initial JS is 351 kB; lesson bodies remain lazily fetched. Do not quote older 69/69 reports as current verification.

No database/RLS/Auth/scheduler migration changes were made. Existing data/state/backup versions and vocabulary IDs remain compatible. Browser rendering/device acceptance is still required. No available browser QA tool or owner login credential exists in this execution environment.

## Installed-app update correction

The owner reported an old course screen, fixed 2.5.2 label and no update prompt. Production source version 9 was checked directly: the shell matched the local build and the catalog contained 81 documents. This does not establish which URL/build the owner's device runs. Added explicit Settings update checks, foreground/reconnect checks, active-worker build identification and save/error handling. No cache, IndexedDB, login or production learning data is reset. The foundation version remains 2.5.2; the full V3 library is not complete.

Update regression suite: 7/7 PASS; complete Node suite: 108/108 PASS. TypeScript and ESLint passed. No database SQL or production records were modified by this patch.

### Independent installed-app recovery

A screenshot still showed the old Settings version label and no update button after version 10 publication. A separate network-only page is now provided at `/api/app-update.html`, using the existing Service Worker API-path exclusion rather than changing private access. It requests a fresh worker, verifies the downloaded build, requires the user to confirm synchronization, and refuses recovery activation while another same-origin window is open. It never reads, resets or deletes learning storage or credentials. A newer build may activate normally once old windows close. Build `2.5.2-24ecb5392d52`; full regression suite 113/113 PASS; production build (including type validation) and ESLint PASS. Actual Android/iOS activation remains device acceptance, not a claimed test result.

### Learn layout revision

Owner feedback identified an oversized introductory title/level panel and generic units on mobile. Learn now offers a compact language/level header, a primary session continuation, real module destinations/counts and actual next grammar/unfinished reading links. Level selection is a bottom sheet with an explicit active-session restriction, rather than a select that triggers a late error toast. Existing content, profile persistence and review behavior are retained. Responsive CSS uses existing tokens with a single mobile list and a two-column desktop grid. Automated checks do not replace owner-device visual acceptance.

The owner subsequently requested unrestricted level changes. Learn now allows switching at any time, including during an unfinished daily session. Both current and per-language level preferences are persisted through the existing sync flow; session completion and review records are retained.

## Mobile core learning round (source baseline Version 13)

- Daily grammar/reading steps select complete current-grade documents and pin stable IDs in existing private notes. A genuinely empty grade falls back explicitly to retained basic courses; a failed catalog request does not imply empty content. Any-time level switching, pause/resume, schedules and history remain intact. Today/Learn foreground continuation, due reviews and current-grade material.
- Grammar now has persisted lesson/examples/practice sections, checked answers and adjacent explanations, individual/all wrong-question retries, and a mobile notes sheet. Reading retains draft answers, attempt phase, visible-only duration, lookups, saved words and viewed grammar, with wrong-answer retry that preserves history.
- Reader preserves paragraph-relative anchors across screen sizes and retains legacy absolute offsets. Opening lookup/grammar/appearance/note sheets cannot write scroll-lock changes into reading progress. Close restores focus/position without navigating away; note drafts, reader settings and paragraph translations use existing personal storage.
- Local saving, saved/offline, pending/cloud syncing, cloud failure, fallback storage and local failure are distinct. Readiness separates checking, network, login, denied owner, offline capability, configuration and actually unrecognized RPC. It no longer treats every failure as missing migration 010. Foreground/reconnect synchronization waits for the local save chain. Offline startup reuses only the same project-bound owner already authorized by the existing AuthGate, avoiding an expired-token refresh blocking local learning; online Auth/RLS validation is unchanged.
- Mobile CSS covers 360–430px, safe-area padding, full-viewport/keyboard resizing and orientation. Sheets stay above an overlay keyboard; navigation/capture/session/update controls hide during keyboard editing. Long titles, examples and options wrap; input text is at least 16px. Session padding reserves space for wrapped instructions and safe areas. Existing PWA save-before-update and network-only recovery page are retained.
- Added four complete grammar points and four linked original readings for previously empty **N4, N3, A1, A2** grades. Each grammar has four examples/four exercises; each reading has 3–4 explained questions, aligned translations, existing vocabulary IDs and real grammar links. Vocabulary remains **667 cards**. Full target remains **1,260 grammar + 590 reading**; no claim of full V3 completion.

Verification: **128/128 Node tests PASS**, including 15 new mobile-state/content-offline regressions; TypeScript, ESLint, content audit and production build PASS. Content audit: 89 complete units, zero errors, zero length warnings. Disposable local PostgreSQL 17 accepted mobile notes/drafts/session pins/reading anchors and passed distinct identities, idempotency and non-owner/anonymous RLS checks. **No production migrations or records were modified.**

Not verified: real owner login/session, device rendering at 360/375/390/412/430px, Android Chrome/iOS Safari keyboard/rotation, owner-authenticated offline/reconnect/cross-device synchronization or installed-worker activation. No owner session or browser-control/device tool is available. Existing responsive audit retains every requested width and recognizes the new Chinese daily CTA, but was not executed. Automated state tests/build do not replace device acceptance.

Next device check: open the new build → Learn → choose N4/N3/A1/A2 → open a full grammar → enter a note, answer/check/retry → finish → open its related reading → lookup/save word → answer → refresh/resume → download a page → go offline → return online and sync → open the same owner account on another device. Keep the independent update recovery entry; never clear learning data as an update workaround.


## Mobile learning cycle — latest checkpoint

The Version 14 source (`6a577f2`) was the actual baseline, retaining 71 grammar / 18 reading documents and 128 passing tests. Version 13 remains historical. This round adds 11 focused regressions: **139/139 Node tests, TypeScript, ESLint and content audit PASS**. Production build **PASS**; PWA build `kotoba-2.5.2-e5433a157ecb`, initial JS 353 kB. Publication is tracked in the native Sites version ledger; do not infer owner/device acceptance from the build.

- Daily grammar selection respects available missing prerequisites, pins the actual course ID (including a lower-level prerequisite), and explicitly falls back when prerequisite content genuinely does not exist. Finished daily sessions do not reuse an old pin. Reading resumes unfinished work, including a completed article whose wrong-answer retry is still in progress.
- Reading words, sentence paragraphs, grammar and comprehension mistakes use existing learning/SRS models. Article ID/title/original text are retained in compatible personal-note metadata. One card can retain more than one article context. Repeated capture preserves card IDs, schedules, review history, first encounter and personal notes. Vocabulary, sentence/mistake notebooks and flipped review cards provide a mobile source sheet with return-to-article action.
- A saved review run fixes its card IDs. Refresh and reconnect reconstruct the remaining cards from existing review history. A submitted Again card is not silently submitted again in the same run; future review scheduling is unchanged. Each rating atomically saves its event and visible-time study record, so a partial review is not lost before the final card. Duplicate event IDs are ignored. Background time is excluded.
- The previous save/readiness/keyboard/safe-area/download/update fixes are retained. No Auth, RLS, migration, snapshot version, scheduler or sync protocol changes were made. No production SQL or learning writes were executed by the worker.
- The isolated PostgreSQL test now covers collection source metadata, a fixed review run, a partial-rating study record, duplicate snapshot delivery and private-role read/write isolation. This is **local fixture evidence**, not real-owner production acceptance.

Content increment: JA N5 +1 grammar/+1 reading; JA N1 +1/+1; EN C1 +1/+1; EN C2 +1/+1. Each includes four grammar examples, four exercises and 3–6 reading questions with explanations and aligned Chinese translations. Original vocabulary remains 667 cards. Detailed quantities and limits are in CONTENT-AUDIT.md and MOBILE-CYCLE-CHECKPOINT.md.

**NOT VERIFIED:** real owner login/restore, authenticated production collection/SRS writes, real PC/phone convergence, Android Chrome/iOS Safari installed-mode rendering, 360/375/390/412/430 px screenshots, keyboard/orientation interactions, physical offline/reconnect/update activation. No owner storage state or approved browser-control tool is available. No secrets should be sent in chat. Advanced AI/speaking remains pending the core acceptance and an actual server service.

Current read-only production probe reached the Supabase Data API with the Publishable Key and confirmed anonymous vocabulary access is denied (42501). Auth settings endpoint reached; Google remains enabled. This does not certify authenticated owner writes or cross-device acceptance.
