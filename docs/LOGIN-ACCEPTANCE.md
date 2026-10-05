# 当前阶段：关闭公共注册

用户提交的private_account_readiness已通过：owner_auth_users=1、email_confirmed/owner_uid_bound/profile_created/owner_configured=true，en/B1非primary，ja/N3为primary。回执保存于supabase/dashboard/evidence/private_account_readiness.json。

不要重建账号、不要重跑001–009；当前不进行数据库写入。密码和Google Secret无需发送给开发环境。

## 当前唯一人工操作

Supabase项目ocbydnsqennrumowqxvu → Authentication → Sign In / Providers → User Signups（部分界面为Authentication Settings）→ 关闭Allow new users to sign up → Save。保持Google和Email providers启用。新读取的Auth settings HTTP200、Google enabled=true、Email enabled=true，但disable_signup=false。这说明关闭注册尚未生效；不能根据账号检查推断注册开关已关闭。

保存后告诉助手“公共注册已关闭”。助手可以使用Publishable Key只读验证/auth/v1/settings中的disable_signup=true；不需要任何Secret。

## 后续顺序（尚未验收）

1. 准备应用实际HTTPS地址，保持私人访问；当前没有已发布应用URL。
2. Authentication → URL Configuration：Site URL为实际应用origin，Redirect URLs允许同一origin的根回调。当前本机源码可通过npm run dev运行在http://localhost:3000；在自己的电脑运行后才能使用该本机地址。
3. 用户在浏览器分别使用Google和个人密码登录，核对同一Auth UUID，不向助手发送密码、Token、storage state。
4. 刷新/重启Session、非owner拒绝、保存词汇/复习、双设备67%阅读恢复、离线重连幂等及安装后会话验收。

Build和匿名拒绝已验证；不能把它们代替真正owner登录、RLS读写或同步。AI Tutor、AI Speaking、现代FSRS仍暂缓。
