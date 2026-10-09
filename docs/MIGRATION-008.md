# 第八份真实部署：008

001–007已由用户在真实Supabase SQL Editor完成逐份部署和完整只读验证。最新回执见supabase/dashboard/evidence/007_verification.json，problems=[]、43张表、保护和数据保持检查符合预期。当前只交付008_deploy.sql和008_verify.sql，008尚未真实执行，不提前部署009。

## 对象和认证保护

- private.app_owner新增可空user_id UUID，UNIQUE，引用auth.users(id)，未来删除Auth账号时SET NULL。已有指定邮箱对应一个Auth用户时绑定原UUID；没有Auth用户时保持NULL，等待首次私人账号初始化。
- is_private_owner()同时要求auth.uid()、绑定UUID、JWT邮箱、实时Auth邮箱一致及email_confirmed_at非空，全部在数据库服务端检查。
- configure_private_owner仍只允许service_role执行；已绑定后拒绝变更到另一个邮箱，复用私人账号初始化helper。
- guard_owner_signup检查指定邮箱及UID；create_user_profile在同一事务将唯一UID固定，并初始化users/Profile/English/Japanese档案。
- 新private.ensure_private_profile仅接受已绑定到owner的Auth UID；撤销PUBLIC/anon/authenticated EXECUTE，Auth trigger内部调用不依赖浏览器JWT。
- 新get_private_account()只接受当前确认后的owner，从auth.uid()读取Profile/User Languages/Progress，SECURITY DEFINER、空search_path、anon不能执行。
- 增加5个CHECK：英语/日语current/target等级范围、Profile名称/母语/timezone长度。
- 原投影改名project_state_v7，增加同签名包装函数保存偏好，旧客户端缺字段时保留原值，更新限定owner UID。新旧private投影均闭锁。

原008含重复DROP/CREATE四条legacy策略；002部署前已补齐同样的owner+auth.uid()归属限制，因此本份取消重复替换，保留既有策略及OID。没有DROP、DELETE、TRUNCATE、表重建或新业务表；一条函数改名，4个Auth函数CREATE OR REPLACE，三个新函数，一个私人字段及其UNIQUE/FK和5个CHECK。

部署只更新private.app_owner的UID绑定，不创建Auth账号、不写学习业务记录、不回填用户语言级别。已有账号如需要补齐语言档案，可在最终权限部署后的私人账号初始化步骤调用configure_private_owner；本份不猜测或覆盖现有偏好。

## 单份事务保护

只接受真实ledger恰为001–007、43张public表、原owner、RLS及闭锁表/schema权限、三个私人bucket。检查007全部目录指纹；新增对象已存在时拒绝覆盖。Auth邮箱对应多个UUID、已有Profile/等级不满足新约束时停止，不能自动清理数据。

锁定auth.users/43张业务表/private.app_owner。事务前后比较43张表OID/行数/完整行MD5、全部旧public列及约束、全部策略和非内部app/Auth触发器；学习函数只允许project_state改名，4个认证函数体按本份计划更新。private owner原字段必须不变，新增UID只能指向指定邮箱的真实Auth用户。

本份没有CREATE TABLE，与ensure_rls事件兼容；rls_auto_enable/ensure_rls定义、目录及权限保持不变。异常回滚；只能完整执行一次。

## 当前人工操作

1. Supabase项目your-project → SQL Editor → New query，角色postgres。
2. 完整执行008_deploy.sql一次。应返回001–008，新增008/phase_one_private_account。
3. 成功后新查询执行完整008_verify.sql。
4. 返回完整migration_008_verification。预期problems=[]、found/expected_tables=43、private_buckets=3、三个browser_*_access=false、其余布尔检查true。
5. owner_auth_users为0或1；owner_account_status可能not_created/confirmed/unconfirmed。没有账号并非迁移失败，owner_identity_consistent应为true；账号初始化/确认在009后单独处理，不能据迁移声称登录已通过。
6. 验证通过后继续009，再Build与核心功能验收；不要求Google Secret或其他Secret发送到聊天。

## 检查边界

Node生成器语法、生成和定向静态结构检查通过。现有npm test通过。账号pgTAP文件新增4项有效回归：不同UUID不能占用绑定邮箱、浏览器不能执行初始化、实时Auth确认状态优先于缓存JWT、未确认账号不能加载私有档案；plan=22，仅用于隔离数据库，当前没有PostgreSQL运行结果。

TypeScript/Lint/Build依赖仍缺，留待009后Build步骤处理，不认定已通过。前端未修改，无本轮浏览器设备验收。008未真实部署；RLS目录检查不等于实际登录/拒绝/Session/双端同步验收。

生成命令：node --env-file=.env.local scripts/prepare-008-migration.mjs。不连接远程数据库、不输出Secret。


最新真实状态：用户已提交001–008部署登记结果，新增008/phase_one_private_account。回执保存于supabase/dashboard/evidence/008_deployment_receipt.json。008已登记，完整只读验证尚待提交；当前唯一操作为008_verify.sql，不重跑部署入口，不进入009。


用户已提交完整008验证：problems=[]、43张表及所有保护检查符合预期；owner_auth_users=0 / not_created。008只读checkpoint通过，下一步009，不能重跑008。
