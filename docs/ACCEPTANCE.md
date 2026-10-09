> 最新状态（2026-10-05）：001–009真实只读检查通过；依赖、TypeScript、零警告Lint、57项测试及生产Build通过。Supabase Auth/Data API连通和匿名词汇拒绝已验证；owner账号仍未创建，公共注册需关闭，实际登录/同步/安装待验收。当前操作见[FIRST-RUN.md](FIRST-RUN.md)。旧段落中的网络/Build阻塞属于历史记录，不代表最新状态。

# V2.1–V2.4 acceptance status

Implemented source is not equivalent to verified production behavior. This list tracks each separately.

| Check | Current status |
| --- | --- |
| SRS algorithm and due boundaries | 7 local Node tests passed |
| Migration, conflict merge, event deduplication, deletions, time totals, gestures, exports, capture and daily plans | 20 local Node tests passed |
| Sync concurrency, waiting, retry queues, revision conflicts, edits during save, disposal | 8 isolated local tests passed; real backend pending |
| Publishable configuration, secret boundary, owner-cache binding and server-profile initialization | 11 local Node tests passed |
| TS / TSX / JS / MJS source syntax | 72 files parsed using an available Babel bundle; no type check / build |
| Audio replacement ordering, deterministic conflicts and recording-specific resume | 6 isolated local tests passed; browser playback pending |
| Private logout ordering, local storage lock and late token refresh | 5 isolated local tests passed; real SDK/browser pending |
| IndexedDB transactions and reconnect queue in browser | Pending browser execution |
| TypeScript check / Lint / Next.js build | Attempted: tsc / eslint / next unavailable; dependencies not installed |
| Real Supabase Data API connectivity | Actual public config saved; check failed: sandbox EPERM / proxy unreachable |
| PostgreSQL migrations, RLS, unified SRS and CAS sync | 001–009 Dashboard catalog/data checks passed (user receipts); 80 isolated pgTAP assertions supplied but not run; actual owner/nonowner behavior pending |
| 375 / 390 / 430 / 768 / 1024 / 1366 / 1440 / 1920 | Audit script supplied; all actual viewport runs pending |
| Desktop Chrome / Edge install | Pending real browser verification |
| Android Chrome install and offline review | Pending real device verification |
| iOS / iPadOS Safari home screen, splash, safe areas | Pending real device verification |
| Service Worker update during daily session | Pending browser verification |
| Google + private email/password, one identity | Implemented; Google provider enabled by user, owner account not yet created; actual login pending |
| Cross-device state convergence | Pure merge tests passed; real two-device sync pending |
| AI personalized context and error capture | Implemented; pending configured provider and Supabase |
| Cloud backup and restore integrity | Private upload + checksum and validated snapshot merge implemented; restore browser verification pending |
| Production deployment | Not deployed |

`node scripts/responsive-audit.mjs` requires an owner-authenticated Playwright storage state and the Playwright package. It tests all 14 pages at all 8 required widths, fails on overflow and undersized mobile button targets, and captures 390px / 1440px screenshots. The owner storage-state file contains credentials: store it outside the checkout and never commit it.

Additional device reference sizes: 390×844, 430×932, 768×1024, 1366×768, 1440×900, 1920×1080. The automated sweep uses the specified reference heights (and 375×812 / 1024×768), rather than testing every width at the same height.

Manifest screenshots are deliberately empty until actual browser captures exist. Do not present diagrams or fabricated images as application screenshots.

Current recorded-audio support accepts personal audio files, caches the Blob in IndexedDB, and uploads them to private Supabase Storage. Seed listening material uses device speech synthesis. Uploaded recordings are not claimed to have automatic sentence alignment or pronunciation evaluation. Browser speech services may themselves require connectivity.

Web Push subscription and notification handlers are prepared. Server-scheduled notifications are not enabled without VAPID and scheduling configuration. Background Sync wakes an open app client; when no client is open, sync resumes on the next app launch.

Syntax-only parsing of 72 TypeScript / React TSX / JavaScript / MJS source and test files passed using an already-installed Babel bundle. It did not resolve application dependencies, check types, or run a Next.js build. The backup Zod schema and UI restore need dependency-backed tests.

Local and remote learning-state writes now share an atomic IndexedDB read/merge/write transaction, including the queue marker for local edits. The native transaction behavior and multi-window race must still be exercised in a real browser. The sync coordinator test verifies that a storage adapter returning another window’s committed edit preserves it in the UI.

Migration 007 records original audio selection time and the recording identity associated with a listening position. Its projection assertions are supplied but have not been executed against PostgreSQL.

Phase 1 migration 008 and both pgTAP suites (22 + 18 assertions) are supplied; they have not run against PostgreSQL. The real key is present only in the ignored local environment. Google configuration, actual owner denial, token persistence and installed mobile continuity still require authenticated browser/device runs. No later phase is marked accepted while these checks are blocked.


2026-10-05首发检查：001–009真实只读验证完成；公开环境检查与57项本地Node测试通过。依赖安装再次返回EPERM，额外网络权限请求未完成；TypeScript/Lint/Build实际尝试exit127，Data API检查exit1。没有构建产物或已上线App。AI Tutor、AI Speaking、现代FSRS不纳入首次可用版本验收。当前步骤见FIRST-RUN.md，机器可读结果见FIRST-RELEASE-CHECKS.json。
