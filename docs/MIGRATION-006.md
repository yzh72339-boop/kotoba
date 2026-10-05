# 第六份真实部署：006

001–005 已由用户在真实 Supabase SQL Editor 完成部署和完整只读验证。最新回执位于 `supabase/dashboard/evidence/005_verification.json`，problems=[]、42张表、原有数据与保护配置保持一致。

当前只交付 `006_personal_audio_and_memory.sql` 对应的 `006_deploy.sql` 和 `006_verify.sql`。006尚未远程执行；007–009不提前部署。已部署的001–005未修改。

## 本份对象

- 新建 `public.personal_audio_files`：owner UID、客户端ID、语言、路径、MIME、大小和时间；唯一(user_id,client_id)，大小0–50MiB，路径首段绑定user_id。
- 显式ENABLE RLS，owner_only对SELECT/INSERT/UPDATE/DELETE均要求is_private_owner() AND user_id=auth.uid()，同时设置WITH CHECK。
- 撤销PUBLIC/anon/authenticated直接表权限，保持中间部署阶段闭锁。新建更新时间触发器，复用已有private.touch_updated_at()。
- 将已有private.project_state(uuid,jsonb)改名为project_learning_state，保留OID、函数体、执行环境和权限；新建同签名project_state包装函数，扩展已有音频元数据、计划完成和个人笔记关联投影。包装函数检查owner/UID，两个private函数都撤销浏览器EXECUTE。
- 创建due_review_counts(text)：SECURITY DEFINER，空search_path，owner和有效非空语言检查，review_items限定auth.uid()。
- 创建export_personal_archive()：SECURITY INVOKER，空search_path，owner检查并依赖RLS；不会绕过底层表权限。中间部署阶段导出尚不可用，需最终权限部署完成后做实际验收。
- 两个public RPC只授予authenticated执行，不授予anon。
- 音频路径缺失明确拒绝；重复同步更新音频语言及个人episode metadata，避免占位episode丢失personal标记。

## 数据与兼容性

没有DROP、DELETE、TRUNCATE、重建表；有一条函数RENAME。函数体中包含未来同步需要的INSERT/UPDATE，但部署不调用函数、不写学习记录；只写migration ledger。

现有ensure_rls在CREATE TABLE后自动ENABLE RLS，与显式ENABLE RLS兼容。完整事务前后比较rls_auto_enable/ensure_rls目录指纹，不修改其定义或权限。

006入口只接受恰好001–005和42张public表。校验005记录的functions/policies/triggers/validator/constraints/helper指纹、owner、闭锁权限和私人bucket。新对象已存在时拒绝覆盖，不可重复部署。锁定原有表后检查42张表OID、行数和完整行MD5；旧投影函数只允许proname变化，其他pg_proc字段必须原样保留。原policy/应用触发器/005validator及约束必须一致，否则事务回滚。

成功后43张表，新音频表0行，保留三个私人bucket。新函数和音频结构指纹记入006 ledger。只读验证不调用RPC、不写fixture、不改变角色/JWT。

## 当前人工步骤

1. Supabase项目ocbydnsqennrumowqxvu → SQL Editor → New query，角色postgres。
2. 完整执行006_deploy.sql一次。应返回001–006，新增006/personal_audio_and_memory。
3. 成功后在另一个New query完整执行006_verify.sql。
4. 返回完整migration_006_verification。预期problems=[]、found/expected_tables=43、audio_rows=0、private_buckets=3、三个browser_*_access=false、其余布尔值true。
5. 完整真实验证通过后才进入007。报错或非预期结果时停止本份，不重复运行或进入下一份。

## 本地检查与限制

Node生成器语法、生成、迁移literal一致性和静态结构检查通过。现有npm test全部通过，覆盖本地复习、同步合并、音频状态及授权状态等逻辑；这不代表PostgreSQL函数已执行。

新增五项隔离pgTAP回归：空语言拒绝、浏览器不能调用private投影、音频路径跨owner拒绝、非owner不能读取待复习统计或导出。当前未执行，不能在真实生产SQL Editor运行测试fixture。

TypeScript、Lint、Build已尝试，因缺tsc/eslint/next退出127；不能标记通过。当前没有可用PostgreSQL测试环境。前端未修改，无本轮Desktop/Mobile/PWA验收。006真实部署、RLS行为、Google登录、Data API、Session持久化、跨设备同步仍待实际验证。

生成命令：node --env-file=.env.local scripts/prepare-006-migration.mjs。仅读写本地文件，不连接Supabase，不输出Secret。


最新真实状态：用户已提交001–006部署登记结果，新增006/personal_audio_and_memory。回执保存于supabase/dashboard/evidence/006_deployment_receipt.json。006已登记，完整只读验证尚待提交；当前唯一操作为006_verify.sql，不重跑部署入口，不进入007。


更新：完整006真实只读验证已通过，回执为supabase/dashboard/evidence/006_verification.json。当前进入007单份部署，上文待验证内容为历史阶段记录。
