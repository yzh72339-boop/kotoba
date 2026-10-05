# Kotoba 当前真实状态（交接统一口径）

更新时间：2026-10-06

## 1. 版本定位

当前源码声明版本为 `2.5.0`。`docs/KOTOBA-V2.5-IMPLEMENTATION-REPORT.md` 将其定义为 **V2.5 Fluid Core 源码候选版**，不是已经完成生产验收的正式发布版。

## 2. 已完成（以源码与 V2.5 实施报告为准）

V2.5 已包含：Daily Session 暂停/恢复、Today 信息层级优化、Sync 弱化、Safe Area、按压反馈、导航连续动效、Review 节奏优化、Reading 保存反馈、Speaking 状态、AI 失败恢复、Quick Capture、Reduced Motion、Haptics、Loading/Error 与部分性能优化。

## 2.1 词库增强补丁

交接包已追加词库增强：新增 `lib/vocabulary-core-expansion.ts`，共增加 110 个带稳定语义 ID、例句、翻译和常用搭配的核心词条。当前课程词汇卡总量：日语 214、英语 252。Vocabulary 搜索扩展到例句、翻译、标签与搭配，并新增 `Mastered` 展示筛选。该补丁不修改数据库、RLS、Auth、同步协议或 SRS 算法。详见 `docs/VOCABULARY-ENHANCEMENT.md`。

## 3. 数据库保护状态

`supabase/migrations/` 当前为 001–009，没有 010。V2.5 实施报告记录：数据库结构、001–009、RLS、Auth、私人账户门禁、SRS 调度语义均未修改。

**规则：不要重跑 001–009；不要为了 UX 创建 010。**

## 4. 自动化验证口径

V2.5 实施报告记录其原开发环境最终结果为：TypeScript PASS、ESLint 零警告、69/69 Node tests PASS、Production Build PASS。

本次交接整理环境没有 `node_modules`。Node 22.16.0 直接执行 `npm test` 时首先遇到 `.ts` import 支持问题；使用 `NODE_OPTIONS=--experimental-strip-types` 后可继续执行多组测试，但随后因依赖尚未安装而在 `@supabase/supabase-js` 处停止。因此本次整理**没有重新声称完整 69/69 与 Build 已复验**。

接手者应执行 `npm ci` 后重新跑完整四项检查，并以新结果为准。

## 5. 仍需完成

- 私人 owner 账号真实登录验收
- 生产 Supabase / RLS 实际读写
- 跨设备同步
- AI Edge Function
- Android Chrome 真机
- Mobile Safari 真机
- PWA standalone
- Offline / slow network
- 麦克风权限与不支持时降级
- 360/375/390/412/430 px 响应式矩阵

## 6. 文档冲突处理

旧 README 与部分历史文档包含不同阶段的状态描述。为避免误判，交接状态优先级为：

1. `docs/CURRENT-STATUS.md`
2. `docs/CODEX-HANDOFF.md`
3. `docs/KOTOBA-V2.5-IMPLEMENTATION-REPORT.md`
4. `docs/V2.5-AUDIT.md`
5. 其余 migration / deployment 历史文档
6. `docs/LEGACY-README-BEFORE-HANDOFF-CLEANUP.md` 仅作历史参考

## 7. 当前正确下一步

不是重做 V2.5。先安装依赖、复验、完成真机/生产验收并修复真实发现的问题。V2.5 稳定后再设计 V2.6 Knowledge Core。


## V2.5.2 Vocabulary Completion

词库层已补齐到所有学习等级至少 50 个不重复核心词形，并新增兼容式 lexicon metadata 层。未修改数据库、RLS、Auth、SRS 或 migrations 001–009。
