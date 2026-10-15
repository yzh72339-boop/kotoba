# 3.1.0-preview.5 — reading vocabulary and personal context

Continuation from preview.4, source cd45c54. No new dependency, schema/migration, registration quota, Auth/RLS, scheduler, card-ID or sync-protocol change. Keep the existing Sites URL and Supabase project.

## Implemented

- A mobile vocabulary sheet indexes only actual source-aligned lexicon matches. It includes catalog words, current-language private dictionary entries and explicit-analysis lemmas from the existing winkNLP/Kuroshiro adapters. Unknown terms do not receive invented definitions/cards. Grammar spans keep priority; exact original IDs and paragraph offsets are retained.
- Search and actual account-state filters (new, learning, successfully reviewed, manually known) help choose words. Counts describe records, not model-generated memory probabilities. Existing manual-known marks remain distinct from successful SRS reviews.
- One sheet switches between the index and existing word details. The list keeps its query/filter/scroll; returning restores focus. Closing restores the original reading anchor. Personal sentence buttons remain separate controls: no nested clickable words or unsafe HTML.
- Collected entries reuse original dictionary IDs, source text and existing SRS schedules. Article-scoped review opens the existing queue; no new scheduling algorithm. Repeated collection remains idempotent.
- Personal readings pass already-supported snapshot/version/paragraph metadata into existing source notes. After editing or removing the current material entry, retained word-source links can still open the original snapshot read-only. Existing manual context cards, old reading-source notes and original course content remain compatible. No snapshot or learning data is deleted by this feature.
- Optional models remain explicit, local and cached after use. No external language-analysis service or new package. Historical Lute/FSRS/Recharts selection decisions remain unchanged; this is an improvement using existing adapters, not a new backend.

## Validation and limits

Commands: typecheck, lint, tests, content:audit, build. New unit tests cover real English morphology into the vocabulary index, invalid/duplicate offsets, stable personal IDs and state evidence, original snapshots through edit/removal/backup, legacy-source compatibility and Japanese grammar/kanji fragment fences. Existing real Japanese analyzer tests continue to cover readings and lemmas.

`UI_AUDIT_READER_WORDS=1 node --import tsx scripts/mobile-ui-audit.mjs` exercises actual compiled workers/IndexedDB/Service Worker at360/390/430px with isolated simulated backend/accounts. Intended coverage includes Japanese and English private import, real analysis, state filters, collection, original source metadata, offline reload, article-scoped SRS and retained old snapshots. Actual outcomes belong to the delivery receipt; do not infer a pass from this command description. Physical Android/iOS, new installed PWA, production owner writes/negative two-user RLS and second-device acceptance remain unverified unless separate evidence exists.

Content remains927 cards /181 full grammar /82 reading. No content additions in this batch; full1,260/590 targets still lack1,587 documents and strict checking remains failing. No full V3/V3.1 completion claim. Existing dependency advisories are not fixed by this feature batch.

## Run and resume

Existing `npm ci`, public-only `.env.local` from `.env.example`, `npm run dev`; `npm run build` creates out/. No SQL replay or cache reset. Source/public SHA256 manifests and sanitized delivery archive are regenerated after checks. Source push and native Sites publication are separate; no automatic GitHub-to-Sites API is invented. Rollback redeploys the previous static Site version without resetting data.

Next: physical-phone and real two-account/device acceptance; continue authored linked courses. Do not replace SRS or add chart dependencies solely to tick off project names.

## Recorded local checkpoint

TypeScript, zero-warning Lint,263 Node tests, content quality audit and static build passed on2026-10-15. The full-target audit still exits1 with1,587 missing documents. Real compiled Japanese/English private-reading checks already passed collection, state filtering, reading-anchor retention, warm-offline model/reload and existing article-scoped review with source text. The dedicated390px English case also passed actual fixture material edit/removal and retained original snapshot display. Final six-case width/theme outcomes and exact clean build/deployment identity are recorded in the release receipt; no physical-device or production-user result is inferred.

QA-only assumptions were corrected: search inputs expose the searchbox role; the existing review flow has a Start review overview; the material list requires the materials route/tab. Application behavior was retained rather than changed to fit selectors.

Measurement correction: the previous preview.4 artifact compared a Node gzip default6 baseline with Python gzip default9 output. Its -780-byte delta was not comparable. Both archived preview.3/preview.4 builds were remeasured with Node zlib level6:458,662→460,799 bytes (+2,137) for HTML-referenced scripts. The earlier evidence report/archive and checksum were corrected; its source/deployment did not change. This batch uses the same compressor/level for both sides. These are packaging measurements, not real phone timings or total startup network.
