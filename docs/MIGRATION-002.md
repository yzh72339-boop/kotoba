# 第二份真实部署：002

用户已提交完整 `migration_001_verification`，12 张表、RLS、权限闭锁、Auth trigger、Profile 回填、版本记录和两个 helper 保持不变均符合预期。真实回执保存于 `supabase/dashboard/evidence/001_verification.json`。这确认 001 的数据库 checkpoint；不表示 Google 登录、跨设备同步或 PWA 已通过。

## 当前只部署 002

- 源文件：`supabase/migrations/002_personal_backend.sql`。真实部署入口：`supabase/dashboard/002_deploy.sql`。
- 001/002 已部署且数据库 checkpoint 验证通过，不修改其 SQL 或重复运行。002 的 RLS / grants 修正均在部署前完成，保留正常 UI 和业务源码；用户在截图后提供了完整只读回执，存于 dashboard/evidence/002_verification.json。当前下一步见 MIGRATION-003.md；下列部署步骤保留作历史记录。
- 002 创建 private schema / app_owner、29 张新 public 表、索引、约束、RLS policies、身份验证辅助函数和触发器；最终 public 有 41 张应用表。
- 将原 profiles / vocabulary / grammar / reviews / study_sessions / ai_conversations 改名为 legacy_*，原表和行不删除。同步改名旧索引，避免新同名表的 PK 索引冲突。提交前比较旧表 OID 和行数，回执记录供独立查询再次核对。
- 原 Profile 的名字和每日目标回填到新 Profile。其余旧学习数据保留在 legacy_*，本版本没有自动导入新结构，不能宣称旧词汇或旧复习记录已经完成格式转换。
- user_progress 增加 revision 列；不修改已有 snapshot 内容。
- 创建三个 Private bucket：personal-audio、personal-backups、personal-content；四个 CRUD policies 及两条仅限制这些 bucket 的 restrictive fences。路径首段必须为当前 auth.uid()，未关联 bucket 保持原权限。
- 部署入口调用 configure_private_owner，数据库内唯一邮箱为 yzh72339@gmail.com；不是前端白名单。配置表立即启用 RLS，撤销浏览器表/schema 权限。is_private_owner 在本阶段检查 JWT 邮箱、当前 auth.users 邮箱与邮箱确认状态；固定到唯一 Auth UUID 的进一步配置由 008 处理，本阶段不宣称最终身份系统验收。
- 所有个人父表 policies 包含 auth.uid() 与 user_id / id；旧个人表也带行归属；例句/搭配和句子关系检查父对象归属；复习日志和 AI 消息使用含 user_id 的复合 FK。内容表仅 owner 可见。
- 全部 41 张 public 表撤销 PUBLIC / anon / authenticated 所有权限，包含 RLS 不能拦截的 TRUNCATE。当前浏览器不能直接读写学习表；后续版本建立 RPC、固定 owner 身份并明确授予最终最小权限。is_private_owner 仅 authenticated 可调用，配置和 trigger functions 不开放给浏览器。

## 数据安全与现有 helper

没有 DROP TABLE、DELETE FROM、TRUNCATE、RESET 或旧表删除重建。存在 DROP POLICY 后重新创建 policy，是在同一事务内替换权限规则。CREATE OR REPLACE 修改应用自身 Auth profile function，不触及 rls_auto_enable()。

事务先验证只有 001 的 ledger、12 张原表、closed grants / policies、Auth trigger、private schema 尚未创建且三个应用 bucket 尚不存在，再冻结相关表的写入进行迁移。锁超时或任何对象差异均报错回滚；不能通过忽略报错、删表或重复运行处理。

ensure_rls 继续自动 ENABLE RLS，源文件也显式 ENABLE RLS，两者兼容。private schema 的 owner 表由 migration 显式启用，不能依赖仅 public 的 event trigger。提交前后比较 helper / event trigger catalog row，并保存指纹；没有改动它们的定义、权限、owner、启用状态或 tags。

## 执行与验收

1. Supabase 项目 ocbydnsqennrumowqxvu → SQL Editor → New query，角色 postgres。
2. 整份运行 002_deploy.sql，一次只执行 002；不要选片段，不重复执行，不运行 003。
3. 成功返回 001 / kotoba 与 002 / personal_backend 两行版本记录。
4. 新查询整份运行 002_verify.sql。只有 SELECT / 元数据读取；不写数据，不切换角色。
5. 导出并返回完整 migration_002_verification。versions=[001,002]、expected/found_tables=41、problems=[]、private_buckets=3；三个 browser_*_access 均 false，其余布尔检查均 true。
6. 若任何 SQL 报错或检查不符，先停在 002，发回完整错误/结果，不进入 003。

本地完成生成器语法检查和 SQL 结构检查，Cloud 没有可访问的 PostgreSQL 运行器（Docker socket EPERM），开发环境没有连接或执行远程 002。用户已在 Dashboard 执行，并提供完整 002_verify.sql 回执，所有检查符合预期，002 数据库 checkpoint 已通过。正向 owner CRUD、匿名/其他账号 RLS 行为、Google 会话、PC/Mobile/PWA 同步仍是后续实际验收。

源文件变化后用 `node --env-file=.env.local scripts/prepare-002-migration.mjs` 重新生成部署入口。该脚本只读取 002 和服务端 ALLOWED_USER_EMAIL，不连接数据库、不执行 migration、不输出其他环境变量。
