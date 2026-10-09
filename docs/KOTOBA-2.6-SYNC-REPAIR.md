# Kotoba 2.6 — 同步兼容修复与验收断点

2.6 阶段内容下限已完成：150 个语法专题、60 篇阅读、667 张词汇卡。本轮内容增量为 0；不重复扩充已经达到下限的资料。完整 V3 目标仍缺 1,110 个语法和 530 篇阅读。

## 本轮实际修改

- 阅读在「提交此题」时立即保存错题到现有错题/SRS 系统。随后改正、刷新或再次提交不会抹掉初次错误，不重复创建同一轮同一题的卡片；保留文章来源。
- 页面进入后台缓存时暂停学习计时，pageshow 恢复；恢复联网时触发既有同步。后台时长不计为学习时长。
- 保存状态区增加重试保存、重试同步和导出入口。仍有待同步操作时不显示云端同步成功；成功重试后更新本地状态。

## 新增 011 的必要性

本轮隔离 PostgreSQL 验证真实复现：

```text
ERROR: invalid input syntax for type uuid: "reading-mistake-…"
CONTEXT: private.project_learning_state(uuid,jsonb)
```

原函数将 mistake.id 与 study session.id 直接转为 UUID。2.6 的错题、语法和阅读幂等完成事件使用稳定文本 ID，因而会阻断整个快照事务。过去只用 UUID 事件的 SQL fixture 未覆盖这个分支。

改前端 ID 会破坏已保存的卡片/来源/记录；关闭 RLS 或跳过投影也不合适。因此最小兼容修复 **011_text_event_identity** 只修改 private.project_learning_state 的两处事件键转换：合法 UUID 保持不变；文本 ID 使用已经存在的 private.resolve_id 映射 UUID。完整用户快照、客户端 ID、卡片和调度不变。

无 DROP、TRUNCATE、DELETE、表重建或数据清除。不修改 001–010、RLS、owner、ensure_rls 或复习函数。CREATE OR REPLACE 保留现有函数定义中的安全属性和权限。SQL 对源函数的两个准确片段有校验，不匹配会整笔回滚。Dashboard 版本有事务、迁移记录匹配、策略/表/helper 不变检查；重复执行已记录的同一份 SQL 不修改数据。

## 生产执行：一次一个迁移

**后续状态：用户已完成生产 011，提供 `problems: []` 的只读验证，并报告手机学习/同步/刷新成功。** receipt 存于 `supabase/dashboard/evidence/011_verification.json`。本执行器没有连接生产执行 SQL。以下步骤保留为部署记录，当前项目不要重复执行。

1. 打开项目 `your-project` 的 Supabase Dashboard → SQL Editor → New query。
2. 只执行 [011_deploy.sql](../supabase/dashboard/011_deploy.sql)。不要重跑 001–010，也不要执行 rollback 文件。
3. 成功后版本列表应包含 `011 / text_event_identity`。
4. 新建查询，只执行只读 [011_verify.sql](../supabase/dashboard/011_verify.sql)。期望 `problems: []`、`migration_011_recorded: true`、`private_helpers_browser_access: false`、`private_buckets: 3`。
5. 返回 Kotoba 设置点击 Sync now，然后核对手机完成一题/一课后的同步状态、刷新恢复与第二设备。

遇到报错停止下一步，保留错误文本与验证结果。无需发送任何密码、token 或 Secret。

## 回滚方案

部署事务失败会自动恢复原函数，迁移不会被记录。若部署成功后有实际兼容问题，先停止相关学习写入并人工核对；[011_rollback.sql](../supabase/dashboard/011_rollback.sql) 仅供明确决定回滚时执行，不属于正常部署流程。它反向恢复原函数的两个表达式，不删除任何数据或迁移记录，但会重新引入文本事件不能同步的问题。恢复兼容性应采用审查后的向前修复，不能通过删除 ledger 后重跑迁移解决。

## 本轮验证

- Node：159/159 PASS（4 项新增回归）；TypeScript、Lint PASS。
- 内容阶段审计 PASS；数据仍为 150/60。完整 `--require-targets` 不达标的结论不变。
- 隔离 PostgreSQL 17：011 部署/重复部署、UUID 原事件、文本事件、改正错题、重复同步、回滚和恢复、owner/non-owner/anon RLS 检查 PASS。只操作一次性测试数据库。
- 生产构建结果与发布构建标识记录在本次交付记录。

**当前未验证：** 360/390/430 手机布局/软键盘、第二设备、安装版 PWA 离线重连与更新。生产 011 的只读检查和手机学习/同步/刷新由用户报告通过。执行环境无 owner 会话和浏览器控制工具，不用构建通过替代真机验收。

下一断点：本轮逐题手机界面复核 → 下载后离线/重连 → 同账号第二设备继续。高级 AI/口语与完整 V3 内容另属后续阶段。
