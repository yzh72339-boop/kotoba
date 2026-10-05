# 第一份真实部署：001

源迁移 `supabase/migrations/001_kotoba.sql` 已由用户在真实项目执行，并提供完整只读验证回执，001 checkpoint 全部通过。基于用户部署前的 PostgreSQL 17.11 空 public inventory 和已检查的 ensure_rls，在部署前修正这一初始版本，将旧的三条 USING(true) 以及 published 内容读取策略改为 authenticated 的 USING(false)，新增暂时关闭访问的限制性策略及权限撤销。没有重写已部署历史，没有增加学习功能。不要修改或重复运行 001；当前下一步见 MIGRATION-002.md。下列执行步骤保留作历史记录。

## 对象与操作

- public 创建 12 表：languages、users、profiles、courses、lessons、vocabulary、grammar、reviews、study_sessions、user_progress、ai_conversations、ai_usage。
- 创建索引、PK/FK/约束、两函数 create_user_profile() / consume_ai_request(uuid)、Auth AFTER INSERT 触发器 on_auth_user_created。
- 显式给每张 public 表 ENABLE RLS，并创建个人行归属 policy、关闭内容读取的 policy、全表阶段性关闭访问的 restrictive policy。撤销 anon/authenticated/PUBLIC 表权限，包含 TRUNCATE / REFERENCES / TRIGGER。
- Auth 新建账户的服务端触发器只允许 yzh72339@gmail.com；已有 Auth 用户回填对应 users / profiles，暂时全部没有浏览器学习数据访问权。后续唯一 UUID 绑定仍由后续版本建立，本阶段不称完整账号系统已验证。
- pgcrypto 未安装时创建；已安装时保留。
- 部署入口创建/使用 supabase_migrations schema，并新建私有 RLS schema_migrations 版本记录表，登记实际执行的 001 SQL。它是部署元数据，不是第二份业务 migration。
- 无 DROP、DELETE FROM、TRUNCATE、旧表重建、RESET。INSERT 仅语言种子、Auth 回填与版本记录。

## ensure_rls 兼容性

真实定义仅对新 public table / partitioned table 启用 RLS；显式 ENABLE RLS 可以重复执行，两者兼容。helper 捕获 ALTER 错误后继续，所以迁移仍自己 ENABLE RLS，并在提交前检查状态。

不删除、修改、重新创建或禁用 public.rls_auto_enable() / ensure_rls，也不调整其 EXECUTE grants。event_trigger 返回类型不允许通过普通 SELECT/RPC 调用；现有 EXECUTE=true 不等于匿名用户能使用它读取业务数据。未来可统一审查最小权限，本次保持原状。

部署入口比较前后 helper 的 pg_proc row 与 ensure_rls 的 pg_event_trigger row，含定义、owner、settings、ACL、enabled、tags；变化则事务报错回滚。将哈希写入迁移记录的 SQL 注释，供独立只读查询检查。它证明本次部署前后对象保持一致，不用于推断历史创建人。

## 只执行 001，然后验证

1. Project ocbydnsqennrumowqxvu → SQL Editor → New query → postgres。
2. 整份执行 `supabase/dashboard/001_deploy.sql` 一次。它包含 BEGIN / COMMIT 和空数据库检查，遇到已有表、记录或配置变化立即报错。不要选片段执行，不要重复运行。
3. 成功最后返回一行 version=001、name=kotoba。
4. 新查询整份执行 `supabase/dashboard/001_verify.sql`。只有 SELECT / catalog 读取，不创建对象、写入数据或改变角色。
5. 预期 versions=[001]、recorded=true、found_tables=12、problems=[]、languages=[en,ja]；Auth trigger / profiles_backfilled / ledger_rls / 两项 helper_unchanged 均 true；browser_ledger_schema_access=false。
6. 发回 migration_001_verification 结果后再判断是否通过，不运行 002。本阶段闭锁学习数据，包含 owner；这是权限封闭与结构 checkpoint，不能当成最终 Google 登录、owner CRUD、跨设备同步、PWA 验收。

执行环境没有可访问的 PostgreSQL 运行器；这里只准备源代码、生成文件与静态检查。用户已在 Dashboard 完成上述真实执行和只读验收，完整回执存于 dashboard/evidence/001_verification.json。通过范围是此 checkpoint，不是最终浏览器身份与同步验收。

源码变更后用 `node scripts/prepare-001-migration.mjs` 重新生成入口。该脚本只读取 001，不连接数据库，不运行任何 migration。
