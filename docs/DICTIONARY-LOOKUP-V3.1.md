# 3.1.0-preview.4 — local dictionary lookup and learning evidence

This continuation uses the already installed WanaKana 5.3.1, winkNLP 2.4.0 and wink-eng-lite-web-model 1.8.1. No dependency or database change. Japanese morphology from preview.3, PWA recovery, all original course/card IDs, Auth/RLS, registration quota, account-scoped storage and sync remain intact.

## Implemented

- Japanese dictionary queries retain literal input and add debounced hiragana/katakana candidates, including romaji and half-width text. Native IME composition is respected; exact literal matches rank first. The original query, not generated aliases, is saved in existing per-account search history.
- English single-word lookup offers explicit on-device morphological analysis. Real model lemmas match exact headwords, without expanding `go` to `government`. Standalone `reading` remains ambiguous/noun according to the model; multiword/invalid mappings are not invented. Raw search remains usable if the optional worker fails.
- Worker requests/results are scoped to account, language and query. Query changes, composition, language/account changes and leaving the page dispose old analysis. Repeated clicks are synchronously fenced. No search text is sent to a language service; normal authenticated learning/history sync is unchanged.
- Dictionary details show actual review-event count, current repetitions, interval, lapses, due date, latest same-language review, saved reading sources, sentences and speaking records. Substring coincidences such as `read` in `already` are excluded. Manual known marks are separately identified. Removed computed percentages that could be mistaken for memory probabilities. `Review 3+` is an explicit consecutive-rating threshold, not a mastery diagnosis. The scheduler and saved state schema are unchanged.
- Existing add-to-learning, original stable IDs, source links, flashcard grading, backup/reload and offline workflows are reused. Cached optional JS/model assets can run offline after a successful load; a first-ever offline model load can fail visibly.

## Verification boundary

Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run content:audit`, `npm run build`. `UI_AUDIT_LOOKUP=1 node --import tsx scripts/mobile-ui-audit.mjs` exercises the compiled app against an isolated simulated account/backend with real libraries, workers, IndexedDB and Service Worker at 360/390/430 CSS px. These are desktop Chromium tests, not Android/iOS, production owner, negative RLS or cross-device acceptance. Exact check results and production identity are in the delivery receipt, not inferred from a build.

Content unchanged: 927 graded vocabulary cards, 181 full grammar topics, 82 readings. Full 1,260/590 targets still lack 1,079 grammar and 508 readings. `content:audit -- --require-targets` must remain failing; no placeholder expansion or altered standards. Existing Next/PostCSS advisories remain recorded and are not fixed by this batch.

Production stays on the existing Sites URL and database. GitHub validation/PRs and a native Sites deployment are separate; no unsupported automatic publication API is claimed. Next work: reviewed curriculum batches and physical-phone/offline/two-account checks; no FSRS migration, extra graphing stack or real AI service added here.

## Local acceptance recorded 2026-10-15

- TypeScript, zero-warning Lint, **257 Node tests**, content audit and static production build passed. Seven new tests cover real WanaKana/wink model outputs, irregulars/noun ambiguity, exact-alias ranking, per-account query identities and genuine source/review evidence with backup preservation. An initial test expected the absent `study` headword; it now tests the actual model lemma and only expects headwords present in the catalog, without inventing content.
- Compiled dictionary UI passed at **360/390/430px**: romaji/kana/half-width lookup, raw history reload, collection plus one real SRS rating, offline reload with retained event/interval, IME composition, language reset, explicit irregular lookup, warm-offline analysis, rapid-click worker fencing and actual SPA-unmount disposal. 430px also covered dark/reduced motion. Cold-offline optional model failure and online retry were exercised at 360px.
- Prior production preview.3 archived Service Worker → preview.4 update protocol passed at all three widths: metadata detection, unchanged-server result, HTTP503 asset/metadata failure, reload/waiting identity, data/auth/download/queue retention, offline truthfulness and multiple-window refusal. This remains loopback testing with fixture data; production static identity is checked separately after publication.
- Final screenshots wait for sheet motion to settle. A QA-only current-level filter assumption was corrected: `go` belongs to a lower level, so the test explicitly selects All levels after switching language, matching the UI's stated scope. No application defect or SRS adjustment was needed for that assertion.
- Full-target audit exits **1**: no malformed units, **1,587** documents still missing against long-term targets. No physical Android/iOS, real owner write, negative two-user RLS, second-device or new installed-PWA acceptance was performed. No full V3/V3.1 completion is claimed.
