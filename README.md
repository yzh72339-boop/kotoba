# Kotoba V2.5.2 — Master Handoff · Vocabulary Complete

这是 Kotoba V2.5.0 的开发交接源码包。当前目标不是重新实现 V2.5，而是在保护现有稳定核心的前提下完成真机/生产验收，并为后续 Knowledge Core 与学习生态演进做好准备。

## 当前状态

- 应用版本：`2.5.0`
- 阶段：**V2.5 Fluid Core 源码候选版**
- V2.4 稳定基线：历史报告记录为 commit `2eaef0a` / tag `v2.4-stable`
- V2.5 开发分支：历史报告记录为 `v2.5-fluid`
- 数据库 migrations：`001–009`
- migration 010：**不存在；不要为 UI/UX 工作创建**
- 数据库结构 / RLS / Auth / SRS：V2.5 报告记录为 **NO CHANGE**
- 当前交接包不包含 `node_modules`，接手后必须先安装锁定依赖再重新验证。
- 词库增强补丁：新增 110 个高质量核心词条，当前日语 214 张词汇卡、英语 252 张词汇卡；详见 `docs/VOCABULARY-ENHANCEMENT.md`。

## 接手后先读

按顺序阅读：

1. `docs/CODEX-HANDOFF.md`
2. `docs/CURRENT-STATUS.md`
3. `docs/KOTOBA-V2.5-IMPLEMENTATION-REPORT.md`
4. `docs/V2.5-AUDIT.md`
5. `docs/VOCABULARY-ENHANCEMENT.md`
6. `docs/ROADMAP-V2.6-V3.1.md`
7. 涉及数据库时再阅读 `docs/MIGRATION-AUDIT.md` 与对应 migration 文档

## 接手第一步

不要立即修改代码。先：

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
```

若 Node 22 对测试中直接导入 `.ts` 报 `ERR_UNKNOWN_FILE_EXTENSION`，先确认项目预期 Node 版本/测试运行方式；本次整理环境 Node 22.16.0 在未安装依赖时无法完成完整复验。不要因此修改 SRS 或业务逻辑。

## 保护范围

未经明确批准，不得修改：

- `supabase/migrations/001–009`
- RLS / Auth / 私人 owner 权限模型
- `lib/srs.ts` 的调度语义
- 现有学习数据语义和同步协议
- 已工作的核心功能

任何需要数据库 schema、RLS、Auth 或 SRS 变化的工作，先停止并说明原因、替代方案和风险。

## 秘密信息

本包不应包含真实 `.env.local`、service-role key、数据库密码、OpenAI key、Google secret 或私钥。`.env.example` 只用于说明变量名。真实秘密必须通过受控环境单独配置。

## 下一阶段

先完成 V2.5 的生产/真机验收和已知问题闭环，再进入 V2.6 Knowledge Core。不要一次性实现 V2.6–V3.1。


## V2.5.2 词库补全

本交接包已将日语 N5–N1、英语 A1–C2 每级补齐到至少 50 个不重复核心词形，并加入统一 Lexicon Metadata 与主动/被动掌握信号。详见 `docs/VOCABULARY-COMPLETION-V2.5.2.md`。
