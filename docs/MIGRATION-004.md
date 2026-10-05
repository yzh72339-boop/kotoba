# 第四份真实部署：004

用户在真实 Supabase 项目执行并提供完整 003 验证：problems=[]、41 张表、8 个函数、所有保护检查符合预期。回执保存于 `supabase/dashboard/evidence/003_verification.json`。这不是 Google 登录、RPC 运行时或跨设备同步验收。

当前只准备 `004_ai_requests_and_content.sql` 的单份入口 `supabase/dashboard/004_deploy.sql` 和只读验证 `supabase/dashboard/004_verify.sql`。用户提交 004 部署失败截图：SQLSTATE 42702，出现在 ledger INSERT。入口的 loop variable t 与未限定的 seed fingerprint 列 t 冲突；生成器已修正 q.t / q.id / q.data，不修改 canonical 004 业务 migration。用户已提交完整 `004_failure_inventory`：版本001/002/003、41表、新表/RPC/004登记均不存在、四个starter计数0、两个helper未变，回滚状态检查符合预期，保存于 `supabase/dashboard/evidence/004_failure_inventory.json`。用户随后提交修正版部署结果，ledger 已包含004/ai_requests_and_content，回执保存于 `supabase/dashboard/evidence/004_deployment_receipt.json`。用户现已提交完整004只读验收，problems=[]、42张表且全部检查符合预期，保存于 `supabase/dashboard/evidence/004_verification.json`。004数据库checkpoint通过，当前进入005单独部署准备；001–004不再修改或重跑。

## 创建对象与实际写入

- 创建 public.ai_requests（user_id FK auth.users、request_id、status、response、started_at、completed_at），联合主键 user_id/request_id。
- 显式启用 RLS，新增 owner_read SELECT policy：is_private_owner() AND user_id=auth.uid()。不允许浏览器直接写请求状态或缓存响应；撤销 PUBLIC/anon/authenticated 的全部表权限，等最终 009 再开放 owner 读取。
- 创建 public.claim_ai_request(uuid)，SECURITY DEFINER、空 search_path、实时 owner 检查、从 auth.uid() 推导归属。撤销 PUBLIC/anon EXECUTE，只允许 authenticated 调用。
- 该函数修正相同事务内 timestamp equality 误认新请求的情况，使用 INSERT ROW_COUNT 判断；拒绝 NULL ID。完成请求返回缓存，未超时 pending 返回 acquired=false，failed 或超过两分钟 pending 可重新取得请求。
- 保留既有 RPC 参数和返回结构。它不是完整 AI exactly-once 执行证明；超时重试和真实 AI 调用仍需后续隔离/集成验证。
- 实际插入既有基础内容：3 条 Grammar、1 条 Grammar Relation、2 条 Grammar Examples、2 篇 Articles、2 段 Listening Transcript（没有下载或生成音频文件）。这是数据库初始化，不增加页面功能。
- 没有 DROP TABLE / DELETE FROM / TRUNCATE / 表重建。没有修改旧函数、旧 RLS policies、Auth triggers、rls_auto_enable / ensure_rls 或 Storage。
- 部署时不调用 claim/review/sync/AI RPC；不会向 AI provider 发请求，也不需要 AI API Key 或其他 Secret。

## 安全入口

入口要求真实版本恰好 001/002/003、41 张 public 表、owner 邮箱、表/schema 闭锁与私人 Storage 状态保持不变。复核 003 登记的 Auth/SRS/sync functions、policy、RLS helper 指纹；不存在 004 表/RPC，才能执行。

在事务内锁定旧表，检查固定 seed ID 或 grammar 唯一名称是否已有记录。如果存在，明确报错，不覆盖或删除，需要先只读调查。捕获全部旧表 OID/行数，核对只有五张内容表发生预期新增；并记录五张内容表原有每行的指纹，核对已有内容未改变。

创建新表触发 ensure_rls 仅自动 ENABLE RLS；源文件仍显式 ENABLE RLS、CREATE policy 和 REVOKE grants。两个 RLS helper 的定义、权限和 event trigger 均保持不变。只有 metadata/policy 创建及既定 starter INSERT；任何入口断言失败会中断事务，不通过忽略报错推进。

## 用户当前步骤

1. 修正版004已由用户执行且返回版本001/002/003/004。Supabase 项目 ocbydnsqennrumowqxvu → SQL Editor → New query，角色 postgres；完整004只读验收现已通过，以下步骤保留供审计。
2. 不重跑004_deploy.sql。部署回执已保存，部署成功不等于完整只读验收或运行时验收通过。
3. 新查询完整执行 004_verify.sql。该文件只有读取，不伪造 JWT、不变更 role、不调用 RPC、不插入 fixture。
4. 返回完整 migration_004_verification，预期 problems=[]、tables=42、starter_grammar=3、starter_articles=2、starter_listening=2、private_buckets=3；四个 browser_*_access=false，其余布尔检查=true。
5. 只有真实只读 checkpoint 通过后再进入 005。不把管理角色查询、目录指纹或 owner_read policy 存在当成浏览器 RLS 行为测试。

## 本地验证与限制

生成器 Node 语法检查、实际生成和结构检查通过。这没有捕获 PL/pgSQL 变量/列歧义，因此不能代替 PostgreSQL 执行检查；修正版明确限定派生表列，并已核对输出不再包含歧义表达式。source004 与部署入口内 literal 一致；004 只有一张表、一个函数、指定五张内容表的 INSERT；验证脚本不包含执行式写入；SQL pgTAP plan 为29，与断言数一致。

新增五项 PostgreSQL pgTAP 用例：anonymous 无法 claim、owner 首次取得、同一事务重复不取得、NULL ID 拒绝、非 owner 拒绝。它们在全部迁移完成后的隔离数据库运行，**当前未执行，不在生产 SQL Editor 运行**。

已尝试 TypeScript check、Lint、Build，分别因缺少 tsc/eslint/next 依赖而退出127；没有声称通过。Cloud 没有可用 PostgreSQL runner，没有解析或执行真实 PostgreSQL，也没有本轮 Desktop/Mobile/PWA 浏览器验收。前端页面未改动。

生成：`node --env-file=.env.local scripts/prepare-004-migration.mjs`，只读取本地文件与 ALLOWED_USER_EMAIL，不连接数据库，不打印任何 Secret。
