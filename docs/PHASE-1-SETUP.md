> 最新状态（2026-10-05）：001–009真实只读检查通过；依赖、TypeScript、零警告Lint、57项测试及生产Build通过。Supabase Auth/Data API连通和匿名词汇拒绝已验证；owner账号仍未创建，公共注册需关闭，实际登录/同步/安装待验收。当前操作见[FIRST-RUN.md](FIRST-RUN.md)。旧段落中的网络/Build阻塞属于历史记录，不代表最新状态。

> 最新阶段：001–009已由用户逐份真实部署并通过只读验证，不再执行下方历史迁移命令。Google Provider已启用。当前进入首次账号创建与Build，按[FIRST-RUN.md](FIRST-RUN.md)操作；最新检查见FIRST-RELEASE-CHECKS.json。历史pgTAP数量已更新为37+22+21=80，仅用于隔离测试库。

# Phase 1：私人 Supabase 配置与验收

本地已经保存真实项目 URL、Publishable Key 和允许邮箱。`.env.local` 被 Git 忽略，并且不会放入源码 ZIP。没有将任何 server Secret 写入客户端。此文件不包含实际 Key。

当前结果：57 项本地测试通过；73 个源文件通过语法解析。真实连接检查因执行环境联网 `EPERM` / 代理不可达而失败。`tsc`、`eslint`、`next` 尚未安装，因此类型、Lint、Build 和设备验收不能算通过。数据库迁移没有远程执行，下面需要你在有管理权限的本机 / 控制台操作。

## 1. 应用版本管理的数据库迁移

Google Provider 已由用户在 Dashboard 启用，实际应用登录尚未验证。当前按最新要求一次部署一个 migration，见 [迁移审查与当前第一份 SQL](MIGRATION-AUDIT.md)。先运行 `00_remote_inventory.sql` 核对真实状态，不执行旧整批入口。

Publishable Key 不提供 DDL 管理权限。使用自己的 Supabase CLI 登录，不要发送数据库密码或个人访问 Token到聊天中。

```sh
npx supabase login
npx supabase link --project-ref your-project
npx supabase migration list
npx supabase db push --dry-run
npx supabase db push
```

链接项目时在本机 CLI 提示中输入创建项目时的数据库密码；需要环境变量时只使用服务器 / 本机 `SUPABASE_DB_PASSWORD`。迁移 001–009 会保留旧学习表，不要执行远程 `db reset`，不要只应用 008 或 009 而跳过依赖版本。若项目已经有同名表但没有对应迁移历史，先核对，不要删除已有数据来解决冲突。

Migration 008 保证：唯一邮箱绑定唯一 Auth UUID；该账号已确认；Profile 和语言档案带 RLS；其他账号不能读取账户 RPC；旧个人记录同时验证 row ownership；初始化设备读取服务器 Profile / User Languages，不覆盖已有学习快照。

## 2. 初始化唯一私人账户

迁移完成后，在 **Supabase → SQL Editor → New query** 执行以下服务器配置数据操作（不是替代 schema migration）：

```sql
select public.configure_private_owner('owner@example.com');
```

随后在 **Authentication → Users → Add user → Create user** 创建 `owner@example.com`，启用 **Auto Confirm User**。设置自己的私人密码，只填写在该控制台；不要发送到聊天。不要使用 Invite user 流程，不需要发送邀请邮件。若此邮箱已存在，保留原 UUID，确认其邮件已验证，不要另建一个账号。

这种控制台初始化方式无需给开发环境提供 service-role Key。若使用可选 `npm run backend:configure` 自动初始化，才需要服务器私密 `.env.local` 中的 `SUPABASE_SERVICE_ROLE_KEY`；该 Key 位于项目 **Settings → API Keys → Legacy API Keys → service_role**。`PRIVATE_ACCOUNT_PASSWORD` 只用于可选密码初始化，账号建好后移除它。

## 3. Google Cloud 创建 Web OAuth Client

