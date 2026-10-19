# Preview14 — explainable course routes, 2026-10-19

Best next direction: make the growing library actionable before introducing another engine. Keep the existing daily planner, prerequisite traversal, stable IDs and SRS; expose their actual decisions, preparation and linked reading in one mobile course route. Then add mistake-driven revisits using real review evidence, and continue thin N5/A1/C1/C2 contextual coverage. Do not infer permanent mastery from course completion or add a new FSRS/AI backend for this purpose.

## Implemented

Learn now offers a grade/language-scoped course route: actual completed/available counts, the existing daily recommendation, ready/continue/preparation/missing-material states, ordered prerequisite links, and associated readers. Most-recent unfinished associated reading takes priority; completed reading counts exclude an active retry. Existing standalone reading continuation remains available. Free browsing leaves the fixed daily task and SRS untouched. Show-completed/pagination are retained in browser history, scoped by project/user/language/grade, so Back can restore the expanded list and existing page position. The list initially renders five lessons; bodies remain lazily loaded by the existing content layer. Empty/missing links remain visible and no record is auto-completed.

No dependency install/upgrade, historical migration edit, production SQL, registration quota, Auth/RLS, account storage, synchronization protocol or scheduler change. Existing three open-source adapters remain in use; no new library is introduced.

## Original linked content

| Scope | Added grammar | Added reading | Current grammar | Current reading |
|---|---:|---:|---:|---:|
| Japanese N5 | 2 | 1 | 16 | 9 |
| Japanese N4 | 0 | 0 | 23 | 11 |
| Japanese N3 | 0 | 0 | 16 | 8 |
| Japanese N2 | 0 | 0 | 69 | 26 |
| Japanese N1 | 0 | 0 | 18 | 9 |
| English A1 | 0 | 0 | 12 | 6 |
| English A2 | 0 | 0 | 16 | 8 |
| English B1 | 0 | 0 | 12 | 6 |
| English B2 | 0 | 0 | 16 | 8 |
| English C1 | 2 | 1 | 16 | 8 |
| English C2 | 0 | 0 | 12 | 6 |

N5: から〜まで and 前に, linked to an original library visit. C1: reasoned possibility with may/might well and bounded claims with insofar as, linked to an essay about evaluating a museum accessibility service. Each topic has four examples, mistakes/comparison, prerequisites and five explained exercises. Each reader has aligned paragraph translations, five evidence-based questions and existing source-matched vocabulary. Thirty explained practice items added; vocabulary payloads remain1035, all325 earlier course documents preserved. New totals226 grammar /105 readers, all grammar linked. Full1260/590 target remains short1034 grammar +485 readers =1519; strict --require-targets must still fail.

Authored content was checked for references, examples, answers, distribution, length and source occurrences, with a manual editorial pass over the six new documents. This is not native-speaker certification or exhaustive linguistic review. No claims of official exhaustive JLPT/CEFR vocabulary coverage.

## Verification and limits

Use npm run typecheck, npm run lint, npm test, npm run content:audit, npm run vocabulary:audit, npm run build. New regression tests cover read-only scope, missing/cyclic prerequisites, unchanged daily pins/schedules, retry state, linked-reader priority, backup/language/grade restoration and preserved payloads. Browser audit modes UI_AUDIT_ROADMAP=1 and UI_AUDIT_V31_COURSES=batch12 use actual compiled UI/IndexedDB with an isolated simulated backend. New readers also use the existing download/offline/reconnect audit. Update recovery compares the archived actual Preview13 worker with the new worker.

The delivery receipt/logs provide actual completed results, public build identity, commit and PR. A browser fixture is not owner/RLS or live cloud synchronization acceptance. Physical Android, installed PWA, second-device and native language-editor acceptance remain unverified for this batch. Public deployment verification proves version/worker/page identity only. GitHub CI does not automatically publish to Sites; the existing explicit verified publication flow is retained.

## Exact next breakpoint

1. Obtain real-phone acceptance of the new course route, particularly Back, keyboard and offline reopening; report separately from desktop emulation.
2. Add a bounded “revisit in context” suggestion from actual wrong answers/review history, retaining original source ID and schedule. First inspect existing mistake and budget-plan features to avoid duplication.
3. Continue authored A1/C2 units and source vocabulary gaps, using the unchanged strict long-term targets. Full V3/V3.1 is not complete; paid AI, new scheduling algorithms and whole-app redesign stay outside this batch.
