# 第三份真实部署：003

001 与 002 已由用户在真实项目执行并提供完整验证结果，数据库 checkpoint 均通过。002 的完整回执保存于 `supabase/dashboard/evidence/002_verification.json`。这不是 Google 登录、会话保持或跨设备同步验收。

用户现已提交部署结果，ledger 包含 001/kotoba、002/personal_backend、003/sync_and_srs，回执存于 `supabase/dashboard/evidence/003_deployment_receipt.json`。用户随后提交完整 `migration_003_verification`，problems=[]、41 张表/8 个函数且全部检查符合预期，回执保存于 `supabase/dashboard/evidence/003_verification.json`。003 数据库 checkpoint 已通过，当前进入 004 的单独部署准备，不重复部署 001/002/003。以下部署步骤保留供审计。

## 对象与数据

- 安装八个函数：三个 public RPC record_review / sync_personal_state / personal_progress；五个 private helper resolve_id / validate_review_target / create_review_item / create_grammar_review / project_state。
- 安装四个触发器：review_items 验证目标对象归属，Vocabulary / Saved Sentences / Grammar Progress 新记录进入统一复习表。
- 不创建、删除、改名或清空业务表。41 张应用表、六张 legacy 表、已有行、RLS policies、Storage 和 Auth functions 保留。
- 没有 DROP / DELETE FROM / TRUNCATE / RESET。INSERT / UPDATE 出现在函数体内，安装时仅保存函数定义，不调用复习或同步函数。唯一执行的数据写入是部署 ledger 登记 003。
- anon 不能执行三个 RPC；authenticated 可以调用，但仍检查 is_private_owner 并从 auth.uid() 获取用户。private helper 撤销 PUBLIC / anon / authenticated EXECUTE，private schema 仍不开放。
- direct browser table privileges 继续关闭。personal_progress 是 SECURITY INVOKER，需等最终最小表权限部署完成才能通过浏览器正向调用；此处不提前授予宽权限。

## 部署前修正的事务问题

- sync 明确拒绝 NULL / 负数 expected_revision、空 batch_id、非 object / 非 v2 / 缺少关键字段的 snapshot。NULL 比较不再绕过 CAS。
- direct review 与 snapshot replay 使用同一用户 advisory transaction lock；复习事件按时间/事件 ID 顺序重放，原复习 item 与日志、词汇/语法掌握度在同一事务更新。
- 重复事件的卡片、评分和时间一致时返回当前 item，不重复写日志；同一事件 ID 被用于不同 payload 时拒绝。快照重放省略 elapsed_ms，因此重复时保留首笔已记录时长，避免错误覆盖。
- public RPC 显式撤销 anon EXECUTE，不能只依赖撤销 PUBLIC（项目默认权限可能直接授予 anon）。private helpers 显式撤销客户端执行。
- signature 与前端参数名不变，界面和学习调度算法不改。

现有算法是 **SM2 / sm2-v1，不是 FSRS**，不能把 stability / difficulty 字段存在当成 FSRS 已完成。全量现代 FSRS、独立每日统计和真实复习行为仍待后续验证/实现。本次仅完成现有数据库基础设施的安全部署准备。

003 在不调用函数的情况下安装；快照中引用固定课程内容的投影依赖后续 004 内容，现有 user_progress 仍受 001 的约 2 MiB 约束，005 才扩至 16 MiB。最终 account RPC 和权限由 008/009 完成，不能在当前阶段宣称 PC/Mobile/PWA 已跑通。

## 执行与验证

1. SQL Editor → New query，角色 postgres，完整执行 003_deploy.sql 一次。
2. 入口要求版本只有 001/002、41 张表一致、private owner 邮箱正确、表权限闭锁及 RLS 不变、三个 bucket Private，且新八个函数尚不存在。条件不符、锁超时或数据/权限变化即报错回滚。
3. 迁移前后比较全部 41 张表的 OID 和行数、现有 policies / Auth functions / 两个 RLS helper。把检查指纹存入 ledger，供独立只读验证。
4. 成功最后返回版本 001/kotoba、002/personal_backend、003/sync_and_srs。
5. 新查询完整执行 003_verify.sql。只有读取，不调用 RPC、不伪造 JWT、不改变角色、不写学习记录。
6. 发回完整 migration_003_verification；预期版本 [001,002,003]、tables=41、functions=8、problems=[]、private_buckets=3；三个 browser_*_access=false，其余布尔项 true。成功再准备 004。

## 本地与真实验证边界

生成器语法/结构检查、现有同步协调器八项本地测试通过。补充的两项 PostgreSQL pgTAP 回归测试用于 NULL revision 与复习事件冲突，所在文件需在全部迁移完成的隔离测试库运行，**没有执行**，不能放到生产 SQL Editor 作为验证脚本。

没有可访问的 Cloud PostgreSQL / Docker runner；开发环境没有执行远程 SQL。用户已提交 003 部署 ledger 回执与完整只读验证结果，数据库 checkpoint 已通过。尚未声称其 PL/pgSQL body 已通过真实调用、OAuth、RLS 正向/反向行为或跨设备测试。

生成命令：`node --env-file=.env.local scripts/prepare-003-migration.mjs`。只读取文件与服务端 ALLOWED_USER_EMAIL，生成当前这一份部署和验证 SQL，不连接数据库，不输出 Secret。
