# 托管发布状态

现有Sites项目appgprj_6ac1a9e96d98819186da139d6549225e通过get_site确认：调用者为owner，custom访问策略仅一个owner、无groups/外部访问者，active、latest_version_number=0、current_live_url=null。没有创建新站点或更改分享范围，没有部署操作。

Next.js静态导出out/及源码/构建ZIP已经准备并通过本地检查。没有已推送源码commit，不能捏造commit_sha或将普通ZIP作为Sites部署tar。

当前Sites技能来源：skill://plugin_connector_1p_689987207de08191979cf68eca2941c6/sites/SKILL.md。要求“the helper owns Git preparation, ordered commands, commit/push, and packaging”，需用<plugin-root>/scripts/site-workflow.mjs。当前安装目录和/tmp中未找到该helper，两个skill资源读取尝试也失败；没有绕过其来源和打包要求自行发布。

这属于托管工具辅助资源缺失，不是应用Build失败。仍需取得支持的helper或由用户指定其他托管方式后发布真实地址。不能将预期域名、Git URL或本地localhost称为已上线应用。
