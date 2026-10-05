# KOTOBA V2.5 IMPLEMENTATION REPORT

状态：**V2.5 Fluid Core 源码候选版已完成；尚未发布，真机与私人账号验收待完成。** 本次仅使用原始 V2.4 交接源码；前一轮未上线的学习库扩充未合并。Phase 0 审计见 `docs/V2.5-AUDIT.md`。

## A. Baseline

- 原始 V2.4 交接包建立为本地 Git 提交 `2eaef0a`，标签 `v2.4-stable`；开发分支为 `v2.5-fluid`。
- 修改前 TypeScript、Lint、原有 **66 项** Node 测试和生产构建均通过。此前进度消息中的「57 项」为计数错误，以逐文件测试总数 66 为准。
- 交接文档只作为项目事实和约束参考；本次产品目标由用户的 V2.5 计划确定。未引入学习库扩充。

## B. UX 修改

| 审计问题 | V2.5 解决办法 | 主要文件 |
| --- | --- | --- |
| 导航会删除未完成 Daily Session | 页面切换改为暂停；Today 显示继续入口；恢复原步骤。跨语言切换保留会话，继续时恢复会话语言。 | `components/study-context.tsx`, `components/today.tsx`, `app/page.tsx` |
| 当前步骤和后续操作不够清楚 | Today 显示 4 步进度、剩余步骤和预计目标时间；Session Header 与 Footer 显示当前步骤、进度和下一步。暂停后统计使用学习记录分钟数。 | `components/today.tsx`, `components/session-shell.tsx` |
| 移动端焦点卡片过高 | 缩短首屏问候与焦点卡片的间距，保留 Next 的可见内容；安全区域扩展到捕捉按钮、会话提示和抽屉。 | `app/fluid.css` |
| 同步占据主界面 | 正常同步保持安静；成功约 1.3 秒提示；离线说明本地保存；失败提供重试，避免顶开页面。 | `components/pwa.tsx`, `app/fluid.css` |
| 高频点击反馈与导航动画不连贯 | 按压反馈、共用动效时长、移动导航共享指示器；页面即时替换，避免快速切换排队。 | `app/page.tsx`, `app/fluid.css` |
| Review 节奏偏慢 | 评分锁由 220 ms 缩短到 80 ms，显示评分保存状态；完成时轻触觉反馈；不改 SRS。 | `components/vocabulary.tsx`, `lib/platform/haptics.ts` |
| 阅读保存状态不明确 | 单词和句子保存后立即显示 Saved；重复点击不会重复提交；已完成的阅读不能重复记录。 | `components/reading.tsx` |
| Speaking 状态与失败恢复不明确 | Ready、Listening、Processing、Feedback、Complete、Error 明确呈现；点击麦克风可开始/停止；文字输入、参考表达和错误重试保持可用；同一标签页的未提交草稿可恢复。 | `components/speaking.tsx` |
| AI 失败会丢失输入 | 请求中保留临时提问视图；仅成功后保存对话；失败时恢复草稿并显示 Retry。 | `components/ai.tsx` |
| Quick Add 仅显示加号 | 浮动入口明确标为 Capture；关闭抽屉时未提交文本保留，成功保存后清空。 | `app/page.tsx`, `components/personal-tools.tsx` |

## C. Architecture

- 沿用原 `StudyProvider`、`DailySession`、`SessionHeader/Footer`、Framer Motion 和 Radix Dialog；未创建第二套学习会话或主要技术架构。
- `app/fluid.css` 集中设置 SNAPPY 110 ms、FLUID 220 ms、GENTLE 360 ms 的交互参数。页面轻微位移 6 px；卡片、按钮主要使用 `transform` 与 `opacity`。现有 toast 继续用于即时反馈。
- 新增纯函数 `shouldPauseDailySession`，把导航与跨语言暂停判断集中在原 `lib/daily-session.ts`，并添加回归测试。
- Speaking 独立为 `components/speaking.tsx`，便于状态处理；`lib/platform/motion.ts` 为 JS 滚动提供 reduced motion 适配。
- 本地保存与后台同步仍沿用原 IndexedDB、队列和 `SyncEngine`。AI 请求仍使用原 Edge Function 接口。

## D. File Changes

| 文件 | 原因 |
| --- | --- |
| `app/page.tsx`, `app/layout.tsx`, `app/fluid.css` | 路由切换、导航指示器、Capture 入口、全局触摸反馈和安全区域。 |
| `components/study-context.tsx`, `components/today.tsx`, `components/session-shell.tsx` | 会话暂停/恢复、Today 进度与连续步骤。 |
| `components/pwa.tsx`, `components/settings.tsx` | 同步状态、重试和版本显示。 |
| `components/vocabulary.tsx`, `components/reading.tsx`, `components/listening.tsx` | 复习节奏、阅读保存、听力降级及少量性能修正。 |
| `components/ai.tsx`, `components/speaking.tsx`, `components/personal-tools.tsx` | AI 错误恢复、口语状态、快速捕捉。 |
| `lib/daily-session.ts`, `lib/platform/haptics.ts`, `lib/platform/motion.ts` | 纯导航判断、能力检测和 reduced motion 滚动。 |
| `tests/fluid-session.test.mjs`, `scripts/run-tests.mjs`, `scripts/responsive-audit.mjs` | 增加 3 项会话回归测试和 360/412 px 检查矩阵。 |
| `package.json`, `package-lock.json`, `public/sw.js`, `scripts/finalize-pwa.mjs` | 版本升为 2.5.0，PWA 缓存版本从包版本生成。依赖清单未变。 |
| `docs/V2.5-AUDIT.md`, 本报告 | 审计、变更与验收记录。 |

