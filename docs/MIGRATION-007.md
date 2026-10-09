# 第七份真实部署：007

001–006已由用户在真实Supabase SQL Editor完成单份部署和完整只读验证。最新回执见supabase/dashboard/evidence/006_verification.json：problems=[]、43张表、音频表0行、所有保护及数据保持检查符合预期。当前只交付007_deploy.sql与007_verify.sql，007尚未真实执行，008–009不提前部署。

## 本份对象

- public.personal_audio_files新增source_updated_at TIMESTAMPTZ，可空、无默认值，记录原始文件选择时间。
- public.listening_progress新增media_id TEXT，可空、无默认值，用于区分播放位置所属的录音。
- private.project_state(uuid,jsonb)改名为project_state_v6，保留原函数OID、函数体、环境与权限。
- 新建同签名private.project_state包装函数；校验is_private_owner和uid=auth.uid，调用原投影后保存两个新字段，UPDATE均限定user_id=uid。
- 新函数SECURITY DEFINER、空search_path；project_state/project_state_v6都撤销PUBLIC/anon/authenticated EXECUTE。原project_learning_state维持闭锁。

没有DROP、DELETE、TRUNCATE、重建表或新业务表；有两个ADD COLUMN和一次函数RENAME。函数体内的UPDATE仅在后续sync RPC调用时运行，部署不调用同步函数，不写学习记录。既有行的新增字段保持NULL，不伪造录音版本或回填猜测数据。

本份没有CREATE TABLE，ensure_rls对应CREATE TABLE事件不会发生冲突；rls_auto_enable/ensure_rls的定义、权限和目录指纹保持不变。既有RLS policies与表/schema权限保持闭锁。

## 部署保护

入口只接受真实ledger恰为001–006、43张public表、原owner和私人buckets；校验006全部记录的函数、策略、触发器、validator、约束与音频结构指纹。已有目标列或project_state_v6时拒绝重复部署。

事务锁定原有表后，比对43张表OID、行数和全部原有字段的完整行MD5。新增列会使to_jsonb(row)多两个键，因此针对音频表移除source_updated_at、听力进度表移除media_id后比较；所有原有字段仍完整参与指纹。同时比对全部旧列catalog、public约束、非内部app/Auth触发器、RLS策略及19个已有函数；仅允许旧project_state函数名变更。

后置检查新列没有被回填、所有私人投影函数不向浏览器开放、RLS helper未变化，再记录007 ledger。异常回滚，不能通过反复执行或忽略错误进入下一份。

## 当前人工操作

1. 项目your-project → SQL Editor → New query，角色postgres。
2. 完整执行007_deploy.sql一次。应返回001–007，新增007/audio_position_identity。
3. 成功后在新的查询执行完整007_verify.sql。
4. 返回完整migration_007_verification。预期problems=[]、found/expected_tables=43、private_buckets=3、三个browser_*_access=false、其余布尔检查true。
5. 完整验证通过后才进入008。本阶段不需要Google Secret或其他新增Secret。

## 本地检查和限制

Node生成器语法、生成和结构检查通过，部署literal与canonical007一致。现有npm test全部通过。新增三项隔离pgTAP行为回归：更换录音后的media_id、播放位置重置、新选择时间；测试文件总plan为37。pgTAP尚未执行，只能在全部migration完成后的隔离测试库运行，不能在生产SQL Editor运行fixtures。

TypeScript、Lint、Build已尝试，仍因缺tsc/eslint/next退出127，不能认定通过。没有可用PostgreSQL测试环境，007尚未真实部署或运行。前端未修改，本轮无Desktop/Mobile/PWA设备验收。真实RLS行为、Session与双端同步仍需最终账号验收。

生成命令：node --env-file=.env.local scripts/prepare-007-migration.mjs；不连接Supabase、不执行远程SQL、不打印Secret。


最新真实状态：用户已提交001–007部署登记结果，新增007/audio_position_identity。回执保存于supabase/dashboard/evidence/007_deployment_receipt.json。007已登记，完整只读验证尚待提交；当前唯一操作为007_verify.sql，不重跑部署入口，不进入008。首发优先：007→008→009→Build→核心功能验收，AI Tutor/AI Speaking/现代FSRS暂缓。


用户已提交完整migration_007_verification：problems=[]、43张表、全部保护和数据保持检查符合预期。回执保存于supabase/dashboard/evidence/007_verification.json，007完整只读checkpoint通过。当前准备008单份部署和验证；009不提前执行。
