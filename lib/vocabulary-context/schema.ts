import {z} from 'zod';
const text=z.string().trim().min(1);
export const contextualWordSchema=z.object({
 id:text.regex(/^context-(ja|en)-[a-z0-9-]+$/),word:text,pronunciation:text,
 meaning:text,example:text,translation:text,tag:text,related:text,pos:text,
 senses:z.array(text).min(1),collocations:z.array(text).min(1),topics:z.array(text).min(1),
 frequency:z.enum(['high','medium','low']),register:z.enum(['neutral','informal','formal','academic']),sourceRef:text,
}).strict();
