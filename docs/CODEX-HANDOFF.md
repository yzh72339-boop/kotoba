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
