# 3.1.0-preview.12 — N3/N1 learning in context

Base: preview.11 Sites326e934 / publicc05ccf9. Protect all310 prior complete documents and975 vocabulary payloads/IDs, Auth/RLS, owner/quota, account-scoped caches/notes/downloads, original SRS scheduling and sync. No dependency/schema changes or migration001–013 replay/edit.

## Actual additions

- N3:うちに (time window versus change during an activity), まま (unchanged state versus simultaneous actions). Original reader **青い袖を残す**,600 Japanese characters, six aligned paragraphs/translations, five explained questions. Theme: clothing repair, learning by trying and family memory.
- N1:に即して (fit to facts/purpose, comparison with に基づいて), いかんによって (formal conditional dependence, comparison with 次第で and distinction from unconditional expressions). Original opinion reader **川沿いの余地を決める前に**,1003 characters, six aligned translations and five explained questions. Fictional discussion of river space, uncertainty, different burdens and reversible choices; it does not claim to establish actual engineering conclusions.
- Each grammar:4 naturally read examples with kana/Chinese, formation/meaning/usage/nuance, common mistakes, comparison, meaningful prerequisites and5 explained exercises. Correct option positions vary; free-text accepted alternatives retain mapping. Total16 examples +20 grammar exercises +10 comprehension questions.
-24 distinct context cards: N3糸・針・袖・布・縫う・ほどく・乾く・濡れる・縮む・伸びる・洗濯・裏返す; N1流域・護岸・堆積・氾濫・生態系・植生・治水・遊水地・支流・合流・可逆性・逡巡. Kana, meaning, original example/translation, POS, collocation and source included. All12 occur in each associated article. Grade/frequency are editorial context classifications, not an official exhaustive JLPT list or measured corpus frequency; a course may reinforce easier vocabulary in a harder context.

Totals999 vocabulary /216 complete grammar /100 readers; N3 now16/8, N1 now18/9. All216 grammar linked. Full1260/590 target still lacks1044 grammar +490 reading =1534 units. Strict require-targets must remain exit1; automated structure checks are not external native-speaker review.

## Existing integrations reused

No second dictionary, analyzer, scheduler or storage model. Existing WanaKana searches nuu→縫う and shunjun→逡巡; optional Kuroshiro/Kuromoji supplies actual source-aligned tokens and ruby. The analyzer splits 縫った into verb token 縫っ and auxiliary た: UI QA clicks the real token and expects original headword縫う. Do not claim arbitrary full-inflection query normalization. Unknown readings remain unguessed. Original course IDs/source paragraphs and SRS queues stay intact.

Regression tests freeze original310/975 payloads and separately freeze24 new cards; validate grades, kana, lengths, source links and answers; restore actual pinned course and answer state through N3/N1 and Japanese/English switching, backup and catalog reorder; retain old SRS dates and one source/completion after repeats. No historical hash/count loosened.

`UI_AUDIT_V31_COURSES=batch10 node --import tsx scripts/mobile-ui-audit.mjs` covers four course pairs at390px, first at360 and last at430 dark/reduced-motion. Actual optional Japanese worker, source token lookup, kana aliases, duplicate-safe collection, article-scoped source-visible review, saved due/refresh, explained practice and completion are required. Both new articles separately run downloaded offline question/note/reload and simulated reconnect; update QA uses actual archived preview.11. Exact final results/screenshots/recording/performance/publication live in the delivery receipt.

Browser QA uses real compiled UI/workers/SW/IndexedDB with isolated fixture identity/backend, not real owner/cloud RLS, second device, installed PWA or physical Android. Those remain unverified absent separate evidence. Human/native-speaker editing remains pending beyond internal checks. No production SQL, reset, data/cache deletion, quota change, dependency upgrade or APK re-signing.

Next: continue weaker all-grade thematic units and source vocabulary; real account/device acceptance stays separate. Run existing typecheck/lint/tests/content:audit/vocabulary:audit/build, preserve strict long-term standard. GitHub draft and native Sites publication remain distinct; no fabricated continuous deployment.
