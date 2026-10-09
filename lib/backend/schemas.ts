import {z} from 'zod';
export const languageSchema=z.enum(['en','ja']);
export const vocabularyInput=z.object({language_code:languageSchema,term:z.string().trim().min(1).max(300),reading:z.string().max(500).optional(),pronunciation:z.string().max(500).optional(),meaning_zh:z.string().max(5000).optional(),notes:z.string().max(16000).optional(),source_type:z.enum(['reading','listening','speaking','ai','manual']).default('manual'),status:z.enum(['new','learning','familiar','strong','mastered']).default('learning')});
export const sentenceInput=z.object({language_code:languageSchema,sentence:z.string().trim().min(1).max(10000),translation_zh:z.string().max(10000).optional(),notes:z.string().max(16000).optional(),source_type:z.enum(['reading','listening','speaking','ai','manual']).default('manual'),source_id:z.string().uuid().nullable().optional()});
export const reviewInput=z.object({reviewItemId:z.string().uuid(),eventId:z.string().uuid(),rating:z.enum(['again','hard','good','easy']),reviewedAt:z.string().datetime(),elapsedMs:z.number().int().min(0).max(86400000).default(0)});
export const readingInput=z.object({articleId:z.string().uuid(),progress:z.number().min(0).max(100),scrollPosition:z.number().min(0),completed:z.boolean()});
export const privateAccountSchema=z.object({
 profile:z.object({id:z.string().uuid(),display_name:z.string().max(100).nullable(),native_language:z.string().min(2).max(32),timezone:z.string().min(1).max(100),daily_goal_minutes:z.number().int().min(1).max(240),preferred_explanation_level:z.enum(['simple','normal','detailed','immersion']),theme:z.enum(['light','dark','system']),updated_at:z.string().datetime({offset:true})}),
 languages:z.array(z.object({user_id:z.string().uuid(),language_code:languageSchema,current_level:z.string().nullable(),target_level:z.string().nullable(),primary_language:z.boolean(),learning_goal:z.string().nullable(),interests:z.array(z.string()),updated_at:z.string().datetime({offset:true})})).length(2),
 progress:z.object({revision:z.number().int().nonnegative(),state:z.record(z.unknown())}).nullable()
}).superRefine((account,context)=>{
 if(new Set(account.languages.map(language=>language.language_code)).size!==2||account.languages.some(language=>language.user_id!==account.profile.id)||account.languages.filter(language=>language.primary_language).length>1)context.addIssue({code:z.ZodIssueCode.custom,message:'Private account language ownership is invalid'});
});
