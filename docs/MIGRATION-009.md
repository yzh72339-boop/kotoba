# Migration 009 — Private permissions and storage

001–008 的真实 Supabase 只读 checkpoint 已由用户提交并通过。008 的 owner_auth_users=0 / owner_account_status=not_created；未创建私人账号，不影响 migration 验证。完整回执见 supabase/dashboard/evidence/008_verification.json。

当前仅部署 009_private_permissions_and_storage。009 尚未有真实部署或验证结果，不重跑001–008。

## 变更

- 43张业务表显式 ENABLE RLS，并清理 PUBLIC / anon / authenticated 表权限后授予最小权限。
- authenticated：26张表可 SELECT / INSERT / UPDATE / DELETE；16张表仅 SELECT；ai_usage 完全封闭。权限不等于授权，所有访问仍经过既有 RLS 和私人 owner 检查。
- review_items、review_logs、user_progress、sync_batches、client_id_map 等关键状态保持只读，变更走已部署的事务 RPC。
- 42个 private_owner_fence：RESTRICTIVE / ALL / authenticated。user_id表绑定 auth.uid()，profiles/users绑定id；子表保留已有parent_owned/both_owned/sentence_owned策略，AND组合验证父对象所有权。私人内容表仍仅owner可用。
- 2个新增 restrictive Storage fences，保留002的stage fences及四种Storage操作策略；三个managed buckets保持private，首段路径绑定owner UUID，不影响其他bucket。
- 显式撤销Auth profile trigger函数的浏览器EXECUTE（008已撤销，保持原状态）。
- 唯一bucket UPDATE加上 public is distinct from false：已private的bucket不写入，符合当前真实状态。001–008不修改。
- 没有 DROP / DELETE / TRUNCATE / 表重建 / 学习数据回填 / Auth账号创建。
- 不新增表、不创建或改动函数定义。与rls_auto_enable / ensure_rls兼容，不变更其定义或权限。

## 入口与保护

SQL Editor → New query → postgres → 完整执行 supabase/dashboard/009_deploy.sql（不能只选部分SQL）。入口要求ledger恰好001–008，确认43张表、owner邮箱、008对象指纹、RLS及现有权限。任何009策略已存在时拒绝重跑。单一事务保存所有43张表身份、行数、数据MD5，保护原函数、策略、触发器、字段、约束、owner和全部bucket；异常整体回滚。新增42+2策略完成后才登记009。

若成功返回001–009：新查询完整执行 supabase/dashboard/009_verify.sql，提交 migration_009_verification。只读验证不得代替真实用户权限测试。

预期 problems=[]、tables43、table_owner_fences42、storage_owner_fences2、private_buckets3；三个browser_*_access=false；其余保护布尔值true。owner_auth_users=0 / not_created仍可正常通过。009开通最小浏览器表权限，所以不能再用008的“所有authenticated表权限为false”规则验证最终权限。

## 本地检查与限制

- 生成器语法、canonical SQL嵌入、008指纹表达式复用、单版本/事务保护、权限矩阵、只读验证及轻量词法检查通过。
- 现有57项Node测试全部通过。
- private_permissions.test.sql扩充至21项：不可转移owner、不可直接写review history、非owner不可更新/删除、restrictive fences和RPC表权限。仅用于隔离测试库；未运行pgTAP，不能在生产库插入fixture。
- 没有可用PostgreSQL执行器；轻量词法检查不等于数据库解析或运行成功。
- TypeScript/Lint/Build依赖未安装，按照用户009→Build顺序处理；不声称已通过。
- 开发环境Data API真实连接、Google/密码登录、匿名/非owner/owner行为、Session、跨设备同步和PWA验收尚待完成。

009部署和验证通过后，优先Build及私人账号配置/首发核心验收。AI Tutor、AI Speaking、现代FSRS暂缓。


用户已提交001–009部署登记回执；009已登记，尚待完整migration_009_verification。当前只读验收，不重跑部署，不把版本列表当成RLS行为或登录验收。


用户已提交完整009验证并通过：problems=[]、43表、42个业务fence、2个Storage fence、全部对象与数据保护检查通过。009不再重跑。所有九份真实只读checkpoint完成，但不等于真实owner/非owner行为测试；owner账号尚未创建。后续见FIRST-RUN.md和FIRST-RELEASE-CHECKS.json。
