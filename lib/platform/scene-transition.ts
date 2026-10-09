import {flushSync} from 'react-dom';
import {richExperienceEffects} from './experience-effects';

export const motionTiming={press:100,state:200,panel:340,scene:480,stagger:40} as const;
type SceneTransition={skipTransition:()=>void;finished:Promise<void>;ready:Promise<void>};
type SceneDocument=Document&{startViewTransition?:(update:()=>void)=>SceneTransition};
let active:SceneTransition|undefined;
let generation=0;
export function isSceneTransitioning(){return typeof document!=='undefined'&&document.documentElement.hasAttribute('data-scene-transition')}

// Only visual/navigation updates belong here. Persist learning operations before
// calling this function so an interrupted animation cannot cancel a save.
export function transitionScene(update:()=>void){
 const ticket=++generation;
 active?.skipTransition();
 const doc=typeof document==='undefined'?undefined:document as SceneDocument;
 const device=typeof window==='undefined'?null:navigator as Navigator&{deviceMemory?:number;connection?:{saveData?:boolean}};
 const constrained=device&&!richExperienceEffects({reducedMotion:false,saveData:device.connection?.saveData,memoryGB:device.deviceMemory,cores:device.hardwareConcurrency});
 if(constrained||!doc?.startViewTransition||doc.hidden||matchMedia('(prefers-reduced-motion: reduce)').matches){update();return;}
 try{
  doc.documentElement.setAttribute('data-scene-transition','active');
  const transition=doc.startViewTransition(()=>{if(ticket===generation)flushSync(update)});
  active=transition;
  void transition.ready.catch(()=>{});
  void transition.finished.catch(()=>{}).finally(()=>{if(active===transition){active=undefined;doc.documentElement.removeAttribute('data-scene-transition')}});
 }catch{doc.documentElement.removeAttribute('data-scene-transition');if(ticket===generation)update()}
}

export function rememberPagePosition(){
 history.replaceState({...history.state,kotobaScroll:window.scrollY},'',location.href);
}
export function restorePagePosition(top:unknown){
 const value=typeof top==='number'&&Number.isFinite(top)?Math.max(0,top):0;
 const href=location.href;
 requestAnimationFrame(()=>requestAnimationFrame(()=>{
  if(location.href===href)window.scrollTo({top:value,behavior:'instant'});
 }));
}
