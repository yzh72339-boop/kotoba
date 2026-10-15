import type {Word,Language} from './content.ts';
import {readerSegments} from './adapters/reader-language';
import {readingSources} from './content-library/reading-collection';
import type {AppState} from './store.ts';

export type LexiconMeta={level:string;partOfSpeech:string;senses:string[];collocations:string[];synonyms:string[];antonyms:string[];topics:string[];frequency:'high'|'medium'|'low';register:'neutral'|'informal'|'formal'|'academic';source:string};
export type LearningSignals={reviewCount:number;repetitions:number;lapses:number;interval:number;nextDue:number|null;stage:'new'|'learning'|'relearning'|'review'|'reviewed3';activeEvidence:number;sentenceEvidence:number;lastReviewed:number|null;readingEvidence:number;speakingEvidence:number;manuallyKnown:boolean};

const levelPattern=/\b(N[1-5]|A[12]|B[12]|C[12])\b/;
export function wordLevel(word:Word){return word.tag.match(levelPattern)?.[1]??'Personal';}
function inferredFrequency(level:string):LexiconMeta['frequency']{if(['N5','N4','A1','A2'].includes(level))return 'high';if(['N3','N2','B1','B2'].includes(level))return 'medium';return 'low';}
function inferredRegister(level:string):LexiconMeta['register']{return ['N1','C1','C2'].includes(level)?'academic':'neutral';}
function sourceOf(word:Word){if(word.sourceRef)return word.sourceRef;if(word.id.startsWith('complete-'))return 'V2.5.2 level completion';if(word.id.startsWith('lex-'))return 'V2.5.1 core expansion';if(word.id.startsWith('supp-'))return 'V2.5 supplement';if(word.id.startsWith('course-'))return 'Course seed';if(word.id.startsWith('ja-')||word.id.startsWith('en-'))return 'Starter content';return 'Library content';}
export function lexiconMeta(word:Word):LexiconMeta{const level=wordLevel(word);const taggedPos=word.tag.split('·')[1]?.trim();return {level,partOfSpeech:word.pos??taggedPos??'word',senses:word.senses?.length?word.senses:word.meaning.split(/[·；;]/).map(x=>x.trim()).filter(Boolean),collocations:word.collocations?.length?word.collocations:(word.related??'').split('/').map(x=>x.trim()).filter(Boolean),synonyms:word.synonyms??[],antonyms:word.antonyms??[],topics:word.topics?.length?word.topics:['core'],frequency:word.frequency??inferredFrequency(level),register:word.register??inferredRegister(level),source:sourceOf(word)};}
export function learningSignals(word:Word,state:AppState,language:Language=state.profile.language):LearningSignals{
 const review=state.reviews[word.id],history=state.reviewHistory.filter(item=>item.cardId===word.id&&item.language===language);
 const occurs=(text:string)=>readerSegments(text,language,[word],[]).some(part=>part.wordId===word.id);
 const speakingEvidence=state.speakingHistory.filter(item=>item.language===language&&occurs(item.text)).length;
 const sentenceEvidence=state.sentences.filter(item=>item.language===language&&(item.vocabulary.includes(word.id)||item.vocabulary.some(v=>v.toLowerCase()===word.word.toLowerCase())||occurs(item.sentence))).length;
 const sources=readingSources(state,word.id).filter(source=>source.language===language),saved=state.dictionary[word.id];
 const readingEvidence=sources.length||(saved?.language===language&&/reading/i.test(saved.source)?1:0);
 const repetitions=review?.repetitions??0,lapses=review?.lapses??0;
 const stage:LearningSignals['stage']=repetitions>=3?'reviewed3':repetitions>0?'review':review&&lapses>0?'relearning':review||saved||state.saved.includes(word.id)?'learning':'new';
 const times=history.map(item=>item.at).filter(Number.isFinite);
 return {reviewCount:history.length,repetitions,lapses,interval:review?.interval??0,nextDue:review?.due??null,stage,activeEvidence:speakingEvidence+sentenceEvidence,sentenceEvidence,lastReviewed:times.length?Math.max(...times):null,readingEvidence,speakingEvidence,manuallyKnown:Boolean(state.notes['library-known-'+word.id])};
}
export function canonicalVocabulary(words:Word[],preferredIds=new Set<string>()){const best=new Map<string,Word>();const score=(w:Word)=>{const meta=lexiconMeta(w);return (preferredIds.has(w.id)?1000:0)+(w.example?4:0)+(w.related?3:0)+(meta.partOfSpeech!=='word'?2:0)+(w.sourceRef?1:0);};for(const word of words){const key=word.word.trim().normalize('NFC').toLocaleLowerCase();const current=best.get(key);if(!current||score(word)>score(current))best.set(key,word);}return [...best.values()];}
