# Supabase migration 源码审查与逐个部署

当前 Google Provider 已由用户在 Dashboard 启用；这只确认 Provider 配置，不确认应用登录成功。用户已提交真实 SQL Editor inventory：PostgreSQL 17.11，应用表/策略/迁移历史为空，但存在 `rls_auto_enable()`。详见 [真实数据库检查状态](REMOTE-DEPLOYMENT-STATUS.md)。开发环境 Data API 连接与登录仍未验证。本轮不修改学习页面或增加学习功能。

用户随后提交了 helper 的真实定义与 ensure_rls 配置，确认它只对新 public 表启用 RLS。001/002 在部署前修正后，均已由用户真实部署并提供完整验收回执。003 的完整真实只读验收现已通过，004的完整真实只读验收现已通过，005完整真实验收已通过，006完整真实验收已通过，007完整真实只读验收已通过，当前准备 [008单独部署与验收](MIGRATION-008.md)，不修改已执行的001/002/003/004，不修改或删除 helper，不执行后续 migration。

## 文件、顺序与部署状态

| 顺序 | 文件 | 主要操作 | 重复执行 |
| --- | --- | --- | --- |
| 1 | `001_kotoba.sql` | 原型表、触发器、RLS、已有 Auth 账户回填 | 会报表/触发器/策略已存在 |
| 2 | `002_personal_backend.sql` | 旧表及索引改名、新个人表、RLS、Storage | 会报对象已存在或旧名称不存在 |
| 3 | `003_sync_and_srs.sql` | 复习与同步 RPC、触发器 | 会报触发器已存在 |
| 4 | `004_ai_requests_and_content.sql` | AI 请求表及基础内容 | 表/策略已存在；内容插入自身有冲突保护 |
| 5 | `005_hardening_and_projection.sql` | 约束替换、权限收紧、快照触发器 | 原约束已移除、触发器已存在 |
| 6 | `006_personal_audio_and_memory.sql` | 音频元数据表、函数改名、导出 RPC | 表/函数/改名冲突 |
| 7 | `007_audio_position_identity.sql` | 新列、投影函数改名 | 列/函数/改名冲突 |
| 8 | `008_phase_one_private_account.sql` | owner UUID、限制旧记录、账号 RPC | 列/约束/函数/策略/改名冲突 |
| 9 | `009_private_permissions_and_storage.sql` | 最小权限、限制性 RLS、Private bucket | 策略已存在 |

**部署前 inventory 为空；001/002 的真实完整回执均通过，用户最新 ledger 回执包含001、002、003、004。** 003 的完整只读验证已通过，004首次报42702并确认回滚，修正后现已部署登记；004完整验收现已通过，005完整真实验收已通过，006完整真实只读验证通过，007完整真实只读验证通过，008已登记待完整验证，009未部署。开发环境没有执行过任何远程 migration。上述非幂等文件不能用反复运行、忽略报错来判断是否部署。

`supabase/dashboard/*.sql` 是部署辅助文件，不是新增 migration；`supabase/tests/*.sql` 是隔离测试 fixture，不应在生产数据库执行。

## 数据变更审查

迁移中没有 `DROP TABLE`、执行式 `TRUNCATE` 或 `DELETE FROM`。

- 002 将六张旧表保存为 `legacy_*`，并创建新的同名现代结构；并非将旧表删除后重建。旧表主键索引也改名，避免新旧索引冲突。只显式回填新 Profile，旧词汇和旧复习历史等**没有全部自动导入新结构**，因此保留旧表不代表旧数据迁移验收完成。
- 002 / 008 删除后重建部分 RLS policy；005 删除后新增两个 constraint；006–008 改名投影函数并建立包装函数。这些会改变行为和对象依赖，需要同一份 migration 在事务中提交，不能片段运行。
- 001 创建已有 Auth 账户对应的原型记录；004 插入基础内容；008 绑定已有 Auth UUID；009 把指定 bucket 改为 Private。这些是持久变更。
- 多处 FK 使用 `ON DELETE CASCADE`，安装时不会主动删除行，但未来删除 Auth 用户、词汇或句子会触发关联删除。
- 003 的函数在被调用时更新学习快照、学习记录、复习日志和掌握度。创建函数时不执行其业务体；这不是数据清空操作。

## RLS / ownership 审查

按九份迁移最终源码，43 张应用 public 表均启用 RLS，`private.app_owner` 已在已部署的 002 中启用 RLS（009 再次 ENABLE 兼容）；Storage 使用 Supabase 管理的 `storage.objects` RLS，并增加私人 bucket 策略。**当前真实完整检查已通过 001 的 12 表和 002 的 41 表 checkpoint，003 的 41 表/8 函数完整元数据检查也已通过。**

