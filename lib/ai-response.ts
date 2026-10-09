import {z} from 'zod';
const schema=z.object({answer:z.string().trim().min(1).max(16000),plan:z.object({focus:z.string().trim().min(1).max(100),reason:z.string().trim().min(1).max(500),weak:z.array(z.string().max(100)).max(3)}).optional(),mistakes:z.array(z.object({area:z.enum(['vocabulary','grammar','reading','listening','speaking','ai_chat']),pattern:z.string().max(200),original:z.string().max(2000),correction:z.string().max(2000)})).max(10).optional()});
export type AIResult=z.infer<typeof schema>;
export function parseAIResult(value:unknown):AIResult{const result=schema.safeParse(value);if(!result.success)throw new Error('AI 返回内容无法安全读取，请重试。');return result.data}
