import type {StudyTimer} from '../study-timer';

type LifecycleTarget={page:EventTarget;document:EventTarget&{hidden:boolean}};
// pageshow matters for bfcache restores that do not emit visibilitychange.
export function watchStudyTimer(timer:StudyTimer,checkpoint=()=>{},target:LifecycleTarget={page:window,document}){
 const resume=()=>{timer.setVisible(!target.document.hidden);checkpoint()};
 const leave=()=>{timer.setVisible(false);checkpoint()};
 timer.setVisible(!target.document.hidden);
 target.document.addEventListener('visibilitychange',resume);
 target.page.addEventListener('pagehide',leave);
 target.page.addEventListener('pageshow',resume);
 return()=>{
  target.document.removeEventListener('visibilitychange',resume);
  target.page.removeEventListener('pagehide',leave);
  target.page.removeEventListener('pageshow',resume);
  leave();
 };
}
