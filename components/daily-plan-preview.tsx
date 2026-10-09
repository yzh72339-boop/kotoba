'use client';
import {useStudy} from './study-context';
import {coursePlan,scopedSession,storedCoursePlan} from '@/lib/content-library/daily-course-plan';
import type {ContentEntry} from '@/lib/content-library/schema';
export function DailyPlanPreview({catalog}:{catalog:ContentEntry[]|null}){
 const {state}=useStudy();const session=scopedSession(state),saved=storedCoursePlan(state,session);
 if(!saved&&!catalog?.length)return <p className="subtle" role="status">正在加载今日课程；目录不可用时可重试或打开已下载资料。</p>;
 const plan=saved??coursePlan(state,catalog!);
 return <section className="daily-plan-preview" aria-label="每日计划预览"><div><strong>今日计划</strong><span>预计 {plan.minutes} 分钟 · {plan.level}</span></div><ol><li><span>到期复习</span><strong>{plan.reviewIds.length} 张 · {Math.ceil(plan.reviewIds.length/3)} 分钟</strong></li><li><span>语法 · {plan.grammar.level}{plan.grammar.legacy?' · 基础资料':''}</span><strong>{plan.grammar.title}</strong></li><li><span>阅读 · {plan.reading.level}{plan.reading.legacy?' · 基础资料':''}</span><strong>{plan.reading.title}</strong></li></ol><p>{plan.reason}</p><details><summary>时间如何估算</summary><p>复习每张约 20 秒，完整语法按课程标注（通常 6 分钟），阅读按文章预计时间。仅为安排参考，不是实际学习计时或 AI 个性化推断。</p></details></section>;
}
