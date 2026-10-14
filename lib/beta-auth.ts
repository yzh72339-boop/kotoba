import {z} from 'zod';
export const directSignup=process.env.NEXT_PUBLIC_AUTH_MODE==='direct';
export const emailInput=z.string().trim().max(254).email('请输入有效邮箱。').transform(value=>value.toLowerCase());
export const betaPassword=z.string().min(12,'密码至少 12 位。').max(128,'密码最多 128 位。')
 .regex(/[a-z]/,'密码需要小写字母。').regex(/[A-Z]/,'密码需要大写字母。').regex(/[0-9]/,'密码需要数字。').regex(/[^A-Za-z0-9\s]/,'密码需要符号。');
export const betaRegistration=z.object({email:emailInput,password:betaPassword,confirmPassword:z.string()})
 .refine(input=>input.password===input.confirmPassword,{path:['confirmPassword'],message:'两次密码不一致。'});
export const betaStatusSchema=z.object({enabled:z.boolean(),open:z.boolean(),total:z.number().int().min(1).max(10),remaining:z.number().int().min(0).max(10)}).refine(v=>v.remaining<=v.total);
export type BetaStatus=z.infer<typeof betaStatusSchema>;
export function missingBetaCapability(error:unknown){const code=error&&typeof error==='object'&&'code' in error?error.code:null;return code==='PGRST202'||code==='42883'}
export function safeAuthMessage(error:unknown,direct=false){
 const e=error&&typeof error==='object'?error as {code?:string;status?:number;message?:string;name?:string}:{};
 if(e.status===429||e.code==='over_request_rate_limit'||e.code==='over_email_send_rate_limit')return '请求过于频繁，请稍后再试。';
 if(e.code==='email_not_confirmed')return direct?'该账号尚未激活，请联系管理员核对认证设置。':'邮箱尚未验证，请先打开确认邮件中的链接。';
 if(e.code==='captcha_failed'||/captcha/i.test(e.message??''))return direct?'服务器仍启用验证码，请联系管理员核对 Supabase CAPTCHA 设置。':'机器人验证未通过，请重新完成验证。';
 if(e.code==='weak_password')return '密码不符合安全规则，请使用至少 12 位大小写字母、数字和符号。';
 if(e.code==='same_password')return '新密码需要与当前密码不同。';
 if(e.code==='reauthentication_needed')return '请重新登录后再修改密码。';
 if(/Beta capacity reached/i.test(e.message??''))return '内测名额已满，暂不接受新用户注册。';
 if(/Beta registration is closed/i.test(e.message??''))return '当前暂不接受新账号注册。';
 if(e.name==='AuthRetryableFetchError'||e.name==='TypeError')return '认证服务暂时不可用，请检查连接后重试。';
 return direct?'认证未完成，请检查邮箱和密码后重试。':'认证未完成，请检查输入或重新申请邮件链接。';
}
export function betaRegistrationAvailable(status:BetaStatus|null,captchaReady:boolean,captchaRequired=true){return Boolean(status?.enabled&&status.open&&status.remaining>0&&(!captchaRequired||captchaReady))}
