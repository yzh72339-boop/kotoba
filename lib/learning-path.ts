import type {Profile} from './store';
export type PathModule='Vocabulary'|'Grammar'|'Listening'|'Reading'|'Speaking'|'Review';
export function learningPath(p:Profile){
 const beginner=['N5','N4','A1','A2'].includes(p.level),advanced=['N1','N2','C1','C2'].includes(p.level);
 const focus=p.goal==='考试'?['Grammar','Reading','Review']:p.goal==='商务'?['Speaking','Listening','Vocabulary']:p.goal==='留学'?['Reading','Speaking','Listening']:p.goal==='旅行'||p.goal==='日常交流'?['Listening','Speaking','Vocabulary']:['Reading','Vocabulary','Listening'];
 return [
 {title:beginner?'Build your foundations.':advanced?'Refine the details.':'Build a daily habit.',description:beginner?'从基础词汇和短对话起步，在熟悉的语境里建立信心。':advanced?'在更细微的表达和自然语境里，拓展语言的深度。':'日常词汇与短对话，把学习融入生活。',modules:['Vocabulary',beginner?'Listening':'Grammar'] as PathModule[]},
 {title:p.goal==='考试'?'Practice with purpose.':p.goal==='商务'?'Connect professionally.':'Express yourself naturally.',description:`围绕「${p.goal}」目标，优先练习最相关的能力。`,modules:focus.slice(0,2) as PathModule[]},
 {title:'Find meaning in everyday life.',description:'通过阅读与听力，积累真实语境里的表达。',modules:['Reading','Listening'] as PathModule[]},
 {title:'Make it second nature.',description:'将开口表达与间隔复习结合，让知识成为直觉。',modules:['Speaking','Review'] as PathModule[]}
 ];
}
