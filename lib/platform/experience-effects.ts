export type ExperienceCapabilities={reducedMotion:boolean;saveData?:boolean;memoryGB?:number;cores?:number};
// Missing device hints are not a reason to disable basic interaction feedback.
export function richExperienceEffects(c:ExperienceCapabilities){
 return !c.reducedMotion&&!c.saveData&&!(c.memoryGB!==undefined&&c.memoryGB<=4)&&!(c.cores!==undefined&&c.cores<=4);
}
