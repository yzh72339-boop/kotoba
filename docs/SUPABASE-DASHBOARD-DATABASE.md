> 最新账号状态：私人账号已经创建并通过完整只读检查（邮箱确认、UID绑定、Profile和en/B1、ja/N3）。不要再次创建账号。最新Auth API仍显示disable_signup=false；当前唯一人工步骤为关闭公共注册。见LOGIN-ACCEPTANCE.md。

> 最新状态（2026-10-05）：001–009真实只读检查通过；依赖、TypeScript、零警告Lint、57项测试及生产Build通过。Supabase Auth/Data API连通和匿名词汇拒绝已验证；owner账号仍未创建，公共注册需关闭，实际登录/同步/安装待验收。当前操作见[FIRST-RUN.md](FIRST-RUN.md)。旧段落中的网络/Build阻塞属于历史记录，不代表最新状态。

# 数据库迁移已完成：下一阶段为首次运行

真实项目 ocbydnsqennrumowqxvu 的001–009已由用户逐份执行并提交完整只读验证，全部通过。43张表、42个业务表限制策略、2个最终Storage限制策略、3个private buckets。全部回执见supabase/dashboard/evidence。

不要重跑部署SQL，不执行旧的整批入口、不执行远程reset。当前未新增migration。

私人Auth账号尚未创建（owner_auth_users=0 / not_created）。下一步见[FIRST-RUN.md](FIRST-RUN.md)，先创建唯一账号并执行只读账号检查。Google Provider已启用，无需重配Google Client Secret。

Build已尝试，但依赖下载因执行环境网络EPERM阻塞；公开环境检查和57项本地Node测试通过，tsc/eslint/next未安装。准确状态见FIRST-RELEASE-CHECKS.json。

目录中的RLS/policy/grant检查已通过，不代表真实用户RLS行为、OAuth、Session或跨设备/PWA已通过。账号和Build完成后再实际验收。pgTAP测试只用于隔离测试库，不在生产库插入测试owner。