1. 打开 Google Cloud Console，选择或创建自己的项目。
2. 打开 **Google Auth Platform → Branding / Audience**。名称使用 Kotoba Personal；使用 External 测试模式时，在 **Test users** 添加 `owner@example.com`。授权范围只需要 `openid`、`email`、`profile`。
3. 打开 **Clients → Create client → Web application**。旧界面路径为 **APIs & Services → Credentials → Create credentials → OAuth client ID**。
4. **Authorized JavaScript origins** 填 `http://localhost:3000`。正式部署后再添加实际应用的 HTTPS origin，不带页面路径。
5. **Authorized redirect URIs** 填：

```text
https://your-project.supabase.co/auth/v1/callback
```

保存后会生成 Client ID 和 Client Secret。Client Secret 只粘贴到下一步的 Supabase 服务器配置，不发到聊天，不写入 `NEXT_PUBLIC_*`。

## 4. Supabase 开启 Google，关闭公开注册

1. 打开 **Authentication → Sign In / Providers → Google**。
2. 开启 Google，填写上一步的 Client ID / Client Secret，保存。
3. 在 **User Signups** 关闭 **Allow new users to sign up**。保留已经预创建的私人账户；需要私人密码登录时保留 Email provider，但关闭其公共注册。
4. 打开 **Authentication → URL Configuration**。开发 Site URL 为 `http://localhost:3000`，Redirect URLs 添加 `http://localhost:3000/`。正式部署后将 Site URL 改为真实 HTTPS origin，并添加它的根回调 URL。不要使用任意站点 wildcard。

通过 CLI 管理 Google Provider 时，对应服务器配置变量为 `GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`、`SITE_ORIGIN`。通过 Dashboard 保存时，不需要将 Google Secret 放入 Next.js 部署环境。

## 5. 连接与构建检查

在能够联网的开发环境运行：

```sh
npm install
npm run backend:check
npm run typecheck
npm run lint
npm test
npm run build
```

连接脚本只输出连通结果、Google 是否开启和注册开关，不输出 Key、Token 或用户记录。Node 24 会按已配置的 HTTP 代理执行检查。只有 Data API 成功响应才算验证实际连接，公开 Key 格式通过不代表连通通过。

## 6. Phase 1 真实验收

三个 pgTAP 文件共 52 个断言；在隔离的本地 Supabase / 测试库执行 `supabase test db`，不要在生产数据上运行测试 owner 初始化。

真实浏览器还需验证：

- Google 登录与私人密码登录返回同一个 Auth UUID；唯一邮箱可访问，其他账号即使持有会话也无法进入或读取私人表。
- 匿名表读取为空 / 被拒绝，其他 UID 不能修改 Profile 或 User Languages；账户 RPC 同时验证用户和服务器 owner。
- 刷新页面、关闭再打开、安装 PWA 后重新启动均恢复正确会话；退出后保持退出；旧项目缓存不能用于新项目授权。
- 电脑将阅读位置保存到 67%，手机相同账号在同步后恢复到 67%；离线操作重连不重复记录 Review 或学习时间。
- 375 / 390 / 430 / 768 / 1024 / 1366 / 1440 / 1920 视口均运行已有响应式审计；Desktop / Android / iOS PWA 使用真实设备检查。

以上验收完成前，不将 Phase 1 标记为完成，也不继续增加学习功能。现有 SM-2 风格调度后续 Phase 3 才升级为现代 FSRS 调度，当前没有将旧算法称为 FSRS。

## 7. 后续服务器配置

AI / 云端备份不属于当前验收完成范围。部署它们时：在 **Supabase → Edge Functions → Secrets** 配置 `PROJECT_PUBLISHABLE_KEY`（同一个公开 Key）、`ALLOWED_USER_EMAIL` 和正式 `SITE_ORIGIN`。AI 再添加来自 AI 服务控制台的 `OPENAI_API_KEY`，不发送到聊天。Supabase 自己注入服务器 `SUPABASE_SERVICE_ROLE_KEY`。

新版 Key 不使用旧 API Key 的网关 JWT 验证；共享 Edge 认证层仍必须验证真实用户 Token、服务端邮箱、数据库 pinned owner，三项都通过后才能访问管理客户端。
