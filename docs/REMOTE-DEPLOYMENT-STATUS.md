> 最新账号状态：私人账号已经创建并通过完整只读检查（邮箱确认、UID绑定、Profile和en/B1、ja/N3）。不要再次创建账号。最新Auth API仍显示disable_signup=false；当前唯一人工步骤为关闭公共注册。见LOGIN-ACCEPTANCE.md。

> 最新状态（2026-10-05）：001–009真实只读检查通过；依赖、TypeScript、零警告Lint、57项测试及生产Build通过。Supabase Auth/Data API连通和匿名词汇拒绝已验证；owner账号仍未创建，公共注册需关闭，实际登录/同步/安装待验收。当前操作见[FIRST-RUN.md](FIRST-RUN.md)。旧段落中的网络/Build阻塞属于历史记录，不代表最新状态。

# 真实数据库检查状态

用户已在 Supabase 项目 `ocbydnsqennrumowqxvu` 的 SQL Editor 执行 `00_remote_inventory.sql`，并提交完整结果。

已由该结果确认：

- PostgreSQL 17.11。
- public 没有应用表、RLS policy 或表权限记录。
- 没有 `supabase_migrations.schema_migrations`，没有 private schema / app_owner。
- 没有 auth.users 的非内部普通触发器。
- 没有本应用指定的 Storage bucket。
- public 有唯一被列为非扩展成员的函数 `rls_auto_enable()`。

这确认部署前 SQL Editor 的真实数据库只读查询成功；不代表开发环境 Data API 连接、登录、跨设备同步或完整 RLS 行为验证成功。用户随后报告执行第一份 001 migration，先提交部分截图，再提交完整 `migration_001_verification`：versions=[001]、expected/found_tables=12、problems=[]、languages=[en,ja]；ledger RLS / Auth trigger / Profile 回填 / 001 record / 两项 helper 保持不变均 true；浏览器 ledger schema access=false。001 的真实数据库 checkpoint 已通过。完整回执保存于 dashboard/evidence/001_verification.json。

本地九份 migration 没有定义或引用 `rls_auto_enable()`。函数名字可以提示自动启用 RLS 的用途，但不能证明由谁创建；此前 inventory 也没有查询 `pg_event_trigger`，所以不能根据 auth_user_triggers=[] 推断该函数没有 DDL 事件触发器。

用户已在真实项目执行 `00b_inspect_rls_auto_enable.sql`：owner=postgres，return_type=event_trigger，SECURITY DEFINER，search_path=pg_catalog；只处理 public 新表 ENABLE RLS，异常时日志后继续。关联 ensure_rls 为 ddl_command_end / enabled=O，tags 为 CREATE TABLE、CREATE TABLE AS、SELECT INTO；没有普通触发器或扩展归属。anon/authenticated EXECUTE=true 保持原状，不能据此通过普通 SELECT/RPC 调用 event_trigger 函数。

PostgreSQL 的函数 catalog 不记录可用于追溯真实创建人的通用创建时间/作者历史。所有者和注释属于来源线索；若定义与 Supabase 自动 RLS 模板一致，只能据此评估用途和兼容性。确切创建来源仍需与可信的 Supabase 初始化记录 / 项目操作记录对照。

已确认用途兼容，保留 helper；迁移仍显式设置 RLS 与权限，自动 ENABLE RLS 不会生成正确 policy，也不能限制 TRUNCATE。用户在两张 002 截图之后提供完整 migration_002_verification：versions=[001,002]、expected/found_tables=41、problems=[]、private_buckets=3；owner 邮箱配置、所有权检查结构、旧表身份/行数、Auth triggers、表/schema 闭锁、Storage RLS 与 helper 保持不变的全部检查符合预期。完整回执存于 dashboard/evidence/002_verification.json，002 数据库 checkpoint 已通过。

