import {writeFile} from 'node:fs/promises';
import {allCourseWords,levels} from '../lib/course-library.ts';
import {contextualWords} from '../lib/vocabulary-context/index.ts';
import {lexiconMeta} from '../lib/lexicon.ts';
import {loadDocuments} from './content-files.mjs';
import {wordOccursInText} from '../lib/vocabulary-occurrence.ts';

const errors=[],rows=[],documents=await loadDocuments();let count=0,newCount=0,legacyDuplicates=0;
for(const language of ['ja','en']){
 const words=allCourseWords(language),ids=new Set(),byTerm=new Map();count+=words.length;
 for(const word of words){
  if(ids.has(word.id))errors.push(`Duplicate card ID: ${word.id}`);ids.add(word.id);
  const term=word.word.trim().normalize('NFKC').toLocaleLowerCase();
  const existing=byTerm.get(term);if(existing){if(word.id.startsWith('context-')||existing.id.startsWith('context-'))errors.push(`New duplicate term: ${word.word}`);else legacyDuplicates++}else byTerm.set(term,word);
  for(const key of ['word','pronunciation','meaning','example','translation'])if(!word[key]?.trim())errors.push(`${word.id}: missing ${key}`);
  if(/\b(?:lorem ipsum|TODO|TBD|placeholder)\b/i.test(JSON.stringify(word)))errors.push(`${word.id}: placeholder`);
 }
 for(const level of levels[language]){
  const cards=words.filter(w=>lexiconMeta(w).level===level),added=contextualWords(language,level);newCount+=added.length;
  const articles=documents.filter(d=>d.kind==='reading'&&d.language===language&&d.level===level);
  const linked=new Set(articles.flatMap(d=>d.vocabulary));
  const currentLinked=cards.filter(w=>linked.has(w.id));
  for(const article of articles)for(const id of article.vocabulary){const w=words.find(w=>w.id===id);if(!w||!wordOccursInText(article.paragraphs.join('\n'),w.word,language))errors.push(`${article.id}: invalid literal vocabulary link ${id}`)}
  rows.push(`| ${language} | ${level} | ${cards.length} | ${new Set(cards.map(w=>w.word.normalize('NFKC').toLowerCase())).size} | ${added.length} | ${currentLinked.length} | ${added.filter(w=>linked.has(w.id)).length} |`);
 }
}
await writeFile('VOCABULARY-AUDIT.md',['# Vocabulary audit','','Counts are course cards; JLPT/CEFR tags are editorial teaching levels, not official exhaustive word lists. Existing homonyms/overlapping source cards retain their original IDs.','','| Language | Level | Cards | Unique terms within grade | Added in 2.7 | Current-grade words linked to readings | Added words linked to readings |','|---|---|---:|---:|---:|---:|---:|',...rows,'',`Total cards: ${count}. New distinct cards: ${newCount}. Retained legacy repeated terms across sources/levels: ${legacyDuplicates}.`,`Quality errors: ${errors.length}.`,'','This original graded supplement improves course/reading coverage; it is not an exhaustive dictionary. Inflected occurrences are not fabricated as exact matches. IPA is a broad British-oriented transcription; individual accents vary. Original examples and translations were spot-checked; automated checks do not replace independent editorial review.','','## Errors',...(errors.length?errors.map(e=>`- ${e}`):['None.'])].join('\n')+'\n');
console.log(`Vocabulary audit: ${count} cards; ${newCount} additions; ${errors.length} errors; ${legacyDuplicates} legacy repeated terms retained.`);
if(errors.length)process.exitCode=1;
