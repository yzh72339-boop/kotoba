> 最新状态（2026-10-05）：001–009真实只读检查通过；依赖、TypeScript、零警告Lint、57项测试及生产Build通过。Supabase Auth/Data API连通和匿名词汇拒绝已验证；owner账号仍未创建，公共注册需关闭，实际登录/同步/安装待验收。当前操作见[docs/FIRST-RUN.md](docs/FIRST-RUN.md)。旧段落中的网络/Build阻塞属于历史记录，不代表最新状态。

# Kotoba Personal · V2.4

面向中文母语用户的私人英语与日语学习系统。Next.js、TypeScript、Tailwind CSS、Radix / shadcn 风格组件、Framer Motion，以及 Supabase Auth / PostgreSQL / Storage / Edge Functions。没有订阅、团队、排行榜或公开资料。

**当前为源码交付，尚未发布，也不能认定为生产可用。** 57 项本地 Node 算法、同步协调、音频、会话与 Phase 1 测试已通过，73 个 TS / TSX / JS / MJS 文件完成语法解析；依赖下载受当前执行环境网络代理阻塞，TypeScript、Next.js、PostgreSQL、OAuth 和实际浏览器 / 手机验收仍待执行。详细状态见 [docs/ACCEPTANCE.md](docs/ACCEPTANCE.md)。

## 启动

要求 Node.js 22.18+ 或 24、npm，以及一个个人 Supabase 项目。

```sh
cp .env.example .env.local
npm install
npm run dev
```

填入真实 Supabase 项目根 URL 和新版 Publishable Key 后访问 `http://localhost:3000`。默认显示私人登录页；未配置账号时不会开放学习数据。Google 和个人邮箱密码均登录同一个预先创建的私人身份，没有注册入口。服务器端账号设置步骤见 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)。

```sh
npm run typecheck
npm test
npm run build
```

`npm run build` 静态导出 `out/`，随后生成带内容版本的 Service Worker 预缓存清单。前端可以部署到普通 HTTPS 静态托管；私人数据库与 AI 在 Supabase，不需要另一个自建应用服务器。`.openai/hosting.json` 保留已有 Sites 项目 ID，但目前没有已部署版本。

## 功能源码

- Today 与四步 Daily Session：复习、语法、阅读、口语。学习步骤、阅读位置、听力位置和个人记录进入统一同步状态。
- 双语独立档案、语言 / 水平 / 目标 / 时长设置、语言切换与按目标调整的学习路径。
- 私人词典：出处、首次遇见、笔记、例句、搭配、收藏、复习记录；Quick Capture 与 `Cmd / Ctrl + K` 添加单词。
- 统一 SRS：词汇、语法、句子、个人纠错卡片；Space 翻面，1–4 评分与触屏手势。
- 编辑式语法课、即时测验和私人笔记；测验错误进入 Mistake Notebook。
- 阅读器：桌面保留词典区域，紧凑窗口使用浮层，手机使用可拖动 Bottom Sheet；假名、译文、字号、行高、Light / Dark / Sepia 和 Focus Mode。
- 听力：设备朗读、逐句重播 / 高亮、听写、跟读；个人录制音频可导入 IndexedDB、上传私人 Storage，并在另一台设备下载。播放位置按录音 ID 恢复；音频替换使用选择时间解决冲突，旧设备积压上传不会覆盖较新的文件。录音与示例文字没有自动对齐。
- Speaking：按住麦克风进行浏览器语音识别，文字输入可替代；真实 AI 提供语法与自然度建议。没有音频评测时不生成发音分数。
- AI Tutor：读取服务器中的有界、相关个人记忆；对话与识别出的错误保留在个人记录中。每天首次同步后尝试生成一次 AI 计划，跨设备使用相同请求 ID；离线或 AI 未配置时保留明确的规则计划。
- Sentence Library、重复错误归纳、选中文字解释 / 翻译 / 保存 / 询问 AI，以及真实学习记录的 Progress。
- JSON / CSV / Markdown 导出、本地备份、私人云端备份、验证 JSON 后合并恢复；恢复前保存当前状态，不使用导入文件删除历史。
- PWA Manifest、完整图标、Standalone 检测、安装引导、Safe Area、离线 App Shell、IndexedDB 操作队列与用户确认更新。

## 数据与同步

所有数据库变更都在 `supabase/migrations/001` 至 `009` 中。V1 原型表及其索引重命名为 `legacy_*` 保留；V2.4 规范化表包括 profiles、user_languages、vocabulary、grammar、articles、saved_sentences、review_items、review_logs、mistakes、AI 对话、daily_plans、学习会话、音频元数据与备份等。当前先按 [Dashboard 数据库操作清单](docs/SUPABASE-DASHBOARD-DATABASE.md) 做只读预检，再确认迁移入口。

客户端先在 IndexedDB 同一事务中读取并合并已保存状态，再原子保存新状态与待同步标记，随后调用 `sync_personal_state`。RPC 比较服务器 revision；冲突时客户端按实体时间戳与删除标记合并，再重试。规范化投影、复习事件与 JSON 快照在同一个 PostgreSQL 事务中提交。并发的同步调用共享同一个上传 Promise；主动同步会等待队列排空，上传失败保留操作，本地备份不受云端失败阻止。事件 UUID / 批次 ID 防止重试重复计数；复习按事件时间重新调度，处理离线记录乱序。

学习状态读取当前使用同步快照；规范化表用于 AI 检索、查询和云端归档。浏览器直接 CRUD 仓库也已提供，但不是全部页面的主要读写路径。客户端不能直接修改 SRS 调度字段或复习日志。

