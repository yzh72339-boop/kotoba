# 3.1.0-preview.9 — open-source analysis in article vocabulary search

Based on preview.8 source `de533b6` / public `62bf2ee`. No dependency upgrades, database migrations, Auth/RLS/quota changes, new schedule semantics or data resets.

## Actual integration

- Article vocabulary search now reuses the existing `useDictionaryExpansion` hook and lazy WanaKana adapter: romanised `yomu` can find the already matched 読む / よむ card. Native IME composition defers expansion; rapid edits, account/language changes and unmount invalidate asynchronous results. Original text remains editable. Import failure keeps normal literal lookup and gives a visible retry explanation.
- The source-aware search adapter searches actual aligned occurrences as well as existing headword/reading/meaning fields. After the real winkNLP analysis identifies `went → go`, searching `went` finds that same original go card. A noun reading is not forced into a verb card. No second English query model or unsupported lemma/card is created.
- Search returns only this reader's existing matched rows; IDs, source paragraphs, private-word scope, marked status, favorites and SRS retain their current paths. Parent reader key remains user+article; language and user ID are passed to the existing request-scope guard. Queries are bounded to100 characters and remain transient, not sent to an NLP service.
- Existing Kuromoji/Kuroshiro morphology continues supplying Japanese aligned source forms such as 読ん. It remains opt-in with explicit dictionary download, not a new automatic17.8MB shell payload.
- Source changes are local: `lib/adapters/reader-vocabulary.ts`, `components/language-tools/reader-vocabulary.tsx` and the parent reader's props. No alternate reader, dictionary, storage or scheduling implementation.

Read-only npm stable metadata refreshed2026-10-18 for the actively used packages: WanaKana5.3.1, winkNLP2.4.0, wink-eng-lite-web-model1.8.1 and Kuroshiro1.2.1 still match locked versions, all MIT. Existing Kuromoji/analyzer license declarations and shipped license texts remain preserved. No package installed/copied/upgraded and no new license obligation introduced. This refresh does not claim every deferred project's maintenance data was rechecked. Lute's separate backend, Recharts' additional chart stack and ts-fsrs schedule migration remain deferred for the documented reasons in OPEN-SOURCE-REVIEW-V3.1.md.

## Original advanced curriculum batch07

Four N1 topics: といえども, にもまして, にひきかえ, をよそに. Two C1 topics: Much as concession and with-background structures with their own nominal subject. Each has four natural examples (kana/Chinese for Japanese), formation/usage/nuance, meaningful comparison/prerequisites, common errors and five explained exercises. Answer positions vary across topics and remain fixed on restore.

Two N1 original readers: 空欄を残す判断 (expertise, attribution and uncertainty) and 拍手の大きさでは分からない (visible indicators and participant interpretations). One C1 essay: Two versions of a correction (editorial voice, accountable correction and limits of access). All include aligned translations, actual vocabulary/grammar links and five grounded questions including inference/author stance. No factual news or professional archive/legal advice is claimed. Internal editing checks naturalness, scope/stance, translations, distractors and references; external/native-speaker review remains pending.

Additions:6grammar +3readers,24examples,30grammar exercises +15comprehension questions. Japanese lengths880/918 characters; English639words. Time rules remain200 Japanese characters/minute or160 English words/minute, rounded up; not personal predictions.

|Scope|Before|Added|After|
|---|---:|---:|---:|
|Vocabulary cards|927|0|927|
|Complete grammar|198|6|204|
|Complete readers|91|3|94|
|N1 grammar / reading|12 / 6|4 / 2|16 / 8|
|C1 grammar / reading|12 / 6|2 / 1|14 / 7|

All204 full grammar retain actual reader links. All289 prior content payloads and927 word IDs/answers remain unchanged. First-stage coverage remains met; long-term1260/590 still lacks1056grammar +496readers =1552, so strict target checking remains exit1.

## Verification and breakpoint

New tests use real WanaKana/wink, original IDs/offsets, unknown/noun ambiguity and bounded/scoped row search. Existing browser reader tests now query Japanese romanisation and actual English source forms, simulate composition/rapid-edit races, collect exactly once, preserve source snapshots/SRS and repeat offline after reload. Browser simulated composition events are not a physical Android IME test.

`UI_AUDIT_READER_WORDS=1` runs both languages across360/390/430, actual optional workers, offline model reuse, marked-state filters, article-scoped review/source and retained source after fixture edit/delete. `UI_AUDIT_V31_COURSES=batch07` runs six actual new grammar/reading pairs, eight course/width cases, N1/C1 downloaded offline drafts and the existing C1 written→write source check when that form actually occurs. Dark/reduced-motion remains covered at430.

Required checks: typecheck, zero-warning lint, all Node tests, content/vocabulary audits, production build and real archived-worker update protocol. Final results/build/publication/artifacts are in the delivery receipt. Actual compiled Chromium/UI/worker/IDB/SW with simulated accounts/backend is separate from physical phone, installed PWA, real owner/private writes/RLS negatives and second-device acceptance; those remain unverified absent separate evidence.

Existing downloads, notes, stable course/card IDs, admission limit, original admin and migrations001–013 stay unchanged. GitHub branch/PR and explicit Sites publication remain distinct; no claim of persistent GitHub-to-Sites automation. Next: additional reviewed all-grade topic units, vocabulary selected from real contexts, and real account/device plus external teaching acceptance. Do not lower targets or replace the scheduler merely to add another open-source package.
