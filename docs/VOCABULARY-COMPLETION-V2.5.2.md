# Vocabulary Completion — V2.5.2

本次是对 V2.5.1 词库增强的“补全”迭代，目标不是伪装成大型商业词典，而是把现有课程核心词库做得更均衡、更可扩展、更接近未来 Knowledge Core。

## 完成内容

- 日语 N5–N1、英语 A1–C2 的每个等级均达到 **至少 50 个不重复词形**。
- 当前课程卡片总数：**567**（日语 261 / 英语 306）；按词形 canonicalize 后约 **559** 个唯一核心词条。
- 新增 101 个经过人工整理的核心词条，包含读音/IPA、中文释义、上下文例句、译文、词性和常用搭配。
- 新增 `lib/lexicon.ts` 作为统一词汇元数据层，为旧词条自动补全 level / POS / senses / collocations / frequency / register / source。
- `Word` 增加向后兼容的可选元数据字段；没有数据库 migration。
- Vocabulary 页面使用 canonical view 避免历史重复词在词典列表中重复显示，同时保留原 card ID，避免破坏历史 SRS 数据。
- Vocabulary 详情新增被动掌握度、主动使用证据、Reading / Speaking 使用信号等派生信息。这些指标从现有 AppState 计算，不新增数据库字段。
- 搜索可利用 level / POS / topic 等标准化元数据。

## 重要兼容性原则

- 未删除任何旧 card ID。
- 未修改 SRS 算法。
- 未修改 migrations 001–009。
- 未新增 migration 010。
- 未修改 RLS / Auth / sync protocol。
- 历史重复词仅在 Vocabulary 展示层 canonicalize，Review/历史数据仍可保持兼容。

## 词库定位

V2.5.2 是“均衡的课程核心词库”，不是完整通用词典。JLPT 本身不存在官方固定词汇表；CEFR 词级也不是官方逐词等级表，因此 level 是教学用近似分层。未来若进入 V2.6 Knowledge Core，建议把多义项、词源、语域、主题、同反义关系、语料频率、来源证据独立建模，而不是继续把所有信息塞进 `Word`。
