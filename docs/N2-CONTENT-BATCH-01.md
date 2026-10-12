# N2 practical content batch 01 — 2.7.1

Date: 2026-10-12. Foundation: verified 2.7 source (Sites `61f208c`, GitHub `f356862`). This batch adds content using the existing schema/compiler, library/reader, daily-plan pins and SRS source collection. No business-engine rewrite or migration is required.

## Additions

| Grammar | Original related reading | Characters | New vocabulary | Exercises / questions |
|---|---|---:|---:|---:|
| 〜次第（完了後すぐ） | 申請を送った、その後で | 731 | 10 | 5 / 5 |
| 〜次第で／〜次第だ（依存） | 返却の状況で変わる予定 | 736 | 10 | 5 / 5 |
| 〜に先立って／〜に先立ち | 説明は、始まる前に | 743 | 10 | 5 / 5 |
| 〜をきっかけに／〜がきっかけで | 一つの相談から、持ち手が変わるまで | 747 | 10 | 5 / 5 |

Each grammar has four original Japanese examples with kana/Chinese, explanation, formation, nuance, common error, valid prerequisite IDs and comparison links. Each reading has aligned paragraph translations, literal vocabulary/grammar associations and five original explained comprehension questions. All 40 added lexical cards have actual occurrences in their associated readings; no unrelated fragments are marked as grammar. Options use all three correct-answer positions and keep fixed mappings across reload.

The application article distinguishes receiving documents from approving a request. The preparation article distinguishes pre-event preparation from ongoing guidance. The design article distinguishes a trigger from validation evidence. The scheduling article distinguishes conditional decisions from evading responsibility, postponement from cancellation. These are fictional teaching scenarios; no real-world institution or experiment is asserted.

## Counts

| Language/grade | Vocabulary cards | Complete grammar | Complete reading |
|---|---:|---:|---:|
| ja N5 | 70 | 10 | 6 |
| ja N4 | 70 | 10 | 5 |
| ja N3 | 81 | 10 | 5 |
| ja N2 | 210 | 54 | 15 |
| ja N1 | 70 | 10 | 5 |
| en A1 | 70 | 10 | 5 |
| en A2 | 70 | 10 | 5 |
| en B1 | 76 | 10 | 5 |
| en B2 | 70 | 10 | 5 |
| en C1 | 70 | 10 | 5 |
| en C2 | 70 | 10 | 5 |

Total **927 vocabulary cards / 154 grammar / 66 readings**. Batch increase **40 / 4 / 4**. All stage minimums remain satisfied. Full 1,260/590 targets lack **1,630** documents; `--require-targets` still fails and standards are unchanged. This is not an exhaustive official JLPT vocabulary list; tags are teaching levels.

## Compatibility and verification

- All pre-batch Japanese word payloads are SHA-256 guarded. All original 667 cards, prior 220 contextual cards and old course IDs remain intact.
- Two additional regressions exercise literal word coverage, matching grammar/reading pairs, varied fixed answer positions, daily plan/backup restore and new-word collection preserving its schedule/source on retry.
- TypeScript, zero-warning Lint, **180 Node tests**, content audit (zero errors/length warnings), vocabulary audit (zero errors) and production build pass. No dependency upgrade. Migrations 001–011, Auth/RLS, scheduler and sync protocol are unchanged; no production SQL or learning writes.
- Mobile batch command: `UI_AUDIT_N2_BATCH=1 UI_AUDIT_DIR=/absolute/output APP_URL=http://127.0.0.1:4174 node --import tsx scripts/mobile-ui-audit.mjs` after serving `out/`. Existing Chromium/Playwright is required; no package upgrades are part of QA.
- Chromium batch check passed for all four pairs at 390px, plus the first pair at 360px and last pair at 430px: 6 topic/width combinations. Each exercised grammar practice and refresh after the actual saved indicator, linked reading, collecting a new word, grammar-panel anchor, all five reading answers, duplicate completion and final reload after save completion. Saved words, article source and grammar SRS remained intact; results restored at 100%, with no errors or final-page horizontal overflow. Batch screenshots and native publication receipt are recorded in the external delivery. The isolated fixture verifies UI behavior, not real owner/RLS/device permissions. Prior 2.7 full phone/offline results are historical, not rerun evidence for this batch.
- Original expressions/translations and distractors were edited during authoring. Automated checks do not replace independent Japanese-language editorial review.

## Next breakpoint

Real owner/Android/iOS/second-device/installed-PWA acceptance remains unverified. Install updates using the existing `/api/app-update.html`, keeping local progress; never clear IndexedDB to update.

Next content batch: expand N2 articles for currently unlinked grammar; then add advanced English C1/C2 vocabulary in real reading contexts. Keep content in JSON, use stable IDs and literal references, run audits and the smallest necessary regressions/browser checks. AI and speaking capabilities remain dependent on real services.
