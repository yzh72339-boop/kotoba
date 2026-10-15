# V3.1 preview.3 — optional Japanese reading analysis

Continuation from PWA canonical-route hotfix source 99a6257. Preserve that correction, Auth/RLS, ten ordinary seats, SRS IDs/scheduling, snapshots, notes, account caches and migrations 001–013. No production SQL or domain change.

The earlier WanaKana 5.3.1 and winkNLP 2.4.0/model 1.8.1 integrations remain. This batch adds exact Kuroshiro 1.2.1, kuroshiro-analyzer-kuromoji 1.1.0, kuromoji 0.1.2 and path-browserify 1.0.1. Published manifests, analyzer initialization/parse code, browser dictionary loader, distribution contents and licenses were inspected; packages were installed with scripts disabled. No existing dependency version was upgraded. An isolated dependency-tree audit returned zero reported vulnerabilities. The full existing project still reports the previously known Next/PostCSS moderate/high advisories; these are not claimed fixed.

## Implementation and learning connection

- Explicit reader button initializes the model in a disposable browser worker. The actual Kuroshiro/Kuromoji analyzer supplies contextual readings and base forms. Kuroshiro's actual `kanaToHiragna` API spelling is isolated in typed declarations/adapter and verified by real-library tests.
- Optional compressed dictionary totals 17,791,956 bytes. Build copies fixed upstream data into `/language/kuromoji-0.1.2/dict/`; it is not in the first-page bundle or shell precache. Worker/model code is also deferred. Do not use a CDN for user-text analysis.
- Dictionary assets are public, immutable versioned data cached after use in `kotoba-language-assets-v1`. The existing worker cache retains optional JavaScript. After initial successful loading, analysis can run offline; cold offline use visibly falls back to the existing lightweight annotations.
- UTF-16 offsets are aligned against original source, including emoji, punctuation and whitespace. Only dictionary-known tokens with valid kana readings receive automatic ruby; unknown words are not guessed. Automatic contextual readings can still be ambiguous, especially names and homographs. Reviewed full-word catalog readings take precedence.
- Japanese base forms connect to existing course cards, e.g. 読ん → 読む and 食べ → 食べる. A clipped surface uses its own reading, not the entire headword reading. Collections keep original card IDs, source paragraph and existing schedule; repeated collection remains idempotent.
- Personal imported text receives noninteractive ruby inside the existing sentence controls. Raw snapshot text, sentence boundaries, translations and context collection remain unchanged. No nested word controls or untrusted HTML injection is used.
- Leaving a course or switching accounts disposes the worker and rejects stale requests. Repeated clicks are synchronously fenced. Input is limited to 100 paragraphs, 10,000 characters per paragraph and 30,000 total, with bounded startup timeout and retry/fallback.
- Account-based reading evidence remains actual successful-review/learning/manual-mark counts. NLP does not invent mastery probabilities, meanings, personal records or SRS schedules.

## Validation and limits

Required commands: typecheck, lint, tests, content:audit, build. Real-library tests cover readings/lemmas, unknowns, Unicode offsets, HTML-shaped text, stable IDs/source/idempotency/backup, personal sentence annotation and optional caching. `UI_AUDIT_JAPANESE=1` runs actual compiled UI/worker/dictionary/SW at 360/390/430px, cold offline fallback, warm offline reload, collection, note persistence, model disposal and personal import. Backend/account are simulated, not production owner/RLS/device acceptance. Final receipts record measured results, exact build and deployment, rather than assuming planned checks pass.

Measure first-page script gzip before/after and first-use desktop Chromium latency. Dictionary initialization consumes material memory; desktop CSS emulation does not establish physical low-memory Android/iOS performance. No streaming, AI service, FSRS migration, full Lute backend or Recharts integration is added. Their earlier compatibility/cost decisions remain valid.

Content unchanged: 927 vocabulary, 181 full grammar, 82 reading. Full curriculum targets remain 1,260/590; strict target validation remains failing. This is a bounded integration preview, not completion of V3.1.

## Runtime and publishing

`npm ci`, configure existing public Supabase `.env.local`, then `npm run dev` or `npm run build`. The prepare step copies optional dictionary/license assets from exact installed packages; it does not execute upstream lifecycle scripts. Keep all licensing notices in public/licenses, including IPADIC. Source archives omit generated dictionary blobs; a standard build reconstructs them from the locked package.

Existing public Sites publication uses supported source/save/deploy. GitHub pushes are separate; main CI validates/packages, not automatic Sites publication. Recovery retains extensionless canonical path support. Rollback redeploys a previous Site version without database/cache resets. Physical device, genuine owner and cross-device acceptance remain separate until actual evidence is supplied.

## First completed verification checkpoint

250 Node tests, typecheck, lint and content-quality audit passed. Compiled Chromium UI with real dictionaries/workers/SW passed 360/390/430px, warm offline reload/collection/note/reconnect, worker disposal and private imported-text annotation. First explicit analysis took 1.4–1.6 seconds on the desktop loopback test; this is not a phone or Internet download benchmark. Initial HTML-referenced script gzip estimate changed from 455,700 to 455,743 bytes (+43); the dictionary remains an optional separate 17,791,956-byte download. Final clean source/build/publication identities and any later verification are recorded in the delivery receipt.

QA assumptions were corrected without fabricating vocabulary: 働く is not currently in the catalog, so its inflection receives annotation without an invented card; 読みにくかった is intentionally covered by the article's grammar marker. The UI collection test uses the actually available 新しく → 新しい entry. Personal import uses the existing preview/confirmation workflow. The final test report has no errors.
