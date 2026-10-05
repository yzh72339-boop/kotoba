> 最新状态（2026-10-05）：001–009真实只读检查通过；依赖、TypeScript、零警告Lint、57项测试及生产Build通过。Supabase Auth/Data API连通和匿名词汇拒绝已验证；owner账号仍未创建，公共注册需关闭，实际登录/同步/安装待验收。当前操作见[FIRST-RUN.md](FIRST-RUN.md)。旧段落中的网络/Build阻塞属于历史记录，不代表最新状态。

> 当前项目001–009已经真实部署并验证，Google Provider已启用。不要重复执行本文通用迁移或Google配置命令。当前仅进行私人账号创建和首次Build，见[FIRST-RUN.md](FIRST-RUN.md)。通过Dashboard创建账号不需要service_role或Google Secret放入Next.js；它们也不得进入客户端或源码包。

# 私人部署

当前尚未完成部署。以下步骤将源码变成可验证的私人应用；真实项目配置、密钥和设备验收仍需联网完成。

## 1. 环境变量

将 `.env.example` 复制为 `.env.local`，填入：

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`：允许浏览器使用。
- `SUPABASE_SERVICE_ROLE_KEY`：只用于本机服务端账号配置，不进入前端。
- `ALLOWED_USER_EMAIL`：唯一私人邮箱；个人密码登录使用相同邮箱。
- `PRIVATE_ACCOUNT_PASSWORD`：用于初始化单一私人账户。配置完成后从部署环境移除。
- `SITE_ORIGIN`：准确的应用 HTTPS 来源，不带末尾 `/`。
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`：Supabase Auth Google Provider 配置。

不要把密钥发到公开聊天、截图、仓库或浏览器配置中。仓库只保留占位 `.env.example`。

## 2. Supabase

安装 Supabase CLI，登录并关联自己的项目。所有 SQL 配置来自迁移：

```sh
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

需要依次应用 `001_kotoba.sql` 到 `009_private_permissions_and_storage.sql`，不要只应用 V1 的 001。迁移不会删除原型学习表，会将它们及索引保存为 legacy 名称。Dashboard 操作先按 [数据库阶段清单](SUPABASE-DASHBOARD-DATABASE.md) 做只读预检；确认全新项目后才使用整批事务入口。

Auth 配置使用 `supabase/config.toml`：禁用公共 signup 和 email signup，启用 Google；将应用准确来源加入站点 / OAuth Redirect URLs。用 CLI 将配置推送到关联项目（先在本机配置上述环境变量）：

```sh
supabase config push --project-ref YOUR_PROJECT_REF
npm run backend:configure
```

`backend:configure` 读取本地 `.env.local`，先写入私人邮箱白名单，再创建 / 更新同一个已确认的邮箱密码账号。Google 的相同已验证邮箱使用 Supabase 的身份关联；Migration 008 将白名单进一步绑定该 UUID。两个入口是否落在同一个 UUID 必须实际验收，不能只靠界面判断。

Google Cloud OAuth Web Client 的回调地址为 `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`。应用来源 / redirect 必须与最终域名一致。不要重新开放公开注册来排查 OAuth。

现有账户更换允许邮箱会改变访问资格；账号迁移不是更换白名单就能迁移学习数据。不要随意更换。

## 3. AI 与云端备份

建立一个**本机私密且被 git 忽略**的 `.env.edge.local`，包含 `PROJECT_PUBLISHABLE_KEY`（同一个公开 Key）、`OPENAI_API_KEY`、可选 `OPENAI_MODEL`、`ALLOWED_USER_EMAIL`、`SITE_ORIGIN`。Supabase 系统提供项目 URL / service-role 环境变量；`PROJECT_PUBLISHABLE_KEY` 使用普通 Secret 配置名，因为 `SUPABASE_*` 是保留前缀。

```sh
supabase secrets set --env-file .env.edge.local
supabase functions deploy ai-tutor
supabase functions deploy backup
```

AI Function 检查来源、真实登录用户与 owner；读取有界个人数据，使用统一 provider。每小时最多 30 次请求；相同 request ID 返回缓存。每日计划无密钥 / 离线时保留规则计划，不阻止普通学习。

## 4. 构建与 HTTPS

```sh
npm install
npm run typecheck
npm test
npm run build
```

只有成功构建的 `out/` 可以发布。HTTPS 为安装、Service Worker 与麦克风的必要条件；localhost 可用于开发。托管应保证 `manifest.webmanifest` 是 JSON，`sw.js` 是 JavaScript，并允许每次检查新版本（例如 `Cache-Control: no-cache`）；指纹静态资源可长期缓存。

`.openai/hosting.json` 已登记 Sites 项目 ID；没有构建与实际部署成功前，不要把预期域名当作已上线网站。

## 5. 验收

在本机 Supabase（需要 Docker）可以运行数据库验收：

```sh
supabase start
supabase db reset
supabase test db
```

如仅使用远端项目，先应用迁移，然后在隔离的测试数据库执行 `supabase/tests/personal_backend.test.sql`。该测试更换测试 owner 并在事务内 rollback；不要在有并发学习操作的生产环境运行。

Playwright 是开发验收工具，可按需安装，不是运行时依赖：

```sh
npm install --no-save playwright
npx playwright install chromium
npm run dev
```

另一个终端中设置 `APP_URL` 与 `OWNER_STORAGE_STATE`（真实 owner 的 Playwright 登录状态文件，放在仓库外），运行 `npm run qa:responsive`。不要创建生产认证绕过来完成截图。

真实验收要覆盖：Google 与密码相同 UUID、其他邮箱拒绝访问、匿名不能读私人表 / Storage、两个设备同步、离线复习后重连不重复提交、67% 阅读恢复、录音跨设备下载、旧录音积压上传不覆盖新录音、替换录音后播放位置不串档、离线退出后联网不恢复旧登录、每日步骤恢复、学习中更新后状态保留、JSON 导出 / 合并恢复、Chrome / Edge / Android / iOS / iPad 安装与 Safe Area。

完整验收状态见 [ACCEPTANCE.md](ACCEPTANCE.md)。

新版 Publishable Key 不走旧的网关 JWT-key 验证。两项 Edge Function 设置 `verify_jwt=false`，每次请求仍必须在共享服务器认证层携带真实用户 Bearer Token，通过 Auth `getUser`、服务端邮箱和数据库 `is_private_owner` 三项验证；没有移除应用认证。不要单独跳过该服务器认证层。

当前 Phase 1 的点击步骤、管理权限要求与真实验收阻塞见 [PHASE-1-SETUP.md](PHASE-1-SETUP.md)。
