# Kotoba 2.6 — Silver / Blue UI

Latest visual reference is the owner's black/white/silver + blue mobile composition. Violet and lime explorations are superseded.

## Implemented

- One light gray / white and dark graphite token system, blue primary controls, consistent borders, typography, 44px targets, safe-area surfaces and modal geometry.
- Compact Today: real pinned grammar/reading title, actual first example/translation, real prerequisite level, transparent plan minutes, enrolled due count, actual new-word count, related/resumed reading. Quick capture remains in More instead of covering content.
- Grammar/task shared surface, title and example snapshots through native View Transitions. Linked grammar title travels to its first reading highlight only when the article actually contains that expression; fallback reading is not falsely labeled linked.
- Route ID committed before scene capture, preventing old grammar IDs opening inside the next reading step. Latest navigation wins; learning writes remain outside animation cancellation.
- Back scroll/history restored; list filters are stored in browser history scoped to account/language/level/type. Exact grammar/reading practice drafts keep their existing IDs and option mapping.
- Adjacent answer/explanation feedback, stable question navigation, themed reading covers and marks, Japanese font fallback, stable modal anchors and interactive cancelable handles.
- Learning completion survives closing the results and refresh (3/3); it is not carried into another level or tomorrow.
- Vocabulary, Review, Library, personal tools, listening/speaking/AI, Progress, Settings/Profile, sign-in and the separate update page share controls and materials.
- Save states remain the existing real local/queue/failure/cloud states. Images are cached by the existing SW; no private API caching is introduced.
- Reduced motion and unsupported/constrained browser fallbacks; no continuous decorative animation or blur.

## Verification

- 170 Node tests; TypeScript; zero-warning lint; production static export pass.
- Content audit: 210 complete units, zero errors / length warnings, 2.6 stage coverage met. Full V3 targets remain short by 1,640, and --require-targets intentionally fails.
- Chromium emulation: 15 routes × 360/390/430 = 45 combinations, no horizontal overflow / visible targets below 44px. Light/dark/reduced-motion screenshots and full learning recording produced.
- Actual app code against an intercepted fixture backend: daily review (empty enrolled queue) → grammar exercises → reading quiz → completion → home; refresh, note drafts, collection into existing SRS, wrong-answer explanations, quick nav and browser Back pass.
- Local SW/IndexedDB: downloaded reading and an offline note survive offline reload; reconnection drains to the fixture backend and displays synced. The fixture has no real Supabase credential and unknown requests fail closed.

## Not certified

Real owner login/RLS writes, second device, Android/iOS installation, actual keyboard/safe-area behavior, real-device frame rates, and a production update while learning are not re-certified. A shorter Chromium viewport checks geometry, not a physical keyboard. Existing owner receipts remain historical evidence. No AI endpoint/model or real pronunciation service was exercised.

## Assets

Reading photo: https://images.unsplash.com/photo-1545569341-9eb8b30979d9 (Unsplash, https://unsplash.com/license). It is a decorative Japan cover, not a photograph documenting each article. It is subject to its own photo license; MIT applies to project code/original content. English reading retains the original local editorial illustration. No remote image/font dependency was added to the reader.

## Release

Use the existing hosting project/audience, commit and push the tested source, package its static `out/` plus `.openai/hosting.json`, save/deploy that version. Database migration is not part of this release. Installed users use `/api/app-update.html` after pending learning has saved/synced; do not clear IndexedDB, caches or accounts.
