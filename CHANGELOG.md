# 3.1.0-preview.2 — preparation without losing the daily task

- Ordered prerequisite suggestions use authored same-language course IDs, deduplicate shared dependencies and explicitly report missing/cyclic references. Completed prerequisites are not re-taught.
- Browsing prerequisites/comparisons/other readings no longer replaces a persisted daily task pin. A return action restores the assigned grammar, including after refresh.
- Four original N4 grammar topics (evidence, uncertainty, reported information and received help), two linked readings, sixteen kana-supported examples and thirty explained practice/comprehension tasks.
- Existing 257 course documents, 927 word IDs/data, Auth/RLS, migrations 001–013, SRS and sync are preserved. No new dependency. APK container does not need replacement for hosted course updates.
- Full curriculum targets and new-batch physical-device/owner/cross-device acceptance remain incomplete; exact local/browser/deployment evidence is in the batch report.

# 3.1.0-preview.1 — local language tools and prerequisite content

- Add exact, lazy WanaKana and winkNLP with lite web model; preserve native IME, headword/SRS IDs and actual source paragraphs. Model output is tentative and local.
- Expand trusted catalog annotation, exclude ambiguous/kanji-fragment readings, show actual account-based evidence with undoable known marks. No full morphology/retention-probability claim.
- Add N4 seven grammar /three reading and C1/C2 four grammar /two reading; previous 241 courses and 927 cards unchanged.
- Defer optional worker/model precache until use; retain initial assets and the existing update/data safety rules. No production SQL or migration replay.

# 3.0.0-preview.1 — 2026-10-14

- Add twelve full N2/N1 grammar topics, five original linked readings, 48 examples and 85 explained exercises/questions. All current grammar now has an explicit reading link.
- Preserve all prior 224 course payloads, original answer mappings and 927 vocabulary cards; no Auth/RLS/SRS/sync/migration change or dependency upgrade.
- Current 166 grammar /75 readings. Full targets still lack 1,609 documents; strict target audit intentionally fails.
- 222 tests, typecheck/lint/audits/build and bounded Chromium course/offline/update checks pass; real new-course/device/AI acceptance remains pending. Signup displays the actual package version.

# 2.9.1 direct-registration update — 2026-10-14

- Support explicitly selected immediate email/password signup without CAPTCHA or confirmation-mail dependency, as requested. Supabase remains the registration and capacity authority.
- Correct immediate-session navigation and backend configuration mismatch messages; hide unsupported mail recovery/resend claims. Admin activation checklist matches direct mode.
- Preserve original admin, ten-seat limit, migrations 001–013, learning IDs, RLS, SRS and sync. No dependency changes.
- 217 Node tests and actual local GoTrue tests pass, including 25 concurrent no-SMTP direct signups with immediate sessions and rejection above ten. Production settings/owner/user/device acceptance remain separately pending.

# 2.9.1 Limited Beta — 2026-10-13

- Email/password signup, verification, recovery and password update; mobile CAPTCHA integration and capacity status, with fail-closed activation.
- Additive 013: trusted original admin excluded, atomic ten-seat Auth creation/deletion fences, closed-by-default registration, minimal admin account reclamation.
- Multi-user learning RLS/RPC/Storage and projected-content ownership, account/project-scoped local state and pinned-user sync. Existing SRS/records/IDs and migrations 001–012 preserved.
- Authenticated AI daily/minute limits and updated Edge verifiers. No dependency upgrade or production SQL execution.
- 216 Node tests, local PostgreSQL/real GoTrue concurrency/rollback/recovery and mobile fixtures pass. Production configuration and actual-device acceptance remain pending; see LIMITED-BETA-ACCEPTANCE.md.

# 2.9.0-preview.1 update recovery — 2026-10-13

- Recognize prerelease worker builds in Settings and standalone recovery; the deployed preview was wrongly rejected by the numeric-only validator.
- Separate offline, login, unexpected HTML, invalid build, HTTP, timeout, installation and mismatched-worker failures. Keep explicit confirmation and other-window safety checks; no learning data reset.
- 209 Node tests and bounded 360/390/430px real-worker Chromium update tests pass with retained isolated IndexedDB/session/download fixtures. Physical owner/PWA acceptance remains unverified; no migrations or dependency changes.

# 2.9.0-preview.1 (2026-10-12)

- Personal UTF-8 import with manual metadata, duplicate choice, immutable versions, paragraph anchors and reader reuse.
- Context cards preserve original expression/meaning/snapshot and share existing SRS. Edit/pause/archive retains history. Additive 012 is prepared and locally tested, not production-deployed.
- Existing grammar mistakes link to reliable same-point exercises; missing alternatives explicitly fall back.
- Listening workspace checks device voices, plays/loops real text, supports original recall and account-scoped local microphone recording/playback/delete; private audio attachments have real format/duration checks. No fake audio alignment or pronunciation scoring.
- Budget tasks preserve identity/progress/backlog under adjustments; JSON restore includes metadata and explicitly reports missing media; separate media manifest/download provided.
- 206 Node tests, type/lint/build/audits and mobile emulation pass; real owner/device/production/second-device verification remains pending. Preview only.

# Changelog

## 2.8.1 — 2026-10-12