调度是 **SM-2 风格算法，不是 FSRS**。interval / ease 是当前调度依据；stability / difficulty 字段为兼容元数据。前后端使用一致的十进制舍入和 36,500 天最大间隔。Memory 百分比为复习记录的估算，不是医学或考试测评。

## 私密性

- 唯一指定邮箱由服务器 `configure_private_owner` 配置并绑定一个已确认的 Auth UUID；Auth 禁止公开注册，数据库触发器再次拒绝其他账号。
- 私人记录同时验证 `auth.uid()` 和 owner，子表验证父记录归属；共享内容也只有 owner 可访问。
- Storage 桶不公开，对象路径限定当前 owner UUID。
- service-role、Google client secret 和 AI key 只用于账号配置 / Edge Functions；不得加入 `NEXT_PUBLIC_`，不得提交到源码。
- `robots.txt` 禁止抓取，metadata 设置 noindex / nofollow；它们只是辅助，数据访问实际由 Auth 与 RLS 保护。
- 离线启动直接读取本设备已验证的私人授权，不先等待网络会话刷新。退出登录先保存学习状态，清除离线授权与本设备 Auth 凭据，再关闭界面；晚到的 token 刷新不会重新打开已退出的应用。IndexedDB 的数据没有额外设备加密，请使用自己的设备锁。

## 响应式与验证

Desktop 224px Sidebar / 64px 折叠；Tablet 使用紧凑导航；Mobile 使用 Topbar + 五项 Bottom Navigation，学习、阅读专注和口语模式隐藏底部导航。页面使用 max-width，兼顾 1920px。所有点击入口按手机触控尺寸设计。

`npm run qa:responsive` 需要另外安装 Playwright、启动应用并提供真实 owner 登录的 `OWNER_STORAGE_STATE` 文件。脚本覆盖 14 页与 8 个规定视口，检查横向溢出、移动侧栏、按钮触控尺寸和首屏每日学习入口；未执行这些测试前不能声称已经完成设备验收。

## 当前边界

- 英语 / 日语各有 10 个初始词、1 个主语法课、1 篇阅读和 5 句对话；数据库额外提供相关语法。它们不是所有 CEFR / JLPT 等级的完整课程。
- 假名与可点击词由内容包词汇匹配，不是完整日语分词服务。
- 浏览器语音服务可能要求网络；真正离线音频来自本设备下载的录音。音频导入待上传任务在 Listening 页联网时处理。
- Web Push 接口与处理器已预留，但没有启用服务器定时提醒；后台同步无打开的 App 客户端时会在下次启动恢复。
- Manifest screenshots 等待真实浏览器截图；没有用设计示意图冒充产品截图。
- 同步快照限制 16 MB，完整规范化历史保留在数据库。多年大量数据使用前，需要增量同步 / 归档迁移；当前没有声称无限容量。
- 本地自动备份按每日快照保存。浏览器清理存储可能移除离线数据；重要数据应定期导出，并保留 Supabase / 云端备份。云端归档通过单个 STABLE / RLS 数据库函数读取一致的学习数据快照；该流程仍待数据库验收。
- 本地合并恢复针对同步快照；完整规范化归档需要数据库恢复工具。云端音频指针不能代替 Blob，音频需单独下载。

## 文件组织

`app/`：App Shell 与样式；`components/`：学习页面 / PWA / 登录；`lib/`：状态、学习记忆、SRS、同步、导出与平台适配；`lib/backend/`：Zod 输入 / 备份验证和查询仓库；`supabase/`：迁移、Edge Functions 与数据库验收；`scripts/`：账号配置、PWA 构建、响应式审计；`tests/`：可离线执行的算法与同步测试。

## Phase 1 · Publishable Key 与私人账号

浏览器只读取 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`。项目根 URL 已配置；禁止 `/rest/v1/` 后缀、旧 anon 变量或 server key 出现在公开环境中。开发 / 构建前运行环境检查，连接诊断不会打印 Key。

Migration 008 增加私人身份绑定、语言等级约束和 `get_private_account`。首次没有学习快照时，设备使用真实数据库 Profile / User Languages 初始化；之后继续使用已有版本化同步，不清除学习记录。离线授权缓存绑定项目，服务器明确拒绝时不使用缓存绕过。

当前真实客户端配置已保存在 Git 忽略的 `.env.local`，没有加入源码包。`npm run backend:check` 已尝试，但执行环境联网返回 EPERM / 代理不可达；TypeScript、Lint、Build 因依赖未安装而无法执行。数据库迁移、RLS、OAuth、Session 和实际跨设备 / PWA 验证都仍待完成。按照要求停留在基础设施阶段。配置步骤见 [docs/PHASE-1-SETUP.md](docs/PHASE-1-SETUP.md)。


## 当前首发状态（2026-10-05）

001–009已经在真实Supabase逐份部署并通过目录/数据保护验证，不重跑迁移。私人Auth账号尚未创建。公开环境配置检查与57项Node测试通过；依赖安装因执行环境网络EPERM受阻，TypeScript/Lint/Build未通过，没有运行版或上线URL。首次账号创建和本机Build步骤见[docs/FIRST-RUN.md](docs/FIRST-RUN.md)。Google Provider已启用；实际登录、用户RLS行为、跨设备/PWA验收待完成。源码包不含.env.local，解压后自行配置公开URL和Publishable Key；无需提供任何服务器Secret来创建Dashboard账号。
