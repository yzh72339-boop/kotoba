# V3.1 preview.2 — ordered preparation and linked N4 units

## Code changes

`prerequisitePath` provides topological, deduplicated same-language preparation suggestions. Completed prerequisites are not recursively re-taught. Missing, foreign-language and cyclic references are explicitly unavailable instead of claimed ready. The grammar page exposes a primary preparation action, ordered lesson links and a return-to-today action. Free browsing remains allowed.

`pinPlannedCourse` prevents freely opening prerequisites, comparisons or another article from replacing a daily task pin. The persisted plan, selected IDs and existing notes/backup/sync format remain unchanged. Returning from a prerequisite after refresh opens the original assigned grammar. Legacy sessions without structured plans keep their prior pinning behavior.

The phone preparation controls wrap long titles and maintain at least 48px height. No new animation/library framework or dependency. Existing Android app loads this hosted frontend and does not need an APK reinstall for this update; use the existing update check, preserving all data.

## Authored content

| Language/level | New grammar | New reading | Current grammar | Current reading |
|---|---:|---:|---:|---:|
| Japanese N4 | 4 | 2 | 21 | 10 |
| Other levels | 0 | 0 | unchanged | unchanged |
| All levels | 4 | 2 | 181 | 82 |

Vocabulary remains **927**. All 257 previous course payloads and answer mappings are hash-frozen in a regression fixture; no prior document is edited.

Topics: evidence-based はずだ, uncertain かもしれない, reported-information そうだ distinguished from appearance, and received-help てくれる. Sixteen kana-supported examples, twenty explained grammar exercises and ten comprehension questions. `雨の前に、確かめる` (285 Japanese characters) links evidence, possibility and reported information with plan checking. `なくしたページ、残った助け` (320 characters) links help, possible past events and ability in a classroom. Both have aligned Chinese translations and eight genuine existing vocabulary links. Reading estimates use 200 Japanese characters/minute rounded upward (two minutes), not invented personal measurements.

Editorial self-review checked connection forms, kana, translations, answer evidence and distractors. Answer order stays fixed; existing saved option mappings are preserved. Schema/length/duplicate/reference checks do not replace independent teacher or native-speaker review.

Full targets are **not complete**: 1,079 grammar and 508 reading documents remain (1,587 total). The all-grade first-stage minimum remains met. `content:audit -- --require-targets` exits 1 intentionally; no target weakening or placeholder content.

## Actual verification

- TypeScript PASS; zero-warning Lint PASS; **237 Node tests PASS** (six new regressions).
- Vocabulary/content audits PASS: 927 words, 263 full documents, zero quality errors or length warnings.
- Production static build PASS: `kotoba-3.1.0-preview.2-47028c643400`; document bodies remain lazily loaded. `/` first-load estimate stays rounded at 414 kB; no new third-party runtime dependency. No physical-phone FPS/memory measurement.
- Chromium at 360/390/430 CSS px, simulated identity/backend: six grammar/reading width combinations verify all four new topics, explicit feedback, frozen-answer reload, linked reading, real vocabulary collection, SRS/source retention, one completion after duplicate click and refresh recovery. Screenshots and one WebM recording are included.
- Three additional width cases verify prerequisite browsing → refresh → return to assigned daily lesson, unchanged plan/pin IDs, no horizontal overflow; 430 covers dark theme and reduced motion.
- These are actual browser/local IndexedDB tests with a simulated backend, **not production owner/RLS/security or physical Android acceptance**. No fresh long-offline/reconnect/cross-device/recording acceptance was performed this batch. Earlier offline/worker tests remain historical evidence, not repeated results.

## Data and release boundary

No changes to Auth, RLS, administrator/member limits, SRS schedules, historical migrations 001–013, sync protocol, private signing key or Android package. No production SQL, data deletion or cache reset. User-reported prior independent-app installation/operation is recorded separately from new-course acceptance.

The delivery receipt defines the exact pushed source, saved Sites version and production deployment. A source commit alone does not prove website publication. The GitHub PR is not automatically merged by this delivery.

## Exact continuation

Continue N4 contextual receiving/giving help and N5 foundations, then more advanced English C1/C2 connected units. Maintain frozen old IDs/mappings, author meaningful prerequisite links and audit every batch. Full Japanese automatic morphology still requires optional dictionary worker download/cache plus real mobile memory/latency and annotation accuracy evaluation. Real AI/media services remain deferred until actually available. Do not replay SQL or invent completion of the full V3 library.
