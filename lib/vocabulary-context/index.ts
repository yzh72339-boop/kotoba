import type {Language,Word} from '../content.ts';
import {contextualWordSchema} from './schema.ts';
import jaN5 from './ja-n5.json';
import jaN4 from './ja-n4.json';
import jaN3 from './ja-n3.json';
import jaN2 from './ja-n2.json';
import jaN1 from './ja-n1.json';
import enA1 from './en-a1.json';
import enA2 from './en-a2.json';
import enB1 from './en-b1.json';
import enB2 from './en-b2.json';
import enC1 from './en-c1.json';
import enC2 from './en-c2.json';

// Additive, grade-sized original content. Existing cards keep their IDs and schedules.
const batches:Record<Language,Record<string,Word[]>>={
 ja:{N5:contextualWordSchema.array().parse(jaN5),N4:contextualWordSchema.array().parse(jaN4),N3:contextualWordSchema.array().parse(jaN3),N2:contextualWordSchema.array().parse(jaN2),N1:contextualWordSchema.array().parse(jaN1)},
 en:{A1:contextualWordSchema.array().parse(enA1),A2:contextualWordSchema.array().parse(enA2),B1:contextualWordSchema.array().parse(enB1),B2:contextualWordSchema.array().parse(enB2),C1:contextualWordSchema.array().parse(enC1),C2:contextualWordSchema.array().parse(enC2)},
};
export function contextualWords(language:Language,level:string){return batches[language][level]??[]}
