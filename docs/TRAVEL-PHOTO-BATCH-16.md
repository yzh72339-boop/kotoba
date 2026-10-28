# Preview20 — travel and photography units, 2026-10-28

One consolidated batch reuses the existing course/dictionary/adapters/daily/reader/SRS flow. No dependency install/upgrade, Auth/RLS, registration quota, database migration, scheduler, account storage or sync change. All349 earlier full courses and1107 vocabulary payloads/IDs remain frozen by tests.

## Actual new content

| Scope | Added grammar | Added readers | Explained practice | Current grammar | Current readers |
|---|---:|---:|---:|---:|---:|
| Japanese N4 |4|2|30|27|13|
| English B2 |4|2|30|20|10|
| Increment |8|4|60| | |

N4: なくてもいい versus なければならない distinguishes absence of necessity from obligation; てから versus たあとで teaches ordered actions. Original readers describe a ticket/meeting arrangement and a photo walk. Four kana/Chinese examples and five explained exercises per topic, real prerequisites, comparisons and mistakes. The narratives explicitly scope ticket rules to their fictional setting; they do not generalise a particular operator’s policy.

B2: be supposed to versus be allowed to distinguishes expectations, permission and actual events. Had better versus may as well distinguishes stronger situational advice from a practical choice without a clearly better alternative. A disrupted train journey and a camera-testing decision supply original contexts, paragraph-aligned Chinese translations and five explained comprehension questions per article. No guaranteed technical diagnosis, real reimbursement policy or invented learning metrics.

New48 word cards:24 Japanese N4 words; English5 A2 travel words,7 B1 travel words and12 B2 photography/testing words. English reading level does not overwrite vocabulary teaching level. All48 are distinct from earlier headwords, have pronunciation, POS, meaning, original example/translation and collocation, and actually occur in the linked text. Broad IPA and grade/frequency labels are editorial teaching judgments, not official exhaustive lists or corpus measurements. N4 cards now106; English A2 now87, B1 now107, B2 now106. No existing word ID or payload changed.

Current library: **1155 cards /246 complete grammar /115 readers**, all246 grammar linked. Full1260/590 targets remain short1014 grammar +475 readers =**1489** documents; strict --require-targets remains enabled and fails while the gap persists. First-stage grade minima remain met. Root audits give all11 levels and retain19 historical repeated terms with their original IDs.

## Engineering and verification

The existing content compiler publishes separate article/grammar JSON and search metadata; no bulk reader body is added to the homepage. Existing WanaKana aliases, optional local Kuroshiro ruby and actual wink source morphology support norikae/keshiki and transferring→transfer/malfunctions→malfunction. Stable article/word IDs, source paragraphs, option order, existing SRS dates and idempotent completion stay intact.

Eight new Node cases freeze baseline payloads and cover complete content, actual eight daily pins/answer mappings after backup/language/grade changes, duplicate collection/completion, genuine source analysis, kana aliases and cross-grade vocabulary preservation. The previous N4 exit-reading QA assertion is restricted to its actual article, instead of assuming every N4 reader contains that word. Existing UI_AUDIT_V31_COURSES=batch16 checks all8 grammar-reader links at390px, N4 at360px and B2 dark/reduced-motion at430px:10 course/width cases. Four reader download/offline/reconnect cases reuse actual local UI/SW/IndexedDB and isolated backend fixtures. Update recovery compares archived actual Preview19 with the new build.

Run typecheck, lint, tests, content:audit, vocabulary:audit and production build once, then only rerun checks affected by an observed failure. Delivery logs/receipt contain actual completed results, scripts gzip comparison, screenshots/recording, exact source/public commits, PR and production build identity. Human editing checked expressions, translations, option reasons and references; independent native-speaker review is not claimed.

Real owner/RLS/cloud writes, physical Android/iOS, installed PWA and second-device sync remain unverified for this batch. Browser fixtures and public version/worker/page HTTP checks cannot substitute for those. GitHub feature pushes and explicit Sites publication remain separate, preserving existing domain/audience/data/quota. Do not claim automatic GitHub→Sites CD or merge draft PRs to main automatically.

## Accurate next breakpoint

Rotate to N1/A2 linked situational content after checking existing patterns and words. Keep quality and actual course→reader→collection→review/offline verification; avoid adding another scheduler or unsupported AI service. Retain the actual Preview20 build archive for the next update recovery test. Full V3/V3.1 is not complete.