001/002 不修改或重跑。用户已提供部署结果，真实 ledger 包含 001/kotoba、002/personal_backend、003/sync_and_srs，保存于 dashboard/evidence/003_deployment_receipt.json。用户随后提交完整 migration_003_verification：problems=[]、41 张表、8 个函数，全部布尔检查符合预期，回执保存于 dashboard/evidence/003_verification.json，003 数据库 checkpoint 已通过。当前只准备 004 单独部署及只读验证，详见 MIGRATION-004.md；用户随后提交 004 部署失败截图：SQLSTATE 42702，发生于 ledger INSERT。部署入口 loop variable t 与内容指纹查询未限定的 t 列冲突，已在生成器中修正为 q.t / q.id / q.data。用户现已提交完整 004_failure_inventory：版本001/002/003、41表、新表/RPC/004登记不存在、四个starter计数0、两个helper unchanged=true，与回滚到003的预期一致。回执保存于 dashboard/evidence/004_failure_inventory.json。用户随后提交修正版部署结果，ledger 已包含004/ai_requests_and_content，保存于 dashboard/evidence/004_deployment_receipt.json。用户随后提交完整004只读验证：problems=[]、42表、3条grammar/2篇article/2段listening，全部保护检查符合预期。回执保存于 dashboard/evidence/004_verification.json，004数据库checkpoint已通过。当前只准备005_deploy.sql/005_verify.sql（MIGRATION-005.md），用户随后提交005部署回执，ledger包含005/hardening_and_projection，保存于 dashboard/evidence/005_deployment_receipt.json。005已登记，完整只读验证仍待提交，当前只执行005_verify.sql。006–009不提前执行。应用 Data API、Google 登录、owner CRUD、会话持久化或跨设备/PWA 同步仍待真实验证，不能把元数据 checkpoint 当成所有运行时行为验收。


用户现已提交完整 migration_005_verification：problems=[]、42张表、16MiB上限、全部保护和数据保持检查符合预期。回执保存于 dashboard/evidence/005_verification.json，005数据库checkpoint通过。当前唯一待部署文件为006_deploy.sql，之后运行006_verify.sql；006尚无真实部署或验证回执。007–009不提前执行。


最新真实状态：用户已提交001–006部署登记结果，新增006/personal_audio_and_memory。回执保存于supabase/dashboard/evidence/006_deployment_receipt.json。006已登记，完整只读验证尚待提交；当前唯一操作为006_verify.sql，不重跑部署入口，不进入007。


用户已提交完整migration_006_verification：problems=[]、43张表、audio_rows=0、其余保护和数据保持检查符合预期。回执保存于dashboard/evidence/006_verification.json。006数据库checkpoint通过，当前唯一待部署为007_deploy.sql，成功后运行007_verify.sql；007尚未真实部署，008–009不提前执行。


最新真实状态：用户已提交001–007部署登记结果，新增007/audio_position_identity。回执保存于supabase/dashboard/evidence/007_deployment_receipt.json。007已登记，完整只读验证尚待提交；当前唯一操作为007_verify.sql，不重跑部署入口，不进入008。首发优先：007→008→009→Build→核心功能验收，AI Tutor/AI Speaking/现代FSRS暂缓。


用户已提交完整migration_007_verification：problems=[]、43张表、全部保护和数据保持检查符合预期。回执保存于supabase/dashboard/evidence/007_verification.json，007完整只读checkpoint通过。当前准备008单份部署和验证；009不提前执行。


最新真实状态：用户已提交001–008部署登记结果，新增008/phase_one_private_account。回执保存于supabase/dashboard/evidence/008_deployment_receipt.json。008已登记，完整只读验证尚待提交；当前唯一操作为008_verify.sql，不重跑部署入口，不进入009。


用户已提交完整 migration_008_verification：problems=[]、43张表、全部对象/数据保护检查符合预期。回执保存于supabase/dashboard/evidence/008_verification.json，008真实只读checkpoint通过。owner_auth_users=0，owner_account_status=not_created。当前唯一待部署为009_deploy.sql，之后运行009_verify.sql；009尚无真实部署/验证回执。通过后进入Build、账号配置和核心验收。


最新真实状态：用户已提交001–009登记结果，新增009/private_permissions_and_storage。回执保存于supabase/dashboard/evidence/009_deployment_receipt.json。009已登记，完整只读验证仍待提交；当前仅执行009_verify.sql，不重跑迁移。Build、账号创建及核心功能验收在009验证通过后继续。


用户已提交完整009验证：problems=[]、43表、42个表fence、2个Storage fence、3个private bucket，各项保护检查通过。回执见supabase/dashboard/evidence/009_verification.json。001–009真实只读checkpoint全部通过。当前owner_auth_users=0 / not_created；尚无真正登录、用户RLS行为或设备同步验收。进入首次Build：公开环境检查与57项Node测试通过，依赖安装因sandbox网络EPERM被阻止，额外网络权限请求未完成。tsc/eslint/next未安装，检查exit127；Data API仍未验证。当前准备私人账号创建及可联网本机Build步骤，不重跑migration。
