> 最新账号状态：私人账号已经创建并通过完整只读检查（邮箱确认、UID绑定、Profile和en/B1、ja/N3）。不要再次创建账号。最新Auth API仍显示disable_signup=false；当前唯一人工步骤为关闭公共注册。见LOGIN-ACCEPTANCE.md。

# 首次运行：当前只创建私人账号

001–009已在真实Supabase逐份部署并通过只读检查，不重跑migration。Google Provider已启用。2026-10-05网络访问开启后，依赖安装、TypeScript、零警告Lint、57项测试及Next.js 15.5.27生产Build全部通过。完整检查见FIRST-RELEASE-CHECKS.json。

## 真实连接结果

使用现有Publishable Key：Auth settings HTTP200；Google enabled=true、Email enabled=true、disable_signup=false。Data API vocabulary端点返回HTTP401 / PostgreSQL42501，匿名表访问被拒绝，符合最小权限要求。

原/rest/v1/文档根返回“Secret API key required”，不能用于Publishable Key连接检查；检查脚本已改为具体私人表端点，没有要求或使用Secret Key。连通和匿名拒绝已验证；真正owner读写、其他真实用户拒绝、OAuth、跨设备/PWA会话还未验收。

## 当前唯一控制台步骤

1. Supabase项目your-project → Authentication → Sign In / Providers → User Signups，关闭Allow new users to sign up并保存。界面可能将此设置放在Authentication Settings。保持Google和Email Provider启用。Dashboard Admin创建账号不依赖公共注册开关。
2. Authentication → Users → Add user → Create user。
3. Email填owner@example.com。设置自己的私人密码，只在Dashboard填写，不发送到聊天；启用Auto Confirm User并创建。若此邮箱已经存在，不要重复创建或删除账号，保留原UUID。
4. SQL Editor → New query → postgres，执行supabase/dashboard/account_readiness.sql。这是只读账号检查，不是第10份migration。
5. 返回private_account_readiness：owner_auth_users应为1，所有布尔值true，languages包含en/B1、ja/N3，只有ja.primary为true。提交检查结果即可，不提供密码或Token。

当前数据库已经配置正确owner邮箱，无需重复运行configure_private_owner，不需要向开发环境提供service_role、Google Client Secret或数据库密码。

## 本机运行（账号检查通过后）

源码包不含.env.local。安装Node.js24，在项目根创建.env.local，设置NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co、NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY（Dashboard复制的真实Publishable Key）、ALLOWED_USER_EMAIL=owner@example.com、SITE_ORIGIN=http://localhost:3000。不要将任何Secret加入NEXT_PUBLIC_*。

```sh
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run dev
```

访问http://localhost:3000。Auth → URL Configuration的Site URL及Redirect URLs必须允许http://localhost:3000及根回调。正式HTTPS部署后使用真实应用域名配置，不能把Supabase项目URL当成应用URL。Google Client Secret已经在Supabase配置，无需重配或发送。

## 后续核心验收

账号创建后再进行Google/密码同UUID登录、非owner拒绝、Session刷新/重启、保存词汇和复习、双设备67%阅读恢复、离线重连幂等、PWA安装和退出保持。实际Chrome/Android/iOS/iPad安装尚未验收，不能把静态Build或自动化浏览器检查称为完整安装验收。

未登录页已通过八个指定视口检查，Service Worker文件通过测试工具直接注册后的缓存/离线检查；应用的自动Service Worker注册在授权后进行，仍需真实账号验证。源码和构建产物都无认证绕过。AI Tutor、AI Speaking、现代FSRS暂缓。
