# Kotoba 2.7 checkpoint

Foundation: current working source `1223e27` (2.6 silver release), matching GitHub UI branch `9bd7234`. No design handoff ZIP was supplied for this round; the existing black/white/silver/blue reference and implementation were retained. No applicable AGENTS.md was found at the workspace/project roots.

## What 2.6 actually supplied

Completed locally: shared silver UI, stable curriculum ID pins and parked language/level plans, one-question practice with explicit feedback, reading anchors/settings, indexed local save/offline queue, readiness classification, reviewed 010/011 receipts, SRS/capture/source linkage, PWA update/recovery, 150 grammar / 60 reading documents and 667 vocabulary cards. Its baseline suite was rerun: 170 tests pass.

Partial: grammar/reading long-term targets, lexical coverage of advanced articles, related reading coverage and device acceptance. Not verified by the worker: real-owner writes, production RLS CRUD, second-device convergence, physical Android/iOS installation/keyboard/frame-rate and in-session installed updates. Existing AI/speaking services are not certified available; no new AI capability was added.

## This round

- Phone word index is vertical, with 44px+ targets and a selected-word sheet. Details, examples, collocations, add-to-learning and source/reading/SRS actions retain one canonical card ID. Language/level changes discard stale view filters rather than retaining an unrelated flashcard run. First-mount focusWord routing is preserved.
- Existing daily scheduler/pins are retained. Learn uses actual due counts. Completed older-day sessions cannot fabricate today's completion. Home explains the next pair when the user starts again; related reading labels reflect actual content level and the currently pinned/fresh plan.
- Readings use their own language for settings, speech and source collection; English references require whole words/phrases. No substrings or nonexistent word occurrences were added to satisfy counts.
- 220 distinct original lexical entries, including expressions, were added across 11 grades. Every entry has pronunciation, Chinese meaning, contextual example/translation, POS and collocation. Original 667 payloads are guarded by SHA-256 regression tests; all old IDs remain intact. 19 existing repeated surface forms are preserved across old sources/levels.
- Existing articles gain 306 explicit current-grade word links; 143 of the added entries occur in those existing texts. Two new Japanese readings add more context and bridge foundation conjugation and N2 obligation/limits. Original examples, translations and the two new articles/questions were spot-checked; external editorial review is still recommended. See VOCABULARY-AUDIT.md for exact graded counts.
- A shared scroll-header surface change and scoped hero labels complement the existing continuous card/title/example/navigation/feedback animations. All listeners clean up; reduced-motion rules and capability fallbacks are retained.

## Counts

| Language | Grade | Vocabulary cards | Added cards | Complete grammar | Complete readings |
|---|---|---:|---:|---:|---:|
| ja | N5 | 70 | 20 | 10 | 6 |
| ja | N4 | 70 | 20 | 10 | 5 |
| ja | N3 | 81 | 20 | 10 | 5 |
| ja | N2 | 170 | 20 | 50 | 11 |
| ja | N1 | 70 | 20 | 10 | 5 |
| en | A1 | 70 | 20 | 10 | 5 |
| en | A2 | 70 | 20 | 10 | 5 |
| en | B1 | 76 | 20 | 10 | 5 |
| en | B2 | 70 | 20 | 10 | 5 |
| en | C1 | 70 | 20 | 10 | 5 |
| en | C2 | 70 | 20 | 10 | 5 |

Total: 887 course cards / 150 grammar / 62 reading. All stage grade minimums are met; full targets remain 1,260 grammar / 590 reading, with 1,638 units missing. `--require-targets` fails intentionally and remains enforced. This lexical batch is not an exhaustive JLPT/CEFR dictionary.

## Reproducible verification

Use the existing Node 24 / npm 11 lockfile:

```sh
npm ci
cp .env.example .env.local
# Configure only your own Supabase URL and Publishable Key for browser initialization.
npm run typecheck
npm run lint
npm test
npm run content:audit
npm run vocabulary:audit
npm run build
```

No package dependency was upgraded. Browser-only static preview: `python -m http.server 4174 --bind 127.0.0.1 --directory out`; this is a local preview, not a phone-accessible production URL.

Checks: TypeScript and zero-warning ESLint pass; 178 Node tests pass. Content and vocabulary audits pass with zero errors; content length warnings are zero. A read-only real Supabase probe reached the Data API and confirmed anonymous vocabulary rejection (42501); owner permissions remain unverified.

Chromium mobile emulation covers 15 workspaces at 360/390/430px. Isolated browser tests exercise one genuine UI due-card submission (rapid repeated click creates one event), pinned prerequisite grammar → linked reading → explanations → completion → restored 3/3, notes in a shortened viewport, rapid route changes/Back, new word sheet/add/reload and language switch, light/dark/reduced motion, local downloaded IndexedDB content and Service Worker offline reload, and reconnection to a simulated RPC backend. No unknown Supabase call is allowed by the harness; no production learning record was written.

The recordings/screenshots are compiled application UI with real curriculum content and a simulated identity/backend. They are not owner, real RLS, real Android/iOS, physical keyboard/safe-area, installed PWA, second-device or physical frame-rate acceptance. Source changes after the full browser matrix require the final release core check; external delivery evidence identifies its final build.

## Deployment and next breakpoint

Working branch: `feature/kotoba-2-7`. Original Sites project/audience are preserved; no production SQL is run. Saved-version and native deployment receipts, rather than a source PR, establish actual publication. Update using the existing `/api/app-update.html` recovery page; never clear learning storage to update.

Next operator/device acceptance: owner login → start → rate a due card → grammar → related reading → collect word/sentence → check answers → finish → refresh → downloaded offline learning → reconnect → second-device continue → installed update preserving state. Keep AI/service additions and full curriculum expansion on later batches.
