// A monotonic visible-time clock. No browser lifecycle is embedded in learning data.
export class StudyTimer{
 private accumulated=0;private since:number|null;
 constructor(private clock:()=>number=()=>performance.now()){this.since=this.clock()}
 setVisible(visible:boolean){const now=this.clock();if(!visible&&this.since!==null){this.accumulated+=Math.max(0,now-this.since);this.since=null}else if(visible&&this.since===null)this.since=now}
 reset(visible=true){this.accumulated=0;this.since=visible?this.clock():null}
 take(){const now=this.clock();const duration=this.accumulated+(this.since===null?0:Math.max(0,now-this.since));this.accumulated=0;if(this.since!==null)this.since=now;return duration}
}
