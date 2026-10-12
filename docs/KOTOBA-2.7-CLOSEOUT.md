# V2.7 closeout — local engineering checkpoint

Date: 2026-10-12. Starting source: Sites `0572968d0b539e5cfc6288ff9a5a6ade82a966c1` / GitHub `f4da3be6b5445919fdd3009d8a676896cb7de504`, package 2.7.1. Instructions: [development plan](Kotoba-Development-Plan-2026-10-12.md). No applicable AGENTS.md was found. This checkpoint is based on current source and rerun commands, not the Version 13 numbers or plan claims.

## Task state before this round

| Requirement | State | Evidence / next acceptance |
|---|---|---|
| Real daily course IDs / prerequisites / unfinished reading / explicit fallback | locally verified | daily-course-plan, session-course and current regression tests; prior mobile 3/3 fixture |
| Pause / resume / scope parking / cross-day plan rules | locally verified | language/level-specific pins and restored drafts; timezone/date regressions |
| Review / collection / completion / sync replay idempotency | locally verified | SRS, review-cycle, sync and coordinator regressions; no production writes |
| Readiness categories / owner-project isolated cache | locally verified | readiness-state and auth/cache tests; unavailable RPC is distinct from migration missing |
| Grade labels / content-language speech, source and statistics | locally verified | real document props, scope-reset logic, tests and prior fixture UI |
| Silver/graphite/blue, light/dark, global navigation and portal states | locally verified, device acceptance pending | current CSS/components and historical 45 width/page checks |
| Five linked motion scenes / interruption / reduced motion | implemented with local evidence | scene-transition tests and previous UI recording; refresh current browser evidence this round |
| Refresh after confirmed local save | locally verified | prior complete course and N2 batch checks |
| Explicit reload during an unfinished local save | gap | visual answer feedback preceded the async IndexedDB commit; no unload protection |
| Enlarged text / reading → full grammar → Back | implemented, further browser evidence needed | this round adds targeted checks rather than assuming prior width checks covered it |
| Per-grade 10 grammar / 5 reading stage line | locally verified | current audit: 154 grammar / 66 reading, each grade satisfies its own floor |
| Full 1,260 grammar / 590 reading | partial | 1,630 document gap; strict target check still fails |
| Real owner CRUD / RLS / second-device continuity / physical PWA | unverified / environment-limited | no owner session or physical device is available to the worker |
| Listening / AI / scoring beyond current real services | deferred | no new capability claimed; keep plan stages 2.9/3.0 separate |

## Implementation

- `pending-save.ts` installs a native beforeunload warning only while the local transaction is saving or local save failed. Saved offline records, cloud retries, and successful fallback saves can leave normally. Cleanup removes listeners when state changes or the provider unmounts. The existing IndexedDB transaction, queue, merge/idempotency protocol and owner gate are unchanged.
- Daily reading now derives the shared expression ID from its active pinned plan, with the existing explicit grammar-link hint retained for paused/free browsing. Refresh therefore preserves the grammar/reading association without an extra business-state field. The course IDs, completion rules and scheduler are unchanged.
- The saving label explicitly asks the user to wait before refreshing. A visible quiz result is not a storage-commit acknowledgment. Choosing to remain lets the existing save finish; this is not a background synchronous save or a guarantee against OS process termination. Browsers may suppress beforeunload on mobile; do not call that real-device persistence acceptance.
- Add regressions for unload cancellation, cleanup and local-vs-cloud status. Browser QA uses a second same-origin fixture tab to hold a real IndexedDB transaction, cancel reload while pending, release it and verify the saved question on refresh. No production records or credentials are used.
- Existing mobile QA waits for save confirmation before intentional refresh. It adds 150% computed text enlargement across core pages and reading/full-grammar Back position checks. This simulates browser font scaling, not OS text size or a real soft keyboard.
- Package/SW metadata advance to 2.7.2 only for this compatible patch. No major/minor feature claim, dependency upgrade, course rename, content deletion or migration.

## Counts and stage progression

No new curriculum is generated in this engineering batch. Counts remain **927 vocabulary / 154 grammar / 66 reading**. N2 remains **210 / 54 / 15**. Exact grade table and qualification checks: CONTENT-AUDIT.md / VOCABULARY-AUDIT.md. Keep all 667 original and 260 contextual cards, course IDs, notes, history and schedules.

Baseline rerun: 180 tests pass, zero content/vocabulary errors and zero length warnings. Patch suite: 182 tests pass; TypeScript, Lint and production build pass. Current browser screenshots/recording and actual publish receipt are stored in the external delivery; do not substitute the old build or status text for that evidence.

## Current local acceptance and next breakpoint

Current Chromium fixture acceptance passed: 24 main-page/width checks with 150% computed text, held real IndexedDB transaction + explicit close warning/cancel/save/reload, reading → full grammar → Back at the actual clicked anchor, simulated 520px visualViewport keyboard, 844×390 landscape, complete daily review/grammar/reading/results/home and restored 3/3, rapid navigation/Back, dark/reduced motion, downloaded local SW/IndexedDB offline note and simulated reconnect. Current fallback and capable-device-simulation core-flow recordings are retained. The capable profile (8GB / 8 cores, explicitly emulated) started 23 native transitions, 19 became ready, and 4 were intentionally skipped during rapid navigation; all reported rejections were AbortError: Transition was skipped. Homepage pause/resume retained the exact grammar ID/title; the daily reading exposed exactly one shared grammar expression. This is native API path evidence, not a physical-phone FPS measurement. The apparent initial Back-position error was automatic test clicking scroll, not a product defect; reading/anchor code was left unchanged. These remain distinct from physical Android/iOS, owner CRUD, real cross-device and installed update evidence.

After local 2.7 closeout, 2.8 should connect existing N2 grammar that lacks readings and build continuous topic chains, using the current stage counts. It need not regenerate already qualified content. 2.9 listening requires traceable playable audio and genuine mobile playback/recording; 3.0 AI requires working server services and clear usage limits. Neither is introduced before the core acceptance boundary is explicit.

Owner/device acceptance path: login → Today → due review → pinned grammar → linked reading → wrong/correct explanations → collect word/sentence → finish → reload → downloaded offline note/practice → reconnect → second device → install/update. Separately mark owner, physical keyboard/safe area, interruption, PWA and second-device results. Do not reset data, rerun migrations or disable RLS to achieve a passing result.
