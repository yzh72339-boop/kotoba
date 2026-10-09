> 当前源码已推进到 **2.7.0**，以下 V2.5 指令保留为保护原则与历史交接。先读 KOTOBA-2.7-CHECKPOINT.md / CURRENT-STATUS.md；数据库 001–011 保持原样。本轮完成 887 词汇卡、150 语法、62 阅读及 178 项测试；完整内容与真实设备验收仍有缺口。

# CODEX HANDOFF — 必读执行指令

你正在接手 Kotoba V2.5.0。请把它视为一个已经具有稳定核心和大量 V2.5 UX 改进的项目，而不是空白原型。

## 第一原则：保护现有成果

开始前先阅读 `README.md`、`docs/CURRENT-STATUS.md`、`docs/KOTOBA-V2.5-IMPLEMENTATION-REPORT.md`、`docs/V2.5-AUDIT.md`。

先检查实际源码与 Git 状态，不要只相信历史描述。不要立即重构。

## 强保护区

除非用户明确批准且你已解释必要性，否则禁止：

- 修改或重跑 migrations 001–009
- 创建 migration 010 来完成 UI/UX 工作
- 改 RLS
- 改 Auth / owner 权限模型
- 改 SRS 调度语义
- 替换 Supabase
- 替换 Next.js / React 主架构
- 引入第二套动画框架
- 删除测试来获得 PASS
- 把真实 secrets 写入源码或交接包

若任务确实需要 schema/RLS/Auth/SRS 变化：停止，先报告原因、最小方案、兼容性、回滚方案和风险。

## 接手验证

先安装锁定依赖：

`npm ci`

然后依次：

`npm run typecheck`
`npm run lint`
`npm test`
`npm run build`

记录 Node/npm 版本与所有结果。若失败，先判断环境问题还是代码回归，不要为了消除环境错误擅改业务逻辑。

## V2.5 当前任务

优先完成尚未完成的真实验收：owner 登录、生产 Supabase/RLS、跨设备同步、AI Edge Function、Android/iOS/PWA、离线/慢网、麦克风与响应式矩阵。

只修复验收发现的真实问题。不要重复实现已存在的 Today / Daily Session / Motion / Review / Reading / Speaking / AI UX 工作。

## 产品方向

Kotoba 的长期目标是“个人语言学习操作系统”：

输入 → 理解 → 收集 → 记忆 → 回忆 → 使用 → 反馈 → 自适应 → 下一次学习。

但不要一次性实现长期路线。V2.5 验收完成后才进入 V2.6。

## 完成任何任务后的报告

必须报告：

- 修改了什么以及为什么
- 精确文件列表
- 是否触碰数据库/RLS/Auth/SRS
- TypeScript/Lint/Tests/Build 结果
- 仍需真机验证的项目
- Known Issues

不要只回复 Done。
