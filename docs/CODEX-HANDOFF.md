> Current continuation: **3.1.0-preview.2**, 927 vocabulary /181 grammar /82 readings. Read V3-CURRICULUM-BATCH-03.md and CURRENT-STATUS.md first. Daily pins are protected by `pinPlannedCourse`; ordered preparation uses `prerequisitePath`. Preserve all old IDs/data, Auth/RLS, SRS/sync and migrations 001–013. Strict full targets still fail by 1,587 units. Previous checkpoints below are historical.

# Current: V3.1 language-tools preview — 2026-10-14

Based on feature/3-0-course-coverage (Sites 4c70986 / GitHub d03a79f), this batch adds 11 grammar and 5 readings: current 927 words /177 grammar /80 reading, all current grammar linked. Full targets still lack 1,083 grammar and 510 reading. No historical migration 001–013, Auth/RLS, SRS card ID/schedule or synchronization protocol change.

Actual integrations: exact WanaKana 5.3.1, winkNLP 2.4.0 and wink-eng-lite-web-model 1.8.1. Native IME-safe explicit kana conversion, local opt-in English lemma/POS worker, headword/source-preserving collections and actual account-based reading evidence are implemented. Japanese annotation is bounded catalog-backed ruby, not full arbitrary-text furigana. Unknown, homographic and partial-kanji readings are not guessed. Full FSRS/Lute/Kuroshiro/Recharts integrations are deferred for specific compatibility/cost reasons. Read OPEN-SOURCE-REVIEW-V3.1.md and V3-CURRICULUM-BATCH-02.md.

Native publication receipt defines the exact deployed build and version. Local Chromium tests use real libraries/workers/SW and simulated account/backend; physical mobile, installed PWA and new production account/cross-device acceptance remain separate. Existing Next/PostCSS build advisories are recorded, not claimed fixed. Full V3/V3.1 is incomplete. Earlier checkpoints below are historical.

---

# Current: 3.0.0-preview.1 linked curriculum — 2026-10-14

Baseline Sites source `3398ec2` / GitHub `3e085bd`; branch `feature/3-0-course-coverage`. This bounded V3 content batch adds 12 original grammar topics (N2 +10, N1 +2), 48 examples, 60 grammar exercises and 5 original readings (N2 +4, N1 +1) with 25 grounded comprehension questions. All 224 prior course documents and 927 vocabulary payloads/IDs/answers remain byte-equivalent after parsing. New readers connect the ten previously unlinked grammars; all 166 current grammar documents now have an explicit reading link. No Auth/RLS/SRS/storage/sync change or migration 001–013 replay/edit.

Counts: 927 cards /166 grammar /75 reading. N2 64 grammar /23 reading; N1 12 /6; other levels unchanged and still meet the first-stage floor. Full 1,260/590 targets remain incomplete: 1,094 grammar +515 reading =1,609 missing. Strict `content:audit -- --require-targets` exits 1 as expected; its standard is retained.

222 Node tests, TypeScript, zero-warning Lint, content/vocabulary audits and production build pass. Build `kotoba-3.0.0-preview.1-8e4c66afc533`; article bodies remain lazily fetched. Ten course/width combinations across 360/390/430 verify practice/feedback, frozen answer reload, linked article, vocabulary/grammar collection, one completion and layout. N2/N1 downloaded article offline note/reload + simulated reconnect and real compiled-worker update tests pass. A QA-only N2 grade assumption was corrected for the N1 checks; application grade display was already correct. Fixtures are not actual owner/RLS/device/FPS acceptance.

User reports successful live ordinary-account signup, save/refresh restore and cross-device synchronization on the prior 2.9.1 direct build. Read-only quota confirmed ten seats and nine remaining. This user evidence is preserved separately from automated tests; new V3 lessons/installed PWA and genuine A/B negative RLS checks remain unverified on production. Site audience is public; exact new deployment/version comes from the native receipt. Direct signup/password and original admin UID/data remain preserved.

Read V3-CURRICULUM-BATCH-01.md and CONTENT-AUDIT.md. Next bounded content batch: strengthen the N4 conjugation prerequisites (potential/volitional), then expand English C1/C2 contextual units while keeping original IDs; continue the full per-level targets. Real AI/writing feedback, traceable listening and adaptive-rule service acceptance remain future work, not delivered capabilities. Do not claim full V3/RC completion or ask for secrets in chat.

Prior checkpoints below are historical.

---

# Direct registration checkpoint — 2026-10-14

