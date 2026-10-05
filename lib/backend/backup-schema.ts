import {z} from 'zod';
import {migrateState,type AppState} from '../store';
const text=z.string().max(32000),id=z.string().min(1).max(300),time=z.number().finite().nonnegative();
const language=z.enum(['en','ja']);
const languageProfile=z.object({level:text,goal:text,interests:z.array(text).max(100),targetLevel:text.optional()});
const position=z.object({progress:z.number().min(0).max(100),offset:z.number().nonnegative().optional(),index:z.number().int().nonnegative().optional(),mediaId:id.optional(),updatedAt:time});
const archiveState=z.object({
 version:z.literal(2),profile:z.object({name:text,language,level:text,goal:text,dailyGoal:z.number().int().min(1).max(240),onboarded:z.boolean(),nativeLanguage:z.string().min(2).max(32).optional(),timezone:z.string().min(1).max(100).optional(),explanationLevel:z.enum(['simple','normal','detailed','immersion']).optional()}),
 activeSession:z.object({language,step:z.number().int().min(0).max(3),startedAt:time,baseline:z.number().int().nonnegative(),completed:z.array(z.enum(['Review','Grammar','Reading','Speaking'])),done:z.boolean()}).nullable(),
 languageProfiles:z.object({en:languageProfile,ja:languageProfile}),
 reviews:z.record(z.object({id,due:time,interval:z.number().int().nonnegative(),ease:z.number().min(1.3),repetitions:z.number().int().nonnegative(),lapses:z.number().int().nonnegative(),firstLearned:time.optional()})),
 reviewHistory:z.array(z.object({id,language,cardId:id,rating:z.enum(['Again','Hard','Good','Easy']),at:time})),
 saved:z.array(id),notes:z.record(text),completed:z.array(text),theme:z.enum(['light','dark']),
 sessions:z.array(z.object({id,day:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),minutes:z.number().nonnegative(),type:text,count:z.number().int().nonnegative(),language:language.optional(),at:time.optional()})),
 conversations:z.array(z.object({id,role:z.enum(['user','assistant']),text,at:time,language})),
 dictionary:z.record(z.object({id,word:text,pronunciation:text,meaning:text,example:text,translation:text,tag:text,en:text.optional(),related:text.optional(),note:text.optional(),language,source:text,firstSeen:time,tags:z.array(text)})),
 sentences:z.array(z.object({id,language,sentence:text,translation:text,source:text,date:time,notes:text,vocabulary:z.array(id),grammar:z.array(id)})),
 mistakes:z.array(z.object({id,language,area:text,pattern:text,original:text,correction:text,source:text,at:time,resolved:z.boolean()})),
 readingPositions:z.record(position),listeningPositions:z.record(position),
 audioFiles:z.record(z.object({language,title:text,storagePath:text,mimeType:text,size:z.number().int().nonnegative(),updatedAt:time})),
 speakingHistory:z.array(z.object({id,language,text,feedback:text,at:time})),
 dailyPlans:z.record(z.object({day:text,language,minutes:z.number().positive(),focus:text,reason:text,generatedBy:z.enum(['rules','ai']),reviewCount:z.number().int().nonnegative(),weak:z.array(text),at:time})),
 settings:z.object({audioRate:z.number().min(.5).max(2),notifications:z.boolean(),dailyReminder:z.boolean(),reviewReminder:z.boolean(),weeklyReport:z.boolean(),autoBackup:z.boolean()}),
 _clock:z.record(time),_deleted:z.record(time)
});
export function parseBackup(contents:string):AppState{
 if(new TextEncoder().encode(contents).length>16777216)throw new Error('备份超过 16 MB，请使用数据库归档恢复。');
 let payload:unknown;try{payload=JSON.parse(contents)}catch{throw new Error('无法读取 JSON 备份文件。')}
 if(!payload||typeof payload!=='object')throw new Error('这不是有效的 Kotoba 备份。');
 const envelope=payload as {format?:string;state?:unknown;records?:{user_progress?:{state:unknown}[]}};
 const candidate=envelope.format==='kotoba-personal'?envelope.state:envelope.format==='kotoba-relational-backup'?envelope.records?.user_progress?.[0]?.state:undefined;
 if(!candidate||typeof candidate!=='object'||![1,2].includes((candidate as {version:number}).version))throw new Error('备份格式或版本不受支持。');
 const parsed=archiveState.safeParse(migrateState(candidate));if(!parsed.success)throw new Error('备份内容不完整，当前学习记录没有修改。');return parsed.data as AppState;
}
