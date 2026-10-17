# 3.1.0-preview.7 — linked N3 and B2 decisions

Based on preview.6 source `2b38b38` / public `1c8930c`. No dependency upgrades, backend or hosting changes, historical migration edits, quota changes, SRS rescheduling or cache resets. Existing IDs, accounts, Auth/RLS and learning records remain compatible.

## Delivered curriculum

- Four complete N3 grammar topics: わけだ (supported conclusion), わけではない (scope of negation), とは限らない (exceptions to a generalisation), Vることはない (no need). Meaning, formation, usage, nuance, four kana/Chinese-aligned examples, common errors/comparisons, existing prerequisites and five explained exercises each.
- Two complete B2 topics: even if versus even though (hypothesis versus established fact); whether...or... (a common decision across alternatives). Four examples, Chinese explanations, meaningful comparisons/prerequisites and five explained exercises each.
- Two original N3 readings: 歩いてから直す地図 (information checked against real routes) and 最初の説明を短く (selecting useful explanations and asking for help). One original B2 essay: One plan, two ways in (stable purpose and flexible access). Each has aligned paragraph translations, actual existing vocabulary references, grammar links and five grounded comprehension questions including inference and intent.
- Additions: 24 examples, 30 grammar exercises and 15 comprehension questions. No generic filler, fabricated achievements or altered old content. Correct-option positions include 0/1/2 per new topic/article; option ordering is fixed in source and restored drafts.
- Internal editing checks contrast fact/hypothesis and partial/total negation, N3 noun/na-adjective formation, kana readings, translations, factual support for answers and level-appropriate length. External/native-speaker teaching review remains pending; automated schema validity alone is not a pedagogy certificate.

## Actual counts

| Scope | Before | Added | After |
|---|---:|---:|---:|
| Vocabulary cards |927|0|927|
| Complete grammar |184|6|190|
| Complete readings |84|3|87|
| N3 grammar / reading |10 / 5|4 / 2|14 / 7|
| B2 grammar / reading |10 / 5|2 / 1|12 / 6|

All190 grammar have explicit reading links; other grades unchanged and retain the first-stage minimum. Original268 complete course documents and927 vocabulary payloads/IDs remain unchanged. Full targets still lack1070 grammar +503 readings =1573; `content:audit -- --require-targets` must continue to fail. Reading-time rules:200 Japanese characters/minute,160 English words/minute, rounded up; not personalised predictions.

## Validation and continuation

New regression checks freeze old payloads, verify distinct lessons/references/options and exercise count, select each real course and linked article, restore stable daily pins/answers after language switch and catalog reordering, and preserve existing SRS dates under repeated collection/completion. The previous frozen baseline check now selects its explicit historical ID set, retaining the same count/hash instead of accidentally treating future authored courses as old content.

`UI_AUDIT_V31_COURSES=batch05 node --import tsx scripts/mobile-ui-audit.mjs` exercises six grammar/reading pairs: all six at390px, first at360px, last at430px in dark/reduced-motion mode. Actual compiled UI, current IDs/grades, explicit practice feedback, reload recovery, anchored grammar panel, vocabulary/SRS/source collection and duplicate completion are checked. The B2 cases use the existing real winkNLP worker. Both N3 and B2 downloaded readers run offline note/question/reload and simulated reconnect checks. The QA caption now derives counts from actual executed pages instead of a stale N4/C1/C2 label.

Required verification remains typecheck, zero-warning lint, tests, content audit and production build. Final outcome, build identity, source commits and publication appear in the delivery receipt. Chromium uses simulated accounts/backend and real compiled workers/IndexedDB/Service Worker; this cannot certify production RLS, real owner sessions, second devices or physical Android/installed PWA acceptance.

No new React content page or eager model load. Existing compilation and lazy course loading provide mobile practice, saved drafts, offline downloads and the same-account SRS/source path. Existing PWA update safety remains; native APK/signing unchanged. GitHub push/PR and explicit Sites publication are distinct, with no claim of automatic GitHub-to-Sites deployment.

Next: continue reviewed linked grade batches; obtain native-speaker review and genuine owner/phone/second-device acceptance. AI/media services, Lute/Recharts and scheduler replacement remain deferred to their documented actual-service/compatibility requirements. Do not declare the full1260/590 library complete.