The user explicitly superseded the earlier email-confirmation/CAPTCHA/SMTP requirement: use email/password direct signup. `NEXT_PUBLIC_AUTH_MODE=direct` skips the frontend CAPTCHA dependency, returns immediate signup sessions to the app and honestly disables mail-based recovery. Verified mode remains available via `NEXT_PUBLIC_AUTH_MODE=verified`. The Supabase server remains authoritative; the frontend cannot turn off its confirmation/CAPTCHA policies. Strong passwords and all admission/RLS/UID/queue/SRS fences remain unchanged. No new migration and no edits to 001–013.

217 Node tests and local actual GoTrue/PostgreSQL pass. The new Auth case disables SMTP completely and auto-confirms signup: 25 concurrent requests fill exactly ten seats including an existing account; eleventh rejected; sessions returned immediately; original admin UUID/data/login and member refresh preserved. Production build `kotoba-2.9.1-0f6bf1208a10` passes. Chromium 360/390/430px direct signup → immediate app → own settings/save → sign-out → other account → refresh passes, including duplicate submission, full-capacity login and honest recovery information. These fixtures do not test real email recovery. This is not production multi-user or real-device acceptance.

Next manual setup after publication: Supabase Authentication → Sign In / Providers → allow email signups and disable Confirm email; CAPTCHA remains disabled. Keep the protected Before User Created Hook and server rate limits. Sign in using the original admin password, verify old records, then Settings → 内测名额管理 → acknowledge the direct-mode configuration and 开放注册. No SQL/replayed migration, SMTP, domain or CAPTCHA Secret is required. Existing unconfirmed accounts, if any, require admin review; do not repeatedly register or delete a real account to fix a configuration mismatch. Sites public access and latest deployment build are defined by the native receipt, not historical notes.

Without email confirmation this does not prove mailbox ownership; without a mail provider, automatic password-recovery email is not advertised. Already signed-in users retain password change. Latest verified aggregate remains zero ordinary accounts, ten remaining and registration closed; actual server settings and direct signup still need live owner/new-user acceptance.

Prior checkpoints below are historical.

---

# Production 013 and CAPTCHA build checkpoint — 2026-10-13

User-supplied real 013 catalog/ledger verification passes: trusted admin UUID and configured password preserved, zero ordinary accounts, capacity ten, no drift, protected Hook ACLs, RLS enabled and registration closed. Read-only production aggregate RPC also returns HTTP 200, ten remaining seats and registration disabled. See PRODUCTION-MIGRATION-013-EVIDENCE.json. The Hook screenshot shows enabled/Postgres, but exact target was obscured; email confirmation is user-reported enabled. Do not replay any migration.

The provided public hCaptcha Site Key is configured in ignored local build environment, not committed. Production build `kotoba-2.9.1-21724cfb3545` embeds the supplied public widget key; no hCaptcha Secret was received or stored. Registration remains closed. Next operational step after this frontend publication: privately configure hCaptcha Secret in Supabase Auth and enable CAPTCHA, then verify actual admin sign-in. Custom SMTP/non-team verification, Edge deployment, public hosting and genuine multi-user/device acceptance remain pending. Local widget tests are simulated and do not prove CAPTCHA service acceptance. Keep the original admin and all learning records.

Previous checkpoints below are historical.

---

# Current continuation: V2.9.1 Limited Beta — 2026-10-13

Read LIMITED-BETA-ACCEPTANCE.md, LIMITED-BETA-DEPLOYMENT.md and CURRENT-STATUS.md first. Current feature is locally tested email/password + ten-seat multi-user admission. Preserve original admin UUID/legacy cache and all course/SRS/snapshot identities. Protected 001–012 are unchanged; only additive 013 is prepared, closed by default. Do not execute production SQL without staged admin continuity and real verification evidence.

Atomic seat allocation occurs in the Auth INSERT transaction under a locked config row and finite unique seats; Hook is an early check without a reservation. Hard Auth deletion releases once by FK cascade; original admin deletion blocked. Never manually decrement/delete ledger entries, disable RLS, expose service keys or recreate the original admin. App/Edge rollback retains 013 data and fences.

216 Node tests + local PostgreSQL/actual GoTrue/in-memory SMTP + mobile account fixtures pass; production/live devices still require setup and separate acceptance. Finish only the outstanding deployment/real acceptance in the checklist, not another auth or sync redesign. Generated source hash list accompanies this handoff; latest deployment receipt defines actual website version. Prior notes below are historical.

---

# Current update recovery checkpoint — 2026-10-13

Read UPDATE-RECOVERY-2026-10-13.md. Recovery and Settings now accept preview build IDs and classify failures instead of claiming every failed check means offline. Current 209 Node tests and isolated real-worker mobile-width update tests pass. Next owner action: retry the independent update page; physical installed-PWA result remains unverified. No migrations or storage resets. Keep preview labeling and preserve the current Sites audience. Latest native deployment receipt is authoritative for the published source/build.

