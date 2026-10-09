> Current 2.6: +75 grammar / +38 reading over the latest 75/22 source; all 11 grades meet the phase minimum. See KOTOBA-2.6-CHECKPOINT.md. Earlier batch descriptions below are historical.

# V3 content expansion — two usable batches

This is a staged expansion, **not a completed V3.0 library**.

- Japanese: 50 N2 grammar courses + 4 N5 foundation courses + 1 N1 course; 10 original N2 articles.
- English: 12 B1/B2 grammar courses; 4 original B1/B2 articles.
- Every new grammar course has at least four examples, Chinese explanations, common mistakes and exercises. Japanese examples include readings.
- Every article has paragraph translations, linked vocabulary/grammar and five comprehension questions with explanations.
- Seven exercise formats are supported. Open responses use reference answers and learner confirmation; there is no claim of automatic semantic grading.
- Metadata loads separately from article bodies. Filtering, search, page downloads, grammar popovers, personal notes and reading feedback are available. Reading search includes linked vocabulary, pronunciation, Chinese meanings and grammar patterns; cached older catalogs remain readable.
- Downloaded content uses the existing persistent download cache. Personal learning state stays in existing IndexedDB / Supabase snapshot sync.

## Current database state

Production migration 010 was already verified in the owner's earlier SQL Editor receipt. The original result is retained in `supabase/dashboard/evidence/010_verification.json`: `problems: []`, migration recorded, three private buckets and no private-helper browser access. **Do not rerun 001–010.**

Current work needs owner-authenticated acceptance, not another deployment: verify two distinct grammar reviews and article positions, refresh, continue on another device, then download and test offline/reconnect. The runtime readiness guard remains; network, login and API schema-cache errors have their own explanations. No production mutation was performed by this update.

## Maintenance

- `npm run content:audit` regenerates `CONTENT-AUDIT.md`; current target status is NOT MET.
- `npm run content:audit -- --require-targets` fails until the complete V3 targets and minimum lengths are met.
- `npm run content:build` validates and compiles static JSON. It also runs before the production build.
- `npm run test:content:backend` creates a disposable local PostgreSQL 17 container, tests isolated migrations/sync/RLS, and removes it. It never connects to production. Docker and the `postgres:17-alpine` image are required.

## Remaining work

The full 1,260 grammar / 590 reading targets are still outstanding. Counts are recorded honestly by language and level in CONTENT-AUDIT.md. Course naturalness and teaching quality still need editorial review; schema checks are not a replacement.

Follow-up items: automatic furigana for every unmarked kanji; seven exercise formats per lesson where pedagogically suitable; complete comparative lessons and ordered prerequisite graphs; actual mobile QA; richer adaptive recommendations beyond the initial reading-score heuristic; the existing legacy source-ID projection still uses seed article IDs for captures without structured source metadata.

## Second batch

Added 28 grammar courses and 6 original articles without changing Auth, RLS, the scheduler, sync or migrations 001–010. Japanese additions cover scope, evidence, restriction, evaluation and necessary conditions; English additions cover timelines, relatives, indirect questions, conditional situations, passive processes and verb complements. New questions use contextual distinctions and varied answer positions. 限りだ is classified as N1 rather than increasing the N2 count. JLPT/CEFR course classifications are editorial references, not claims of an official exhaustive list.

Historical second-batch count: 67 grammar / 14 articles. Current 2.6 count is 150 / 60; full targets remain short by 1,640 documents. Migration 010 has an owner-supplied receipt; only live owner/device acceptance remains open.
