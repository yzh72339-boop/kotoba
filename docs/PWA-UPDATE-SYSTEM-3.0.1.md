# Kotoba 3.0.1 — version detection, safe installation and publication

## Baseline and hosting audit

This engineering release uses the latest preserved source, including the earlier 3.1 preview features (927 words, 181 grammar, 82 readings). The requested software release label is **3.0.1**; no older source/features are restored. Build identities are compared by exact equality, not semantic version ordering, so a client displaying 3.1-preview can receive this specifically named fix.

The existing production is **ChatGPT Sites**, project `appgprj_6ac1a9e96d98819186da139d6549225e`, public audience, unchanged origin `https://kotoba-language-studio.cleric-motif-0n.chatgpt.site`. Prior saved publication: Sites 34, source `fa82099aa649b3ff9116f8ca35d3dc64cf44f9d1`, build `kotoba-3.1.0-preview.2-47028c643400`.

GitHub is a separate repository (`yzh72339-boop/kotoba`), with the previously confirmed `feature/3-1-language-tools` commit `cf7d4f7c4b0562afd1ade7c04bd22c213a45d2a1` and draft PR9. A GitHub commit does not publish the Site. Current source is on `fix/3-0-1-pwa-updates`. Current GitHub CLI initially returned 401; remote push/CI must not be claimed until actual authorization and receipts are obtained.

Audit found: no independent server metadata; boolean waiting-worker detection; swallowed automatic registration/check failures; no common explicit-confirmation/multi-window acknowledgement in the in-app path; a new controller could be confused with the older still-running page.

## Implemented protocol

1. `finalize-pwa.mjs` emits `/api/app-version.json`: schema, software version, exact build ID, UTC build time, Git SHA when available and dirty-worktree flag. Every app HTML route embeds its own immutable `kotoba-build`/`kotoba-version` identity. Recovery HTML is deliberately separate.
2. Shared `public/api/update-core.js` (typed through its declaration/adapter) powers both application and network-only recovery page. Metadata requests have a unique query, `cache:no-store`, `Cache-Control:no-cache` and a bounded timeout. `/api/` bypasses old/new SW caching. Worker download additionally uses a build-specific `/sw.js?_kotoba_build=…` script URL with the same `/` scope to avoid a stale CDN script, without unregistering or resetting data. Responses require valid schema/build/time/Git fields; HTTP, auth, HTML, malformed metadata and timeouts have different errors.
3. Current page, active controller, latest server and actual waiting worker are shown separately. A latest controller with an older page requires a safely saved reload, not a false “latest” result. A refresh reconstructs waiting identity by worker message, not a persistent ready flag. Offline means server unverified; already downloaded identity can still be shown.
4. Start, visible foreground/pageshow and online recovery perform checks. Normal automatic checks are limited to five minutes; a reconnect can retry after thirty seconds. Manual checks bypass this limit. Render changes do not issue requests. Errors remain visible in Settings.
5. Update opens a confirmation sheet. Existing `flush()` waits for the save chain and commits current state/queue; storage failure blocks installation. Unsynchronized records can remain queued; cloud success is not required or invented.
6. Waiting worker identity is verified again, then an acknowledged activation checks same-origin source, expected build and all other windows. Other windows block activation. Exact controller identity must be observed before reload. Legacy requests receive a recovery URL without activating other windows. Already-loaded old JavaScript cannot acquire the new reply handler; use the network-only recovery page when its old button stalls. Chromium explicitly rejects navigation from the waiting worker because it is not the client's active worker, so this release does not bypass that protection.
7. Install validates HTTP responses and the shell HTML build before activation. Missing/stale release assets fail installation, retaining the old active worker. Asset path/HTTP diagnostics are delivered to the client. Activation does not delete caches, IndexedDB, auth state, queues or downloaded lessons. Exact immutable hashed app/model assets can be reused from prior shell caches for offline availability; an old HTML shell is never reused as the new build.
8. Settings recovery navigation flushes first. A directly opened recovery page asks the user to confirm records were locally saved and other windows closed; it never pretends to flush another closed tab. Update success is verified against real new page/controller IDs. Optional session-only notice flags are not learning records.

