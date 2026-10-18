# 3.1.0-preview.8 — N5/A2 foundations in context

Based on preview.7 source `54d28a7` / public `8b64638`. Preserve existing277 complete documents,927 vocabulary cards, account isolation, Auth/RLS, admission quota, SRS IDs/dates, notes, downloads and sync. No dependency, backend, hosting or historical migration001–013 change.

## Delivered content

- Four complete N5 topics: は (topic), が (new subject/existence), も (addition), の (noun association). Each includes Chinese meaning and explanation, formation, nuance, four natural kana-aligned examples, common mistakes/comparisons and five explained exercises. は/の are entry points; が links topic and location knowledge, も follows topic knowledge. No artificial prerequisite is invented just to fill a field.
- Four complete A2 topics: should (advice), could you (current polite request), frequency adverbs (main verb versus be), too/enough (limits and sufficient degree). Four examples, practical explanations, differences from existing grammar, meaningful prerequisites and five explained exercises each.
- Two original N5 readers: だれの本ですか (identify and return a book) and 店が開くまで (a shared activity while waiting). Two original A2 readers: A box and a question (a specific request and a changed load) and Read it from the door (checking information from a reader's position). All have aligned translations, real vocabulary/grammar references and five grounded questions including inference and intent.
-32 examples +40 grammar exercises +20 comprehension questions. Fixed options include answer positions0/1/2 per lesson/article. N5 bodies approximately200 characters; A2 bodies approximately180 words. Time estimates use200 Japanese characters/minute or160 English words/minute, rounded up; no personalised speed is claimed.
- Internal editing checks particle roles, は pronunciation, noun association, shared meaning ofも, current-request versus past-ability could, should verb forms, negative never, enough position, level-appropriate narration and source-grounded answers. Corrected references against actual catalog IDs and removed an above-level potential expression from beginner narration. Native-speaker/external teaching review remains pending.

## Actual counts

|Scope|Before|Added|After|
|---|---:|---:|---:|
|Vocabulary cards|927|0|927|
|Complete grammar|190|8|198|
|Complete readings|87|4|91|
|N5 grammar / reading|10 / 6|4 / 2|14 / 8|
|A2 grammar / reading|10 / 5|4 / 2|14 / 7|

All198 grammar have explicit reader links. Other grades unchanged and first-stage coverage remains met. Original277 complete course payloads and927 vocabulary IDs/answers remain exact. Full1260/590 targets still lack1062 grammar +499 readings =1561; strict target checking must remain failing.

## Verification and resume

Regression tests freeze old payloads, verify lesson structure/references/options, select each new real daily lesson and linked reader, restore IDs/answers after language switch/catalog reorder/backup, and keep repeated collections/completions from changing old SRS dates. Required checks: typecheck, zero-warning lint, tests, content audit, vocabulary audit and production build.

`UI_AUDIT_V31_COURSES=batch06 node --import tsx scripts/mobile-ui-audit.mjs` uses all eight real grammar/reading pairs at390px, plus first at360px and last at430px (dark/reduced motion). It checks actual grade, explained practice, reload recovery, anchored explanations, real vocabulary/source/SRS collection and duplicate-safe completion. A2 articles use the existing actual winkNLP worker. One N5 and one A2 reader check downloaded offline question/note/reload and simulated reconnect.

Final results, clean build/commit, publication identity, screenshot/recording artifacts and limits are in the delivery receipt. Chromium exercises actual compiled UI/workers/Service Worker/IndexedDB with simulated accounts/backend. Physical Android/installed PWA, real owner/private writes/RLS negative checks and second devices remain unverified unless separately evidenced. No build-only result is claimed as phone acceptance.

Existing on-demand course compilation/loading, current progress/session stores, SRS and worker adapters are reused; no new React lesson implementation or eager model payload. Existing native wrapper can check the site's update; signing identity and personal records unchanged. GitHub draft branch push and explicit Sites publication remain distinct, without a claim of automatic GitHub-to-Sites deployment.

Next: continue reviewed all-grade linked curriculum, especially advanced N1/C1 context and new vocabulary selected from real lessons; obtain native-speaker and physical-device/real-account acceptance. Full library, real paid AI/media and advanced adaptive services remain unfinished. Do not lower targets, reset data or re-run historical SQL to accelerate counts.
