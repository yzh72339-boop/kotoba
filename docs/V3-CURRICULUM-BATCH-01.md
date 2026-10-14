# Current: 3.0.0-preview.1 linked curriculum — 2026-10-14

Baseline Sites source `3398ec2` / GitHub `3e085bd`; branch `feature/3-0-course-coverage`. This bounded V3 content batch adds 12 original grammar topics (N2 +10, N1 +2), 48 examples, 60 grammar exercises and 5 original readings (N2 +4, N1 +1) with 25 grounded comprehension questions. All 224 prior course documents and 927 vocabulary payloads/IDs/answers remain byte-equivalent after parsing. New readers connect the ten previously unlinked grammars; all 166 current grammar documents now have an explicit reading link. No Auth/RLS/SRS/storage/sync change or migration 001–013 replay/edit.

Counts: 927 cards /166 grammar /75 reading. N2 64 grammar /23 reading; N1 12 /6; other levels unchanged and still meet the first-stage floor. Full 1,260/590 targets remain incomplete: 1,094 grammar +515 reading =1,609 missing. Strict `content:audit -- --require-targets` exits 1 as expected; its standard is retained.

222 Node tests, TypeScript, zero-warning Lint, content/vocabulary audits and production build pass. Build `kotoba-3.0.0-preview.1-8e4c66afc533`; article bodies remain lazily fetched. Ten course/width combinations across 360/390/430 verify practice/feedback, frozen answer reload, linked article, vocabulary/grammar collection, one completion and layout. N2/N1 downloaded article offline note/reload + simulated reconnect and real compiled-worker update tests pass. A QA-only N2 grade assumption was corrected for the N1 checks; application grade display was already correct. Fixtures are not actual owner/RLS/device/FPS acceptance.

User reports successful live ordinary-account signup, save/refresh restore and cross-device synchronization on the prior 2.9.1 direct build. Read-only quota confirmed ten seats and nine remaining. This user evidence is preserved separately from automated tests; new V3 lessons/installed PWA and genuine A/B negative RLS checks remain unverified on production. Site audience is public; exact new deployment/version comes from the native receipt. Direct signup/password and original admin UID/data remain preserved.

Read V3-CURRICULUM-BATCH-01.md and CONTENT-AUDIT.md. Next bounded content batch: strengthen the N4 conjugation prerequisites (potential/volitional), then expand English C1/C2 contextual units while keeping original IDs; continue the full per-level targets. Real AI/writing feedback, traceable listening and adaptive-rule service acceptance remain future work, not delivered capabilities. Do not claim full V3/RC completion or ask for secrets in chat.

Prior checkpoints below are historical.

---

## Authored content and editorial checks

N2 new grammar: にしては, わりに, からといって, ものなら, ようものなら, かと思うと, つつある, にあたって, に反して, ないことはない. N1: に堪えない (negative verb evaluation versus formal emotional noun), ともあろうものが (identity expectations and criticism). Four kana-aligned examples, meaningful comparisons/common mistakes and five explained exercises each. Open translation/error items still use reference answers and learner confirmation, not invented semantic AI scoring.

New readings: 雨で閉じた調理室 (decision/notification under constraints), 最後の日に渡したメモ (gratitude/memory), 買う前に座ってみる (comparison/use criteria), 直す前と後を残す (repair records/knowledge boundaries), 肩書きよりも、説明の順番 (N1 argument, responsibility and tone). N2 texts are 724–793 Japanese characters, N1 1,262. Paragraph translations align; every article has eight genuine existing vocabulary references, linked expressions and five explained questions. Fixed answer-position patterns differ across articles and never reshuffle on reload. Time estimates use 200 Japanese characters/minute, not personalized measurements. All characters/events are fictional original teaching situations.

Author self-review checked Japanese forms/kana, level appropriateness, paragraph meanings, contextual distractors and explanations against the actual text. Automated audits check structure, references, duplicates/near-duplicates, lengths, cycles and mappings. Independent native-speaker/pedagogical review has not been performed and is not claimed. JLPT/CEFR labels are editorial teaching levels, not an official exhaustive taxonomy.

## Compatibility and acceptance

The original-course content hash and all-vocabulary payload hash are frozen in tests. All 22 newly connected/new grammar choices pin an actual linked reading, survive reordered catalogs, pause/scope switches and export/restore. Confirmed answers, offsets and source provenance restore. Duplicate collection/completion/mistakes do not alter existing due/ease/schedules. First source per card/article remains the existing rule; the two meanings of に堪えない share one course/card rather than manufacturing duplicate topics.

Browser backend requests are intercepted/blocked and fixtures cannot authenticate to production. Six N2 course-width combinations passed first; the old QA-only N2 assertion failed on a correctly displayed N1 tag. After correcting it to the document level, four N1 combinations passed. Complete combined report preserves that history rather than calling the first attempt successful. Public online owner/device/A–B RLS and new-lesson cross-device/PWA acceptance remain separate.

## Next

Potential and volitional conjugation foundations need dedicated level-appropriate units before deeper conditional teaching. Next content work should provide those N4 grammar/reading chains, then stronger C1/C2 contextual discourse/comparison units. Continue the full audit targets unchanged. Existing AI/listening modules require actual authenticated service/media acceptance; no fake audio, pronunciation scores, streaming or model response was added by this batch.
