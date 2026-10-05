type SessionReader<T>={
 initialize:()=>Promise<{error:unknown}>;
 getSession:()=>Promise<{data:{session:T|null};error:unknown}>;
};

// getSession() waits for initialization but does not return its callback error.
// Keep a valid password session usable after an earlier failed OAuth callback.
export async function readInitializedSession<T>(auth:SessionReader<T>){
 const initialized=await auth.initialize();
 const result=await auth.getSession();
 return {session:result.data.session,error:result.error??(result.data.session?null:initialized.error)};
}

// Render only fixed messages. Provider descriptions may contain private URLs.
export function authCallbackMessage(error:unknown){
 const e=error&&typeof error==='object'?error as {name?:string;code?:string;message?:string;details?:{code?:string}}:{};
 const description=String(e.message??'').toLowerCase(),code=e.code??e.details?.code??'';
 if(/unable to exchange external code|oauth.*exchange|invalid_client|client secret/.test(description))return 'Google 授权已返回，但 Supabase 无法交换登录凭据（GOOGLE_EXCHANGE_FAILED）。请核对 Google Provider 的 Client ID 与同一客户端的 Client Secret。';
 if(code==='access_denied'||/access.denied/.test(description))return 'Google 授权未完成（GOOGLE_ACCESS_DENIED）。请重新选择允许的私人账号登录。';
 if(code==='flow_state_expired'||code==='flow_state_not_found'||/expired|invalid.*code/.test(description))return '登录回调已过期或已使用（OAUTH_CALLBACK_EXPIRED）。请从此页重新发起 Google 登录。';
 if(e.name==='AuthPKCECodeVerifierMissingError'||/code.verifier|pkce/.test(description))return '未找到这次登录的本地验证凭据（OAUTH_VERIFIER_MISSING）。请在同一浏览器重新发起登录，不要清除网站存储。';
 if(e.name==='SecurityError'||e.name==='QuotaExceededError')return '浏览器无法保存登录状态（AUTH_STORAGE_UNAVAILABLE）。请允许此网站使用本地存储后重试。';
 return '登录回调未能建立会话（OAUTH_CALLBACK_FAILED）。请重新发起登录；若仍失败，请提供这条提示。';
}
