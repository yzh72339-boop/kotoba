import {supabase} from '../supabase';
import {vocabularyInput,sentenceInput,reviewInput,readingInput,privateAccountSchema} from './schemas';
import type {Language} from '../content';
function client(){if(!supabase)throw new Error('Backend is not configured');return supabase}
async function userId(){const {data,error}=await client().auth.getUser();if(error||!data.user)throw new Error('Private owner sign-in required');return data.user.id;}
export const backend={
 async account(){const {data,error}=await client().rpc('get_private_account');if(error)throw error;return privateAccountSchema.parse(data)},
 async vocabulary(language:Language){const {data,error}=await client().from('vocabulary').select('*,vocabulary_examples(*),vocabulary_collocations(*)').eq('language_code',language).order('last_seen_at',{ascending:false});if(error)throw error;return data;},
 async captureWord(input:unknown){const parsed=vocabularyInput.parse(input),user_id=await userId();const {data,error}=await client().from('vocabulary').upsert({...parsed,user_id},{onConflict:'user_id,language_code,term'}).select().single();if(error)throw error;return data;},
 async captureSentence(input:unknown){const parsed=sentenceInput.parse(input),user_id=await userId();const {data,error}=await client().from('saved_sentences').upsert({...parsed,user_id},{onConflict:'user_id,language_code,sentence'}).select().single();if(error)throw error;return data;},
 async dueReviews(limit=50){const {data,error}=await client().from('review_items').select('*').lte('due_at',new Date().toISOString()).neq('state','suspended').order('due_at').limit(Math.min(200,Math.max(1,limit)));if(error)throw error;return data;},
 async review(input:unknown){const p=reviewInput.parse(input);const {data,error}=await client().rpc('record_review',{p_review_item:p.reviewItemId,p_client_event:p.eventId,p_rating:p.rating,p_reviewed_at:p.reviewedAt,p_elapsed_ms:p.elapsedMs});if(error)throw error;return data;},
 async saveReading(input:unknown){const p=readingInput.parse(input),user_id=await userId();const {data,error}=await client().from('reading_progress').upsert({user_id,article_id:p.articleId,progress:p.progress,scroll_position:p.scrollPosition,completed:p.completed,last_read_at:new Date().toISOString(),completed_at:p.completed?new Date().toISOString():null},{onConflict:'user_id,article_id'}).select().single();if(error)throw error;return data;},
 async progress(language:Language){const {data,error}=await client().rpc('personal_progress',{p_language:language});if(error)throw error;return data;},
 async signedAudio(path:string){const {data,error}=await client().storage.from('personal-audio').createSignedUrl(path,600);if(error)throw error;return data.signedUrl;}
};
