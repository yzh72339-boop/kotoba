# 当前版本 2.9.0-preview.1；运行方法与断点见 KOTOBA-2.9-IMPLEMENTATION.md。已有依赖且锁定输入未变时不重复安装。

# 新 Codex 接手检查表

- [ ] 阅读 README / CURRENT-STATUS / CODEX-HANDOFF
- [ ] 确认工作分支与回滚点
- [ ] 确认没有真实 secrets 被提交
- [ ] `npm ci`
- [ ] 记录 Node / npm 版本
- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] 确认 migrations 001–011 与已部署历史保持原样；不得因 UI/词库更新重跑
- [ ] 确认历史 RLS/Auth/SRS 保留；新增 012 的 owner policy / target validator / projection 经独立验证，不声称生产已部署
- [ ] 完成 owner 登录与生产后端验收
- [ ] 完成 Android / iOS / PWA 真机验收
- [ ] 完成 offline / slow network / sync 验收
- [ ] 完成响应式宽度矩阵
- [ ] 记录 Known Issues
- [ ] 继续 012 生产验收、owner/真机验收与下一批内容，保留全课程长期目标