- Add two original N2 reading units for strong inference / subjective conviction and concession / explanatory cause / regretted consequence; link five retained grammar course IDs.
- Add ten explained contrast exercises, keeping all five original exercises and four examples per course. Existing questions/answers and all 927 vocabulary cards remain hash-guarded; collect 18 distinct existing contextual cards across these articles.
- Content totals: 154 grammar / 70 readings; N2 54 / 19; 144 linked grammar topics, 10 unlinked, and a 1,626-document full-target gap. Per-grade phase coverage remains met.
- Expand the existing linked-course regressions across ten grammar topics and four articles; retain daily pinning, unfinished reading, scope parking, source/mistake idempotency, answer mapping and SRS identity. Extend the isolated mobile batch runner to the new units, including offline-label assertions.
- Keep the UI, owner/Auth/RLS, migrations 001–011, state/sync architecture, SRS scheduling and dependencies unchanged. Version/worker metadata use 2.8.1.

## 2.8.0 — 2026-10-12

- Link five existing N2 grammar IDs to two original readings: 同じ校庭、違う温度 and 写真にたどり着く入口. Reuse 13 existing vocabulary cards through literal in-text references; do not regenerate vocabulary.
- Add ten explained contrast exercises and correct three unrelated old answer explanations. Existing question IDs, prompts, options and accepted answers remain unchanged; old drafts and scheduled grammar cards still restore.
- Content: 927 vocabulary cards / 154 grammar topics / 68 readings. Explicit grammar-reading coverage grows to 139, leaving 15 unlinked topics and a full curriculum gap of 1,628 documents.
- Verify linked daily selection, scope parking, persisted answers, source deduplication and existing SRS identity with four additional regressions; extend isolated mobile QA to these five reused courses and two new readings, including dark/reduced-motion offline reload.
- Keep silver/graphite/blue UI, Auth/RLS, migrations 001–011, SRS, account caches and sync protocol. No dependencies or production database operations changed. See N2-CONTENT-BATCH-02 for actual verification and device limits.

## 2.7.2 — 2026-10-12

- Protect explicit page exit during an unfinished or failed local save with the browser beforeunload warning. Queued cloud sync, offline saved records and successful fallback storage do not block leaving. Cleanup removes the listener after saving/unmount. Browsers can suppress this warning; it is not protection against OS process termination.
- Derive the shared grammar expression for active daily readings from saved plan IDs; keep the existing explicit link hint for paused/free browsing. No new persisted field or scheduling logic.
- Clarify the local-saving label rather than presenting answer feedback as saved progress. Retain IndexedDB, queue/idempotency, SRS, Auth/RLS and migrations 001–011.
- Add local-save exit/cleanup regressions and current browser checks for enlarged text, held IndexedDB transactions, actual reading/grammar Back position, and simulated keyboard geometry. Preserve existing visual/navigation/motion implementation after verification.
- Keep content at 927 vocabulary cards, 154 grammar topics and 66 readings; no duplicate content or dependency upgrade. Track local vs device/owner/cross-device evidence and the uploaded development plan separately.


## 2.7.1 — 2026-10-12

- Add four complete N2 grammar topics and four linked original readings about applications, workshop preparation, iterative improvement and conditional scheduling. Each topic includes four examples and five explained exercises; each reading has aligned translations, five questions and literal word/grammar references.
- Add 40 distinct original N2 vocabulary cards with readings, Chinese meanings, contextual examples/translations and collocations. All occur in the new reading units; the entire previous Japanese word payload is hash-guarded.
- Content totals: 927 vocabulary cards, 154 grammar topics and 66 readings. N2 now contains 210 cards, 54 complete grammar topics and 15 readings. Long-term grammar/reading targets remain incomplete.
- Keep existing UI, stable course IDs, owner/Auth/RLS, SRS, sync protocol and migrations 001–011. No dependency upgrades. Add two content-to-plan/SRS/source compatibility regression tests and isolated mobile batch verification.
- Package, lockfile and generated PWA identity use 2.7.1; existing update/recovery entry remains.


## 2.7.0 — 2026-10-09

- Retain the silver/graphite/blue system and interruptible shared-course transitions. Course browsing no longer labels every grammar as today's assigned task; the top bar changes surface gently after scrolling without changing its height.
- Mobile vocabulary uses a vertical list and focused, scrollable word sheet. Switching language/level clears stale searches, selections and flashcard runs; external word selections remain usable on first mount.
- Add 220 original vocabulary cards: 20 per JLPT/CEFR grade. All 667 old payloads and IDs remain byte-for-byte compatible; duplicate older source terms are retained to protect existing records.
- Add current-grade vocabulary references to existing readings and share strict whole-word/phrase matching with audits. Existing article/course IDs and question ordering remain stable.
- Add N5 `朝の図書館で` and N2 `直せることと、約束できること`, with aligned translations, linked grammar/vocabulary and five explained questions each. Foundation prerequisites now have a linked reading rather than an unrelated N2 fallback.
- A completed prior-day plan no longer appears as today's completed progress. Completed-plan CTAs explain the next course pair; Learn shows enrolled due reviews rather than confusing all unseen cards with due cards. Reading labels, source capture and speech use the displayed content's language and grade.
- Version, lockfile metadata, settings and generated worker build identity use 2.7.0. No dependency versions, migrations, Auth/RLS, SRS semantics or sync protocol were changed.

Verification and remaining acceptance: [V2.7 checkpoint](docs/KOTOBA-2.7-CHECKPOINT.md). This is not a complete 1,260/590 curriculum or exhaustive dictionary.
