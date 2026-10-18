import {readFileSync} from 'node:fs';
import {allCourseWords} from '../../lib/course-library.ts';
// Explicit historical membership keeps the original payload/hash checks strict
// while allowing authored additions to enter the current catalog.
const baseline=JSON.parse(readFileSync(new URL('../fixtures/vocabulary-927-baseline.json',import.meta.url),'utf8'));
const ids=new Set(baseline.ids);
export function preservedVocabulary(){return ['ja','en'].flatMap(allCourseWords).filter(word=>ids.has(word.id))}
export function isPreservedVocabulary(id){return ids.has(id)}
