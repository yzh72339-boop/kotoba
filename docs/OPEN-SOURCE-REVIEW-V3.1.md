# V3.1 open-source integration — 2026-10-14

2026-10-15 continuation: optional Kuroshiro/Kuromoji integration is now implemented in preview.3; its current adapter, dictionary licensing/cost and verification limits are in [JAPANESE-READING-INTEGRATION-V3.1.md](JAPANESE-READING-INTEGRATION-V3.1.md). The table below records the earlier selection, not a claim that the analyzer is still absent.

Baseline: `feature/3-0-course-coverage`, Sites source `4c70986`, GitHub `d03a79f`. This is **3.1.0-preview.1**, not completion of V3/V3.1. Existing accounts, SRS IDs/schedules, RLS, sync and migrations 001–013 stay intact.

## Evidence and selection

Versions below were queried from GitHub latest non-prerelease releases and npm's stable `latest` metadata. Actual published package manifests, distribution code, typings and license files were examined; Lute's Flask app factory and Python dependency manifest, Recharts' ResponsiveContainer source and ts-fsrs' distributed algorithm/API were inspected. This is more than README review. Compatibility inferred for deferred projects is **not a React 19 runtime test**.

| Project | Stable reviewed | License | Actual implementation / compatibility / operational cost | Decision |
|---|---|---|---|---|
| Lute v3 | 3.10.3 | MIT, repository LICENSE.txt | Python >=3.8, Flask-SQLAlchemy/WTF, natto-py/Japanese native analyzer and its own server/database/templates. Not a React/TypeScript browser component. Server available offline on a separate host, not an IndexedDB/PWA library. Latest observed push 2026-09-05. | Do not install or copy; existing reader/collection already provides the relevant flow. Another backend conflicts with the retained architecture. |
| Kuroshiro | 1.2.1 | MIT | Pure JS conversion with Babel runtime; no bundled TypeScript types. Requires an analyzer. Kuromoji analyzer 1.1.0 depends on kuromoji; current kuromoji 0.1.2 (Apache-2.0) publishes ~41.3 MB unpacked including dictionaries. Browser dictionaries need explicit download/cache, CPU/RAM testing and safe output handling. Core ~264 KB unpacked. No React peer, but Next SSR, types and mobile performance are not automatically established. Latest push 2026-10-08. | Defer full arbitrary-text furigana. No analyzer/dictionary installed or copied. Improve trusted catalog-backed ruby without inventing unknown readings. |
| WanaKana | 5.3.1 | MIT | ESM/CJS with TypeScript declarations, Node >=12; zero runtime dependencies and no React peer. Published tar ~127 KB, full package ~520 KB, not the tree-shaken client payload. Actual romanization and script conversion tested under this Next/React 19 build and Chromium. Local/offline after cache. Latest push 2026-06-29. | **Install exact version** through `lib/adapters/kana.ts`, lazy on explicit click. |
| winkNLP | 2.4.0 | MIT | Browser-safe JS, no runtime dependencies/React peer, published TS declarations. Requires a compatible model. Actual source whitelists mapper function identity; its 2.4.0 generic out/lemma type mismatch is isolated in the adapter and covered with the real runtime. Latest push 2026-05-27. | **Install exact version**; real token/POS/lemma output runs in a disposable worker only after explicit analysis. |
| wink-eng-lite-web-model | 1.8.1 | MIT | TypeScript model declaration, no dependencies; tar ~1.03 MB, unpacked ~3.83 MB. Real local model, not a network API. Initial worker download and memory are material costs. | **Install exact version** with winkNLP; cache worker/model only after use and never send text to an NLP service. |
| ts-fsrs | 5.4.2 | MIT | Distributed ESM/CJS/UMD and TypeScript API, no dependencies; Node >=20 engine (current runtime 24), ~706 KB unpacked. Framework-independent algorithm, but replacing current scheduler needs a real card/history migration and retention validation. Browser/offline algorithm capability does not prove compatibility with Kotoba's persisted semantics. Latest push 2026-10-11. | Defer; preserve current SRS and stable card IDs. No installation or schedule migration. |
| Recharts | 3.10.1 | MIT | TS React components, peers explicitly include React/ReactDOM 19, Node >=18. ResponsiveContainer uses browser sizing observers; SSR/client boundary and layout testing remain necessary. Published package ~7.45 MB unpacked across multiple formats with Redux/toolkit, immer, victory-vendor and other dependencies. Runtime bundle cost differs from package size. Latest push 2026-10-14. | Defer; existing statistics/graphs suffice for counts. New evidence summary uses semantic text, not a second chart system. |

