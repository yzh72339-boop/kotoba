# 第五份真实部署：005

用户在真实 Supabase 项目执行修正版004，并提供完整 migration_004_verification：problems=[]、42张表、3条grammar/2篇article/2段listening、所有权限及保护检查符合预期。回执保存于 `supabase/dashboard/evidence/004_verification.json`。这是数据库元数据/数据保护检查，实际登录、复习RPC、跨设备/PWA同步仍待测试。

当前只交付 `005_hardening_and_projection.sql` 的单份事务入口 `supabase/dashboard/005_deploy.sql` 和只读验证 `supabase/dashboard/005_verify.sql`。用户已提交005部署回执，ledger包含005/hardening_and_projection，保存于 `supabase/dashboard/evidence/005_deployment_receipt.json`。005已登记，完整只读验证仍待提交；当前只执行005_verify.sql，不修改或重跑001–005，不提前执行006。

## 对象与数据

- 有两条 **DROP CONSTRAINT**，然后 ADD CONSTRAINT；没有 DROP TABLE、DELETE FROM、TRUNCATE、表改名或重建，不写业务记录。
- 替换 public.user_progress 的约2MiB快照CHECK约束为 `bounded_personal_snapshot`，上限16777216字节（16MiB）。
- 替换 public.mistakes 的 vocabulary/user 复合外键为 `mistakes_vocabulary_owner`；继续绑定同一用户的词汇。未来删除词汇时仅 SET NULL(vocabulary_id)，保留错误记录和 NOT NULL user_id。迁移本身不执行删除。
- 创建 private.validate_personal_snapshot() 和 user_progress BEFORE INSERT OR UPDATE OF state 触发器，要求object、version=2及八个必要顶层字段。保持原RPC签名；不是完整深层JSON schema验证。
- 新helper为SECURITY INVOKER、空search_path，撤销PUBLIC/anon/authenticated EXECUTE，private schema仍闭锁。
- 收紧review_items / sync_batches / client_id_map的authenticated直接写入权限；当前这些表已经闭锁，005不提前开放它们。
- 不修改现有RLS policies、认证/复习/同步/AI functions、Storage buckets或rls_auto_enable/ensure_rls。自动RLS helper仅处理CREATE TABLE，本份没有新建表，兼容且保留原定义和权限。

## 单份入口

1. 要求真实版本恰为001/002/003/004、42张public表、指定owner、闭锁表/schema、三个私人bucket，以及004记录的函数/策略/helper指纹。
2. 校验原两条约束名称、定义要点及复合外键列顺序；新约束、validator/trigger均不存在，防止覆盖或重复部署。
3. PostgreSQL必须15+；用户真实项目17.11支持列级SET NULL。若已有snapshot不是v2所需格式，报错停止，不替用户重写历史数据。
4. 锁定现有表，在同一事务比较全部42张表的OID、行数和完整行内容的MD5；比较既有15个函数、RLS policies及非内部app/Auth triggers的指纹。内部FK触发器随外键替换会正常重建，不误算为应用触发器变更。
5. 再检查新外键只清空vocabulary_id及validator客户端EXECUTE关闭；只写部署ledger。异常不被吞掉，事务失败不能视为部署成功。

所有DO变量使用v_前缀；目录查询和聚合列使用表别名，避免004出现的循环变量/列名歧义。

## 当前人工步骤

1. 005部署回执已收到，当前不重跑005_deploy.sql。Supabase项目your-project → SQL Editor → New query，角色postgres。
2. 已返回001/kotoba、002/personal_backend、003/sync_and_srs、004/ai_requests_and_content、005/hardening_and_projection；这是部署登记，不是完整验收。
3. 新查询完整执行005_verify.sql，只读，不调用RPC、不更改角色/JWT、不写fixture。
4. 返回完整migration_005_verification。预期problems=[]、expected/found_tables=42、snapshot_limit_bytes=16777216、private_buckets=3；三个browser_*_access=false，其余布尔检查true。
5. 完整真实只读结果通过后才进入006；本阶段不要求重新配置Google或发送Secret。

## 检查边界

Node生成器语法、生成及源码/输出结构检查通过：部署literal与canonical005一致，只有两条约束替换、一个新helper和触发器，验证文件不含执行式写入。tgattr作为int2vector可能保留0起点，因此先unnest/array_agg再比较列顺序，不直接与1起点数组比较。

新增三项pgTAP行为回归：删除词汇保留错误及其user_id、拒绝JSON null snapshot、拒绝缺必要字段的snapshot。测试fixture需在全部迁移完成后的隔离库运行，当前**未执行**，不要用于生产SQL Editor。

已尝试TypeScript check、Lint、Build；因缺少tsc/eslint/next依赖退出127，不能声称通过。当前没有可用PostgreSQL运行环境，没有本轮Desktop/Mobile/PWA浏览器验收；前端未改动。用户SQL Editor已确认005部署登记；完整只读验证与RPC/RLS行为仍待验证。

生成：`node --env-file=.env.local scripts/prepare-005-migration.mjs`。只读本地文件和server ALLOWED_USER_EMAIL，不连接远程数据库，不输出Secret。


更新：完整005真实只读验证已通过，回执见 dashboard/evidence/005_verification.json。上文“待提交”为历史阶段记录。当前进入006单份部署，不重跑005。