## Automatic publication: supported capability and limit

The available official Sites workflow is source push → native `save_site_version` with the exact commit/archive → native `deploy_site_version` → terminal deployment receipt. Native connector publication is supported in an authorized Codex session. The available push-publication window is for owner-private Sites, not a persistent GitHub webhook for this public Site.

**No supported, callable GitHub continuous-deployment interface for this existing public Sites project is available here.** No endpoint, long-lived Sites token, GitHub-to-Sites API or unattended success is invented. The domain/audience, Supabase project and ten-user mechanism are not changed. Each release still requires the supported Sites publication step until the platform offers a suitable integration or the owner approves another host.

`.github/workflows/release-validation.yml` is real CI for release branch `main` and PRs into `main`: locked dependency installation, typecheck/lint/tests/audit/build and a static artifact with commit identity. It **validates/packages, does not deploy Sites**. Repository variables `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` must be configured; never use service role. The full 1,260/590 curriculum target remains intentionally unmet, and strict target checks are not weakened.

Optional official GitHub automatic-hosting choice: **Vercel Git integration**, production branch `main`, Next.js static export (`npm run build`, `out`), existing public Supabase variables and direct Auth mode. Importing the repository and approving a new production origin remain owner actions. This task does not create a Vercel project, change DNS/domain/Auth redirects, migrate DB or move local account data across origins. Existing `.chatgpt.site` is not a custom domain that we can repoint automatically. Offline origin storage must be synced before any approved future origin change.

For that optional host, add no-store headers for `/api/app-version.json` and `/sw.js` through its official configuration. Sites source manifest does not expose a documented custom-header setting in this workflow; current detection therefore uses network-only API routes, unique query strings and request cache bypass, verified after actual publication.

## Verification and manual acceptance

Run: `npm run typecheck`, `npm run lint`, `npm test`, `npm run content:audit`, `npm run build`. Then `npm run test:updates:browser`; set `UPDATE_OLD_ROOT` to an archived previous `out/` for actual prior-worker compatibility. Without an archive, the script honestly labels its retagged-worker fixture. Browser uses loopback real workers/cache/IndexedDB with isolated fixture records, not production accounts. Public release identity: `npm run release:verify -- --url <existing-origin> --expected <exact-build>`.

The delivery receipt/test reports define actual results: A published update detection; B no update; C missing asset/HTTP failure/stale HTML; D reload pending; E exact new build; F learning/queue/auth/download/prior-cache preservation; G offline unverified; H other-window block; J legacy recovery. I Android Chrome installed-PWA and physical phone remains **unverified without actual device evidence**. Production publication/metadata checks are distinct from production authenticated learning and physical-device acceptance. No synthetic account fixture is called an owner test.

For an existing installation, save locally → Settings check/update → confirm → close other same-browser Kotoba windows if requested. If its old UI cannot recover, open `/api/app-update.html` **inside the same app/browser profile**. Chrome and the independent WebView app have different SW/storage; updating Chrome alone does not update the WebView. Keep unsynced queues and use the original account. Never clear app/site learning data to resolve updates.

## Remaining operations / rollback

Production redirect correction (2026-10-15): a direct server request confirmed HTTP 200 at final `/api/app-update` after requesting `/api/app-update.html`. The worker's `.html`-only recovery-route check silently dropped that message, yielding the user's timeout even with a correctly downloaded build. Accept both canonical paths and reply explicitly on other paths. The regression failed before the fix; browser QA now models the real canonical redirect. No origin, expected-build or other-window fences are removed.

GitHub reauthorization and repository build variables may be required before CI/push. Native Sites terminal receipt establishes publication; a source commit is insufficient. Physical phone, genuine owner learning/SRS across update, another device and Supabase synchronization still need separate acceptance.

Rollback uses an existing saved Site version through the official deploy operation, preserving audience and DB. Do not re-run migrations or clear local data. Recovery/metadata mismatches deliberately block a falsely reported install. Keeping prior shell caches avoids data/download removal but can increase storage over repeated releases; bounded obsolete-static-cache management is a later reviewed change, not a hidden reset in this repair.
