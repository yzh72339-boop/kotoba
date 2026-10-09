# Kotoba 2.6 checkpoint — 2026-10-09

## Follow-up status

The newer [sync repair checkpoint](KOTOBA-2.6-SYNC-REPAIR.md) records four additional regressions (159 total), error capture/background/save-retry fixes and the reproduced event-ID projection incompatibility. Migration 011 was subsequently deployed and read-only verified by the owner; its receipt is preserved. The latest [phone checkpoint](PHONE-EXPERIENCE-CHECKPOINT.md) records 163 tests and this mobile batch. Migrations 001–011 remain untouched in the mobile batch. The checks below are the earlier Version 16 batch, not proof of current production owner/device acceptance.

## Source and scope

Package / lockfile / Settings / development worker: **2.6.0**. Baseline is the latest compatible descendant of Version 13, HEAD before this round `5eac7ef0ef4cb8ef2badc690f4e52c432684592e` (Version 15), not a destructive checkout of older code. The actual starting library was 75 grammar / 22 reading / 667 vocabulary cards, with 139 passing tests. Historical Version 13 was 67 / 14 / 113.

This batch preserves Auth/RLS and the private owner, migrations 001–010, SRS scheduling, snapshot/revision sync, IndexedDB, vocabulary IDs, course IDs, old answers and personal notes. No production migration, reset, dependency upgrade or AI deployment was performed.

## Mobile changes

- New daily plans freeze due enrolled card IDs, grammar and reading before starting. Three-step review → grammar → reading → result uses actual content, prerequisite support and unfinished-reading priority. Time estimates disclose the rule; they are not personalised analytics.
- Language/grade changes park an unfinished plan per scope. Returning resumes the same IDs and step; old four-step plans still restore. Content unavailable is an explicit legacy fallback, not a silent demonstration default.
- Mobile navigation is 首页 / 学习 / 资料库 / 我的. More and desktop navigation preserve Review, AI and other tools. Library language/type/grade filters reset stale views; body documents stay lazy-loaded.
- Grammar has persisted explanation/examples/mistakes/comparison/practice sections and personal-note sheets. Reading keeps existing settings, paragraph anchors, lookup sheets, source-aware word/sentence/grammar/mistake collection and review entry.
- Reading answer choices now require per-question confirmation before feedback; no automatic next question. Confirmed answers survive reload. Older completed attempts keep their original scores and show added questions as unattempted. New option ordering is frozen in the document.
- Course completion, reading attempt results and study records are idempotent. Reading mistakes use stable attempt/question IDs. Collecting again retains card IDs and schedules.
- Readiness distinguishes checking, authentication, network, offline verified/unverified, definite missing RPC and API-cache ambiguity. The capability key remains project/owner scoped. Only a definite missing `content_library_ready` produces a migration message.
- Existing keyboard/safe-area/dynamic viewport/update recovery/local-save statuses remain. No cache or user learning storage is cleared to resolve updates.

## Qualified content

Every grammar now has ≥4 examples, ≥5 explained exercises and common mistakes. Every reading has ≥5 mapped questions, aligned paragraph translations, existing vocabulary IDs and literal grammar surfaces. Added 75 original grammar topics and 38 original readings; strengthened existing short exercise sets without changing old IDs or answer positions. All newly added grammar topics have explicit reading links. Automated audit checks references/language, cycles, empty/malformed content, answer mapping, duplicate prompts/options/content and near-duplicate readings. Naturalness and pedagogy are not certified by a schema check.

| Language | Level | Grammar before + added = now | Reading before + added = now |
|---|---|---:|---:|
| ja | N5 | 5 + 5 = 10 | 1 + 4 = 5 |
| ja | N4 | 1 + 9 = 10 | 1 + 4 = 5 |
| ja | N3 | 1 + 9 = 10 | 1 + 4 = 5 |
| ja | N2 | 50 + 0 = 50 | 10 + 0 = 10 |
| ja | N1 | 2 + 8 = 10 | 1 + 4 = 5 |
| en | A1 | 1 + 9 = 10 | 1 + 4 = 5 |
| en | A2 | 1 + 9 = 10 | 1 + 4 = 5 |
| en | B1 | 8 + 2 = 10 | 2 + 3 = 5 |
| en | B2 | 4 + 6 = 10 | 2 + 3 = 5 |
| en | C1 | 1 + 9 = 10 | 1 + 4 = 5 |
| en | C2 | 1 + 9 = 10 | 1 + 4 = 5 |
| Total | | **75 + 75 = 150** | **22 + 38 = 60** |

The 2.6 content minimum is met. Full targets remain 1,260 grammar / 590 reading: **1,110 grammar and 530 reading still missing**. `--require-targets` fails intentionally with the unchanged standard. 31 retained grammar points still need explicit reading associations (mainly N2 and conjugation foundations); all added topics are linked. Grade labels are editorial JLPT/CEFR approximations, not official exhaustive lists.

## Local verification

- TypeScript: PASS. ESLint: PASS, zero warnings.
- Node: **155/155 PASS**, including 16 new daily plan / scope / fallback / readiness / idempotency / confirmed-answer / option / version tests. Two older singleton-catalog fixtures were scoped so they continue to test the same prerequisite and pin behavior against the expanded catalog.
- Content audit: 210 documents, 0 errors, 0 length warnings; `--require-stage` PASS; `--require-targets` FAIL (1,640 units remain).
- Production static build: PASS, initial JS 356 kB; 150 grammar and 60 reading bodies remain separate JSON assets. Validation build `kotoba-2.6.0-6c9f752a7f99`; the published artifact's final build identifier is recorded in the delivery receipt, not inferred from this earlier validation build.
- Disposable PostgreSQL 17: owner/non-owner/anonymous fences, migration compatibility, distinct course projection and repeated sync/idempotency PASS. The fixture also carries the new daily plan, parked language scope and reading draft fields. This never connects to production.
- Real Supabase read-only probe: Data API reachable with Publishable Key; anonymous vocabulary access denied (42501); Auth endpoint reachable and Google enabled. Public signup not confirmed globally disabled; database owner guard and RLS unchanged.
- 010 deployment evidence: exact user-supplied historical receipt retained in `supabase/dashboard/evidence/010_verification.json`. No authenticated owner write is inferred from it.

## Acceptance limits and next breakpoint

| Check | This round |
|---|---|
| State/backup restore, selection, duplicate completion, source collection/SRS, downloaded document fallback | Automated tests PASS |
| Mobile browser 360 / 390 / 430 CSS px, light/dark, keyboard, orientation and sheet overlap | **未验证** — no browser-control tool / owner browser session |
| Real owner login / actual curriculum write / refresh on production | **未验证** — no owner session in executor |
| Real second device convergence | **未验证** |
| Installed Android / iOS PWA, offline/reconnect and update activation | **未验证** |

Code and local checks do not establish complete 2.6 device acceptance. Existing responsive audit includes Library and every required width; run it only with a real owner storage state in a supported browser environment. Do not send passwords/tokens to chat.

Next: open the published 2.6 build on the owner's phone, start a plan, complete one review/grammar/reading, collect a word/sentence, refresh and resume, then test a downloaded lesson offline, reconnect and compare another device. Resolve observed mobile issues before advanced AI/speaking. Continue the long-term content target in reviewed batches; do not weaken either audit threshold.