## E. Stability

| 保护项 | 结果 |
| --- | --- |
| 数据库结构和 migration 001–009 | **NO CHANGE**；未创建 migration 010，未重跑迁移。 |
| RLS、Auth、私人账户门禁、权限 | **NO CHANGE**。 |
| `lib/srs.ts` 调度算法及评分语义 | **NO CHANGE**。 |
| 学习数据模型、IndexedDB 存储语义、同步协调器 | **NO CHANGE**。仅新增会话 UI 暂停状态与同标签页临时口语草稿。 |
| 主要依赖与技术栈 | **NO CHANGE**。只更新应用版本号。 |

## F. Validation

- Phase 1 后：TypeScript、Lint、原有自动化测试通过。
- Phase 2/3 后：TypeScript、Lint、原有自动化测试通过。
- Phase 4 后：TypeScript 通过；ESLint 零警告；**69/69 Node 测试通过**（原有 66 + 新增 3）；Next.js 生产构建通过；PWA 生成 `kotoba-2.5.0-5536751bf030`，预缓存 19 项资源。
- 首屏 JS 指标约 **307 kB**，与 V2.4 基线报告值相当。构建中缺少公开 Supabase 测试配置，私人登录门禁保持关闭；构建通过不代表登录和后端已经验收。
- `git diff v2.4-stable -- supabase lib/srs.ts components/auth-gate.tsx lib/private-session.ts lib/sync-engine.ts lib/sync-coordinator.ts` 无修改。

## G. Performance

- 移除会给快速导航排队的 `AnimatePresence mode="wait"`；页面只做短暂透明度和 6 px 位移。
- Listening 的 70 根波形柱保留静态形状，播放中仅约 12 根执行轻量动画；Speaking 仅监听期间动效持续。
- Reading 在进度百分比未变化时跳过状态写入；Listening 在句序未变化时跳过位置写入。
- 避免大型持续 Spinner、全屏同步遮罩和额外动画依赖。

## H. Accessibility

- Framer Motion 页面与 Review 动效根据 `useReducedMotion` 关闭；CSS 动画和 JS 平滑滚动遵守 `prefers-reduced-motion`。
- Session 进度采用 `role="progressbar"`；评分、口语与同步反馈使用状态语义；麦克风提供动态标签和 `aria-pressed`。
- 继续使用原有语义按钮、`focus-visible` 和 Radix Dialog 的 ESC、遮罩、焦点管理与关闭后焦点恢复。移动端高频控件沿用至少 44 px 的现有规则。

## I. Manual Validation

**尚未完成。** 当前交接包没有私人 owner 登录状态或测试 Supabase 项目，且当前环境未安装 Playwright。`scripts/responsive-audit.mjs` 已列入 360、375、390、412、430 px 和桌面宽度；请在原 owner 的测试环境提供其本人登录的 `OWNER_STORAGE_STATE` 并运行 `npm run qa:responsive`，再检查 Android Chrome、Mobile Safari 和 PWA 独立模式。

真机验收应覆盖：登录持久化；会话暂停/刷新/跨语言恢复；大量 Review；阅读弹层与保存；麦克风权限和不支持时的文字降级；AI 失败重试；离线与慢网络；安全区域、键盘、Bottom Sheet、长内容、快速导航、横向溢出和 reduced motion。不得把本地自动化通过视为上述真机验收通过。

## J. Known Issues

1. 原 Sites 项目 `appgprj_6ac1a9e96d98819186da139d6549225e` 对当前账号返回 `project_not_found`。**未发布到原网址，也未创建替代 Site。** 原所有者须在原项目源码仓库应用此源码包/补丁并完成发布，或通过平台提供有效的编辑权限。
2. 私人账号、生产 Supabase、RLS 实际读写、跨设备同步、AI Edge Function、Safari/Android/PWA 真机均未在当前环境完成端到端验收。
3. AI Edge Function 仍使用一次性 `invoke` 响应，没有真实流式输出；V2.5 改善了请求中和失败状态，未伪造流式动画。
4. 浏览器语音识别与朗读取决于设备支持；发音评分仍未接入。口语未提交草稿保存在同标签页 `sessionStorage`，跨设备不会同步。
5. 原 V2.4 内容包较小；按用户要求，未合并独立的学习库扩充交付包。

发布建议：由原 Sites 项目的所有者在原仓库应用补丁，使用其受控的公开 Supabase 配置重新执行四项检查与真机矩阵，再保存、发布到原项目。不要重跑 001–009，也不要创建新 Site 替代原项目。