# Current production checkpoint — 2026-10-13

User supplied successful real migration 012 catalog verification. Do not run 001–012 again. Read PRODUCTION-READINESS-2026-10-13.md and PRODUCTION-MIGRATION-012-EVIDENCE.json. Live read-only Data API/Auth probes pass; anonymous vocabulary denied. Authenticated owner/card SRS/two-device/physical PWA acceptance remains pending. Keep 2.9 preview label. Sites publication status comes from the latest native receipt; preserve project and current custom audience. Prior 2026-10-12 “012 undeployed” notes below are historical.

# Current continuation: 2.9 preview

Read CURRENT-STATUS.md and KOTOBA-2.9-IMPLEMENTATION.md first. Current source is feature/2-9-personal-materials, based on local 2.8.1 checkpoint 4b0a5a1; last confirmed live website remains 2.8.0/version25. New 012 is **not** on production. Preserve 001–011 and all prior data; no automatic production SQL. Context creation is capability-gated until 012. Raw migration is single-use; dashboard deployment wrapper safely skips an identical recorded 012.

Four code batches now exist: personal-materials (notes/snapshots), personal-context (existing SRS + additive projector), listening-workspace (verified device voices, self-recall, local recording/blob isolation), budget-plan (transparent budgets and pins). 206 Node tests and disposable PostgreSQL pass. Chromium emulation fixtures never represent owner/RLS/device acceptance; synthetic microphone WAV tests are not language audio. No new real audio files were shipped. New personal content is separately counted from 927 vocabulary /154 grammar /70 reading.

Next exact dependency: user executes only supabase/dashboard/012_deploy.sql then 012_verify.sql; inspect real result before owner/second-device checks. Continue physical Android/iOS/PWA/voice/media acceptance. Do not silently promote preview to complete 2.9, deploy old migrations, rewrite SRS, clear data or count imports toward 1,260 grammar/590 reading targets. Full gap 1,626 remains.

> 当前源码 **2.8.1**；先读 N2-CONTENT-BATCH-03.md / CURRENT-STATUS.md / Kotoba-Development-Plan-2026-10-12.md。已有 927 词卡、154 语法、70 阅读；保留 migrations 001–011、Auth/RLS、SRS、同步、全部旧 ID 与用户记录。真实设备/owner/跨设备验收未完成；以下历史版本说明以当前状态与实际代码为准。

# CODEX HANDOFF — 必读执行指令

你正在接手 Kotoba V2.5.0。请把它视为一个已经具有稳定核心和大量 V2.5 UX 改进的项目，而不是空白原型。

## 第一原则：保护现有成果

开始前先阅读 `README.md`、`docs/CURRENT-STATUS.md`、`docs/KOTOBA-V2.5-IMPLEMENTATION-REPORT.md`、`docs/V2.5-AUDIT.md`。

先检查实际源码与 Git 状态，不要只相信历史描述。不要立即重构。

## 强保护区

除非用户明确批准且你已解释必要性，否则禁止：

- 修改或重跑 migrations 001–009
- 创建 migration 010 来完成 UI/UX 工作
- 改 RLS
- 改 Auth / owner 权限模型
- 改 SRS 调度语义
- 替换 Supabase
- 替换 Next.js / React 主架构
- 引入第二套动画框架
- 删除测试来获得 PASS
- 把真实 secrets 写入源码或交接包

若任务确实需要 schema/RLS/Auth/SRS 变化：停止，先报告原因、最小方案、兼容性、回滚方案和风险。

## 接手验证

先安装锁定依赖：

`npm ci`

然后依次：

`npm run typecheck`
`npm run lint`
`npm test`
`npm run build`

记录 Node/npm 版本与所有结果。若失败，先判断环境问题还是代码回归，不要为了消除环境错误擅改业务逻辑。

## V2.5 当前任务

优先完成尚未完成的真实验收：owner 登录、生产 Supabase/RLS、跨设备同步、AI Edge Function、Android/iOS/PWA、离线/慢网、麦克风与响应式矩阵。

只修复验收发现的真实问题。不要重复实现已存在的 Today / Daily Session / Motion / Review / Reading / Speaking / AI UX 工作。

## 产品方向

Kotoba 的长期目标是“个人语言学习操作系统”：

输入 → 理解 → 收集 → 记忆 → 回忆 → 使用 → 反馈 → 自适应 → 下一次学习。

但不要一次性实现长期路线。V2.5 验收完成后才进入 V2.6。

## 完成任何任务后的报告

必须报告：

- 修改了什么以及为什么
- 精确文件列表
- 是否触碰数据库/RLS/Auth/SRS
- TypeScript/Lint/Tests/Build 结果
- 仍需真机验证的项目
- Known Issues

不要只回复 Done。
