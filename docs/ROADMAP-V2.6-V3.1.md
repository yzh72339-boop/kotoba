# 当前执行断点：2.7 手机学习与词汇闭环

已完成代码与本地检查：银灰蓝全站体系、连续课程转场、手机词典面板、原 ID 兼容的 220 词增量、150 语法/62 阅读、前置语法关联阅读、刷新/离线恢复与模拟重连。

下一步是 owner 真机/第二设备/PWA 验收，以及下一批词汇和未关联语法的阅读。保留 1260 语法/590 阅读长期目标；当前尚缺 1638 个文档。AI Tutor、口语评分与自适应计划须真实服务验证后进入，不作为已上线能力。以下是原长期路线，不能替代当前发布证据。

---

# Kotoba 成熟学习生态路线

## 产品北极星

Kotoba 不应成为功能堆叠的背单词 App，而应逐步成为“个人语言学习操作系统”。所有模块最终围绕一个闭环协作：

输入 → 理解 → 收集 → 记忆 → 主动回忆 → 实际使用 → AI/规则反馈 → 掌握度更新 → 下一次自适应学习。

## V2.6 — Knowledge Core

目标：建立统一知识对象与掌握模型，为生态打基础。

候选对象：Word、Phrase、Sentence、Grammar、Expression、Topic、Source。

候选掌握维度：Seen、Understood、Recognized、Recalled、Used、Mastered。

要求：先设计数据模型、迁移策略、兼容旧数据和回滚方案；不得直接写 migration。

## V2.7 — Contextual Learning

目标：打通 Reading → Capture → Vocabulary/SRS → Speaking。

保存知识时保留来源、原句、主题与上下文；复习和输出练习能重新利用原始语境。

## V2.8 — AI Tutor

目标：AI 成为学习系统的智能层，而不是独立聊天页。

结构化数据库保存学习事实；LLM 负责解释、生成、纠错和推理。不要依赖模型“记住”长期学习状态。

## V2.9 — Adaptive Learning Engine

目标：Today 根据遗忘风险、薄弱点、近期输入、可用时间与学习目标生成每日计划。

允许 10/20/30 分钟等不同 session budget，并重新规划内容而不是简单裁剪。

## V3.0 — Content / Listening / Speaking Ecosystem

Reading：按 CEFR、主题、长度、词汇密度、语法和兴趣组织。

Listening：Audio → Transcript → Shadowing → Vocabulary → Comprehension。

Speaking：Free Talk、Role Play、Shadowing、Pronunciation、Daily Conversation、Topic Practice。

所有模块共享 Knowledge Core。

## V3.1 — Insights + Personal Learning Graph

目标：回答“我是否真的在进步”。

关注 Active Vocabulary、长期记忆、阅读/听力理解、口语自然度、反复错误与弱项，而不是只依赖 streak。

Personal Learning Graph 应能区分：一个词可能 Reading Strong、Recall Medium、Speaking Weak，并据此决定下一次训练方式。

## 实施纪律

每一版本都遵循：设计 → 最小实现 → 自动测试 → 部署 → 真机使用 3–7 天 → 收集摩擦点 → 再进入下一版。

不要同时开发多个大版本。复杂性留在系统内部，用户体验保持简单。
