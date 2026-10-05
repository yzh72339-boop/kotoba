# Kotoba 词库增强说明

更新时间：2026-10-06

## 本次增强

本次只增强静态学习词库和词库检索体验，不修改数据库 schema、RLS、Auth、同步协议或 SRS 调度语义。

新增 `lib/vocabulary-core-expansion.ts`，采用**语义稳定 ID**（例如 `lex-ja-n5-jikan`），避免修改现有卡片 ID。每个日语 JLPT 层级和英语 CEFR 层级新增 10 个高实用度核心词条，共新增 110 个词条。每个新词条包含：

- 单词 / 表记
- 读音 / IPA
- 中文释义
- 原创上下文例句
- 中文例句翻译
- 层级与词性标签
- 常用搭配 / collocations

## 当前课程词汇数量

### 日语

| 层级 | 词条数 |
|---|---:|
| N5 | 38 |
| N4 | 39 |
| N3 | 61 |
| N2 | 38 |
| N1 | 38 |
| **合计** | **214** |

### 英语

| 层级 | 词条数 |
|---|---:|
| A1 | 39 |
| A2 | 38 |
| B1 | 53 |
| B2 | 43 |
| C1 | 41 |
| C2 | 38 |
| **合计** | **252** |

当前两种语言共暴露 **466 张词汇卡片**。

## Vocabulary 页面改进

搜索现在覆盖：

- word
- pronunciation
- meaning
- example
- translation
- tag
- related / collocations

筛选新增 `Mastered`，定义为当前 SRS 状态 `repetitions >= 3`。这只是展示筛选，不修改 SRS 算法。

## 兼容性原则

1. 旧 `course-*`、`supp-*` 和已有内容 ID 不修改。
2. 新词全部追加到原课程词库之后，避免改变原有词条的前部顺序。
3. 不删除历史重复词条，因为部分重复词条已经拥有不同持久化 ID；直接删除会产生旧 Review 状态孤儿。
4. 后续如需去重，应设计 `legacy ID -> canonical ID` 映射，再进行兼容迁移，而不是直接改 ID。

## 已知限制

- JLPT 并不存在官方固定词汇表；当前 N5–N1 分级属于教学性归类。
- CEFR 同样不是逐词官方分级表；A1–C2 标签用于课程难度组织。
- 当前词库已比原版本完整，但仍属于“课程核心词库”，不是大型通用词典。成熟生态后续应进入 V2.6 Knowledge Core，支持词义、词性、搭配、来源、语境、掌握维度等结构化数据。
- 历史内容中仍存在少量同词不同 ID 的重复项，暂时保留以保护旧学习记录。

## 本次验证

已在无 `node_modules` 的整理环境使用 Node 22 实验性 TypeScript strip 模式执行：

```bash
node --experimental-strip-types --test tests/course-library.test.mjs
```

结果：4/4 tests PASS。

新增测试覆盖：

- 每个层级新增 10 个词条
- 新 ID 格式稳定
- 新词条字段完整
- 新增词库内部不重复
- 不与对应层级原有词条重复
- 每个层级最终至少 38 个词汇卡片

完整 TypeScript / ESLint / 全量 tests / Production Build 仍应在 `npm ci` 后由接手环境重新执行。
