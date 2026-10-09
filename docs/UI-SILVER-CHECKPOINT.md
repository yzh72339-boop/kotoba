# Silver UI checkpoint

Branch: feature/mobile-silver-motion.
Commit message: Refine Kotoba mobile silver UI and coordinated learning transitions.
Source baseline: Sites commit 78d6195e + open-source docs e22595b; GitHub main 0555d0b (existing 2.6 source).

Core application remains Next.js / Supabase / IndexedDB / PWA. Protected database migrations, Auth/RLS/owner restrictions, SRS, canonical content and sync protocol were not rewritten.

Resolved during browser QA: deferred route update could mount Reading with the old grammar ID; destination URL now commits before visual navigation. Due/new cards and actual prerequisite level no longer mislabel the homepage. Final 3/3 survives returning/refresh without changing scheduling.

Artifacts: before/after home, grammar, reading, practice/error, completion, profile/settings, dark/reduced-motion and offline-restored screenshots; mobile-learning-flow.webm; mobile-ui-report.json. Browser fixture results are not owner or physical-device acceptance.

Remaining: owner/device/cross-device/install/update acceptance; further article-specific cover imagery; full V3 content expansion (1,640 missing units); real AI service verification. No new database migration is required for this UI.

Continue by checking real owner workflows at the deployed URL. Preserve learning data on updates. Do not reset cache/database or reopen historical migrations to solve visual issues.