Exact installed versions, URLs and retained copyright/license text are in `THIRD-PARTY-NOTICES.md` and `public/licenses/`; the static distribution includes those files. No GPL/AGPL source was copied, and no project was mirrored wholesale.

## Actual functionality

- Japanese Quick Capture accepts normal IME input. Explicit hiragana/katakana conversion supports romanization and mixed text; composition disables conversion, stale asynchronous results cannot overwrite edited input, and saving uses the existing personal word/sync flow.
- Japanese reader annotations now search the existing full course lexicon, prioritizing linked original IDs. Ruby uses only known complete headwords with kana readings. **This is partial catalog-backed annotation, not Kuroshiro morphological conversion of arbitrary Japanese.** Unknown/inflected/unresolved proper-name readings remain unannotated.
- English analysis is opt-in, bounded to 50,000 characters per request, locally tokenizes text and supplies lemmas/POS. Worker requests time out, clean up on course/account switch, and reuse the model within a course. Offset checks keep the original text intact. Automatic linguistic output can be ambiguous; it is not a correctness authority.
- Inflected reading words link to existing headword cards (reading → read, went → go) rather than creating new IDs or schedules. Unknown lemmas are displayed as analysis but do not invent meanings or enroll unsupported cards.
- Reader marks distinguish new, learning, successful-review evidence and explicitly self-marked known words. The counts are derived from the current account's actual state, not inferred mastery probabilities. Manual marks can be undone. Additional valid catalog lookup/save IDs survive the existing practice draft and are counted from actual article collections.
- Large optional worker/model chunks are excluded from shell precache, while all initial-page assets stay precached. First use warms the existing same-origin cache; after download the worker can analyze offline. No private responses or analyzed text are put in shared caches.

## Security

Install used exact versions and `--ignore-scripts`. All three newly introduced packages have no reported advisories in the observed npm production audit. The existing Next → PostCSS build dependency chain still reports one high and one moderate advisory (source-map file reads/CSS stringify). This update does not upgrade Next to the major version suggested by npm. Production is a static export; user-imported text is escaped React text, not attacker CSS compiled by PostCSS. This limits exposure but is not a claim that the dependency advisories are fixed. A supported patch/override review remains in the follow-up queue.

The worker does not call an external service, use credentials or persist analysis text. IndexedDB, notes and word collections continue through current account-isolated state and sync; no Supabase SQL or runtime provider change.

## Validation boundaries

See the delivery receipt, mobile report and bundle comparison for final measured counts/build. Node tests use real WanaKana and real wink model, not mocked morphology. Browser tests use the actual compiled UI/worker/SW but an explicitly simulated account/backend. Real Android/iOS, installed PWA, owner/new-user cross-device and model linguistic quality beyond tested fixtures remain unverified. Full long-term content targets stay enforced and incomplete.

## Local measured result

231 Node tests, TypeScript, zero-warning lint, content/vocabulary audits and production build pass. Build: `kotoba-3.1.0-preview.1-80b8cf04ee40`. Initial compiled script gzip estimate grows from 450,093 to 451,807 bytes (+1,714); large/worker assets deferred from shell precache total about 922 KB gzip. Package sizes in the table are not frontend bundle sizes.

Eight grammar-to-reading/width cases at 360/390/430px pass against actual compiled pages. Three input-helper width cases preserve collection/reload, guard synthetic composition events, and show trusted ruby. Actual English worker runs offline after cached reload; manual known mark/undo and an offline note survive simulated reconnect. The new C1 inflection card saves its actual clicked `written` paragraph, and duplicate completion stays one. Recorded Chromium flow and screenshots are in the evidence package. First analysis observations range about 0.2–3.3 seconds in desktop Chromium, including fixture operations; these are not physical phone benchmarks or isolated NLP throughput.

QA corrections are recorded: an initial noun-reading→verb-read assumption was removed rather than forcing bad morphology, and a two-heading dictionary selector was narrowed. The final eight-case report has no errors. Update checks at 360/390 passed; a 430 reduced-motion attempt timed out awaiting activation/navigation and was retried separately. Refer to the exact final receipt for the retry outcome; do not silently call the first attempt successful.
