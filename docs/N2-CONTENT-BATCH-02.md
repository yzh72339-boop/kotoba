# 2.8.0 — N2 linked course batch 02

Date: 2026-10-12. Baseline: Sites `089681e67b050148de534d64e03f95d46ec2c3c2` / GitHub `5f16eb27438261ba3eb4c9cd387e2fca70c1fcd2`, package 2.7.2. Branch: `feature/2-8-n2-reading-links`. Follow the adopted development plan, not historical Version 13 counts. This is the first local 2.8 course-linkage batch; neither the full curriculum nor RC is complete.

## Actual changes

| Original grammar ID (preserved) | New associated reading |
|---|---|
| grammar-ja-n2-ni-tsurete | article-ja-n2-schoolyard-temperature — 同じ校庭、違う温度 |
| grammar-ja-n2-ni-shitagatte | article-ja-n2-schoolyard-temperature |
| grammar-ja-n2-wo-tsuujite | article-ja-n2-photo-exhibition — 写真にたどり着く入口 |
| grammar-ja-n2-wo-hajime | article-ja-n2-photo-exhibition |
| grammar-ja-n2-ni-kagirazu | article-ja-n2-photo-exhibition |

- Add two original N2 readings: 773 and 818 Japanese characters; five aligned Chinese paragraph translations, five explained comprehension questions each, actual vocabulary/grammar occurrences and 4-minute metadata estimates. Estimates are not measured personal reading time.
- Add two contrast exercises per reused grammar (ten total). Each retains four original examples and five original exercise IDs/prompts/options/answers, plus seven exercises after the addition. Correct three old answer explanations that previously discussed a different example. Existing completed courses are not reset or revoked; prior five-question drafts remain readable and extra questions are available when practicing.
- Reuse all 927 vocabulary cards, including 13 existing contextual card references across these articles. No new dictionary cards or renamed IDs. Exact all-card payload and old-question answer hashes are regression-guarded.
- Existing compiled catalog, daily prerequisite selection, stable plan pins, article progress, bottom sheets, source collection and SRS consume the new documents. No new schema, architecture or persisted plan field is introduced.
- Keep silver/graphite/blue UI, source/scroll restoration, offline packs, owner/Auth/RLS, migrations 001–011, SRS scheduling and sync protocol unchanged. Dependencies are unchanged. No production SQL was run.

## Qualified content after this batch

| Language | Grade | Vocabulary cards | Complete grammar | Complete reading |
|---|---|---:|---:|---:|
| Japanese | N5 | 70 | 10 | 6 |
| Japanese | N4 | 70 | 10 | 5 |
| Japanese | N3 | 81 | 10 | 5 |
| Japanese | N2 | 210 | 54 | 17 |
| Japanese | N1 | 70 | 10 | 5 |
| English | A1 | 70 | 10 | 5 |
| English | A2 | 70 | 10 | 5 |
| English | B1 | 76 | 10 | 5 |
| English | B2 | 70 | 10 | 5 |
| English | C1 | 70 | 10 | 5 |
| English | C2 | 70 | 10 | 5 |
| Total | | 927 | 154 | 68 |

Delta: grammar +0 (five reused/enriched), reading +2, grammar exercises +10, reading questions +10, vocabulary cards +0. Explicit grammar-reading coverage: 134 → 139; unlinked grammar: 20 → 15 (14 N2 + one N1). Every grade meets its own phase floor. Full targets remain 1,260 grammar / 590 reading: 1,106 grammar + 522 reading still absent, total gap 1,628. `--require-targets` exits 1; do not weaken it.

## Review and validation

Editorial self-review checked gradual change vs following rules, medium vs duration, representative vs sole example, scope extension vs exclusion; literal expressions, paragraph translation alignment, reasonable distractors and text-supported inference. Question positions are mixed and fixed. Article scenarios are original learning essays, not news/factual reports. Automated checks and author review do not substitute for independent Japanese/editorial review.

Current TypeScript, zero-warning ESLint, 186 Node tests, content/vocabulary audits and production build pass. Content audit: zero errors and zero length warnings; vocabulary audit: zero errors, preserving 19 legacy repeated terms and all old cards. Four new regressions check pinned daily selection for every reused grammar, backup/scope restoration, additive draft compatibility, real linked vocabulary occurrences, preserved schedules/sources and idempotent result/error collection.

Current Chromium fixture acceptance passed: seven grammar/reading pairs across 360/390/430px, all five reused grammar topics with seven exercises and both readings with five questions, exact refresh restoration, one completion after double-click, vocabulary/grammar/source/SRS restoration, panel-close anchor and zero horizontal overflow. Both new readings downloaded through the actual content cache, restored offline notes and exact course IDs after a local Service Worker reload, and reconnected to the simulated backend. Dark/reduced-motion screenshots and the real compiled-UI recording are retained in the external delivery. A targeted follow-up asserts the offline save label after refresh: this Chromium/CDP environment resets navigator.onLine on cached navigation, so the runner reapplies the browser network condition to the new document via CDP (no application/navigator override). Both articles then show local/offline status and later simulated sync success. Physical offline-status continuity is still unverified. The current core runner also passes Today → due review → prerequisite grammar → related reading → 3/3 → home → refresh, one rating despite double-click, wrong-answer feedback, source collection, rapid navigation/Back, dictionary scope change and downloaded local offline reload. Its constrained profile uses the existing motion fallback; this is not a fresh physical/native frame-rate claim. Real owner CRUD/RLS, physical Android/iOS, actual IME/safe area/frame rate, second-device synchronization and installed-PWA update remain **unverified**. Isolated unsigned fixture tokens cannot authenticate to production; all Supabase traffic in browser QA is intercepted or blocked. A successful static deployment will establish publication, not these device/backend guarantees.

## Next exact breakpoint

Connect the remaining unlinked N2 groups in bounded batches: inference (に違いない / に決まっている), concession/reason (にもかかわらず / ものだから / ばかりに), necessity (ざるを得ない / ほかない), contrast/emotion (どころか / どころではない / ずにはいられない), and the remaining 3 expressions (にほかならない / っこない / ことなく). Add N1 限りだ reading. Reuse each existing course/card ID, add justified topic readings and compare exercises, audit and run mobile collection/practice/restore before counting a batch. Cross-grade library targets stay independent. Listening/AI proceeds only with traceable real services after this course batch and explicit acceptance boundary.
