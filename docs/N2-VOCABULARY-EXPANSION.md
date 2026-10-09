# N2 实用词库扩充

日语 N2 从 50 个词增加到 150 个词，新增 100 个不同词形。

主题：工作与求职、生活手续、健康、防灾、社会阅读、常用动词与表达。

新词均包含读音、中文释义、原创例句、中文翻译、词性、至少两个搭配和主题标签。分级为教学性组织，不是官方 JLPT 固定词表。

词条追加于 `lib/vocabulary-level-completion.ts`，使用稳定 ID，来源为 `N2 practical expansion`。原有词条、ID、顺序和学习记录保留；其他等级未修改。

沿用现有课程、Vocabulary 搜索、Flashcards、Review 和离线内容包，不执行数据库 migration，不改变 Auth、RLS、SRS 或同步协议。

发布后联网点击 Update。Learn 选择 Japanese · N2 后可看到 150 个词。若没有更新提示，可使用 `/auth/update.html`。已经复习过的词按原计划到期，新词进入现有复习队列。