个人父表用 `user_id=auth.uid()`；Profile / users 的身份列用 `id=auth.uid()`。词汇例句、搭配等检查父词汇归属；句词关系检查两侧父对象；句法关系检查句子归属；AI 消息通过 `(conversation_id,user_id)` 复合 FK 验证父会话与用户一致。

Grammar / Articles / Listening Episodes 等内容表没有每行 user_id，但仅允许 `is_private_owner()`，最终该函数同时检查固定 Auth UUID、JWT 邮箱、当前 Auth 邮箱及确认状态。它们不是公共内容。RPC 从 `auth.uid()` 推导当前用户，不让浏览器传任意 user_id 取得私人记录。

用户 CRUD 不是一律直接开放：复习日志、调度字段、同步映射、学习快照等表只允许浏览器读取，写操作交由 owner 检查后的事务 RPC。一般个人表使用 ALL policy 的 USING / WITH CHECK 同时保护 SELECT / DELETE、INSERT / UPDATE。

## 安全问题与逐个部署约束

历史源码确有以下问题，不能说“每个版本都已经严格保护”：

1. 最初的 001 有三个 `USING(true)` 和 published 策略。001 源文件在部署前已经修正：五条内容读取策略 USING(false)，新 Auth 用户触发器验证指定邮箱，全部 12 表增加闭锁策略并撤销浏览器权限；没有留下等到 002 才关闭的窗口。
2. 原 002 对部分旧个人表只检查 owner 邮箱，没有行 user_id。当前在 002 部署前补齐旧个人行归属，is_private_owner 提前验证实时 Auth 邮箱及确认状态；008 仍负责固定唯一 Auth UUID。
3. 原源码要到 009 才显式撤销默认 grants 中可能存在的 TRUNCATE 等权限。已部署 002 的全部 41 张 public 表已增加权限撤销，中间 checkpoint 直接浏览器访问关闭；009 再明确授予最终最小权限及限制性策略。
4. 原 002 创建 bucket 时 ON CONFLICT DO NOTHING，可能保留同名公开 bucket。当前 002 改为冲突时只改 public=false，并增加 managed bucket 的限制性 Storage fences；部署入口还要求这些 bucket 尚未创建。009 的最终 Storage fences 与现有阶段性 fences 相容。
5. 原 private.app_owner 的 RLS 要到 009 才启用。当前已在 002 创建后显式启用并撤销浏览器权限；private schema 不开放给浏览器。

因此从现在开始，**不使用旧的整批 02_fresh_project_migrations.sql**。逐个部署前需根据真实 inventory 制作对应单份事务入口；中间阶段应保持学习数据访问关闭，不等到 009 才处理暴露窗口。不能裸跑旧 001 后停下来并开放学习入口。已部署历史不能直接重写来伪装修复，需要针对现状的补丁。

每份部署后检查：版本记录、预期表/列/触发器/函数、RLS 状态、具体 USING / WITH CHECK、匿名与 authenticated grants；随后进行该阶段的匿名 / 非 owner 权限测试。管理员 postgres 看得见行不是 RLS 行为验证。通过后再准备下一份，不标记后续版本已部署。

## 当前只部署并验证008

001–007已完成真实SQL Editor部署和完整只读检查。007回执见dashboard/evidence/007_verification.json。当前只执行008_deploy.sql，再执行008_verify.sql；不重跑001–007，不提前部署009。

008在private.app_owner增加唯一Auth UID绑定；替换4个Auth函数、增加私人初始化/账号读取/偏好投影函数及5个输入约束。部署前移除原本重复DROP/CREATE的4条legacy策略；这些策略在002就已限定owner和auth.uid()，现保持不变。新helper和trigger函数ACL明确闭锁。学习数据、原有列/约束/触发器及RLS策略均保存，owner仅增加UID绑定。

首发优先按008→009→Build→核心功能验收推进，AI Tutor/AI Speaking/现代FSRS暂缓。008已收到真实部署登记回执，完整只读验证待提交；数据库目录检查不是登录、账号拒绝和双端同步的完整行为验收。


当前checkpoint：001–008真实只读验证通过；008 owner尚未创建。下一份009（未部署）只授予最小表权限和新增restrictive fences，无删除/重建/业务数据写入，保留parent policies和rls_auto_enable/ensure_rls。完整审查/限制见MIGRATION-009.md。009通过后Build→账号配置/核心验收；AI Tutor、AI Speaking、现代FSRS暂缓。


最终真实checkpoint：001–009已逐份部署并验证，43表、42+2 restrictive fences、3个private buckets，problems=[]，helper/event trigger保持不变。无需再执行迁移；实际登录/RLS行为、Session、同步和PWA待验收。Build因执行环境依赖下载EPERM阻塞，已整理首次运行和账号创建步骤。
