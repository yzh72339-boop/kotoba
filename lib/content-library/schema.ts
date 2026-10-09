import {z} from 'zod';

const text=z.string().trim().min(1);
const id=text.regex(/^[a-z0-9][a-z0-9-]*$/);
export const contentLevels={ja:['N5','N4','N3','N2','N1'],en:['A1','A2','B1','B2','C1','C2']} as const;
const common={id,language:z.enum(['ja','en']),level:text,difficulty:z.number().int().min(1).max(5),tags:z.array(text).min(1)};
export const exerciseSchema=z.object({id,kind:z.enum(['meaning','fill','transform','sentence','context','error','translation']),prompt:text,options:z.array(text).optional(),acceptedAnswers:z.array(text).min(1),explanation:text}).strict();
export const grammarSchema=z.object({
 ...common,kind:z.literal('grammar'),title:text,pattern:text,meaningZh:text,meaningEn:text,
 explanation:text.min(40),usage:text,nuance:text,structure:z.array(text).min(1),formation:z.array(text).min(1),
 examples:z.array(z.object({target:text,reading:text.optional(),zh:text,en:text.optional()}).strict()).min(4).max(8),
 notes:z.array(text),commonMistakes:z.array(z.object({wrong:text,correct:text,explanation:text}).strict()).min(1),
 comparison:z.array(z.object({grammarId:id,explanation:text}).strict()),prerequisites:z.array(id),relatedGrammar:z.array(id),
 exercises:z.array(exerciseSchema).min(3)
}).strict();
export const readingSchema=z.object({
 ...common,kind:z.literal('reading'),title:text,topic:text,genre:z.enum(['story','essay','opinion','news-style','academic-style','practical']),
 estimatedMinutes:z.number().int().positive(),paragraphs:z.array(text).min(1),translation:z.array(text).min(1),
 vocabulary:z.array(id).min(3),grammar:z.array(z.object({id,surface:text}).strict()).min(1),
 questions:z.array(z.object({id,type:z.enum(['main-idea','detail','inference','vocabulary','grammar','author-intent']),prompt:text,options:z.array(text).min(2),answer:z.number().int().nonnegative(),explanation:text}).strict()).min(3).max(8),
 notes:z.array(text)
}).strict();
export type GrammarPoint=z.infer<typeof grammarSchema>;
export type ReadingDocument=z.infer<typeof readingSchema>;
export type LearningDocument=GrammarPoint|ReadingDocument;
export type ContentEntry={id:string;kind:LearningDocument['kind'];language:'ja'|'en';level:string;title:string;summary:string;topic:string;tags:string[];keywords:string[];length:number;minutes:number;grammar:string[];vocabulary:string[];difficulty:number;prerequisites:string[]};
export function parseDocument(value:unknown):LearningDocument{
 const kind=(value as {kind?:string}|null)?.kind;
 const item=kind==='grammar'?grammarSchema.parse(value):readingSchema.parse(value);
 if(!(contentLevels[item.language] as readonly string[]).includes(item.level))throw new Error(`${item.id}: invalid language/level`);
 if(item.kind==='grammar'){
  if(!item.id.startsWith('grammar-'))throw new Error(`${item.id}: grammar ID must preserve review classification`);
  if(item.language==='ja'&&item.examples.some(e=>!e.reading))throw new Error(`${item.id}: Japanese example reading is missing`);
  for(const exercise of item.exercises)if(exercise.options&&!exercise.acceptedAnswers.every(a=>exercise.options!.includes(a)))throw new Error(`${exercise.id}: answer is not an option`);
 }else{
  if(!item.id.startsWith('article-'))throw new Error(`${item.id}: reading ID must preserve progress classification`);
  if(item.paragraphs.length!==item.translation.length)throw new Error(`${item.id}: paragraph translations are misaligned`);
  if(item.questions.some(q=>q.answer>=q.options.length))throw new Error(`${item.id}: question answer out of range`);
 }
 return item;
}
export function documentLength(item:ReadingDocument){const body=item.paragraphs.join(' ');return item.language==='ja'?body.replace(/\s/g,'').length:(body.match(/\b[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*\b/gu)??[]).length;}
export function contentEntry(item:LearningDocument,keywords:string[]=[]):ContentEntry{return {id:item.id,kind:item.kind,language:item.language,level:item.level,title:item.title,summary:item.kind==='grammar'?`${item.pattern} · ${item.meaningZh} · ${item.meaningEn}`:item.topic,topic:item.kind==='reading'?item.topic:'grammar',tags:item.tags,keywords:[...new Set(keywords)],length:item.kind==='reading'?documentLength(item):0,minutes:item.kind==='reading'?item.estimatedMinutes:6,grammar:item.kind==='reading'?item.grammar.map(g=>g.id):[item.id],vocabulary:item.kind==='reading'?item.vocabulary:[],difficulty:item.difficulty,prerequisites:item.kind==='grammar'?item.prerequisites:[]};}
export function matchesContent(entry:ContentEntry,query:string){return [entry.title,entry.summary,entry.topic,entry.level,...entry.tags,...(entry.keywords??[])].join(' ').normalize('NFKC').toLowerCase().includes(query.trim().normalize('NFKC').toLowerCase());}
