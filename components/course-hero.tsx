'use client';
import type {ReactNode} from 'react';
import type {GrammarPoint,ReadingDocument} from '@/lib/content-library/schema';

let linkedExpression:{articleId:string;grammarId:string}|null=null;
export function rememberLinkedExpression(articleId:string,grammarId:string){linkedExpression={articleId,grammarId}}
export function linkedExpressionFor(articleId:string){return linkedExpression?.articleId===articleId?linkedExpression.grammarId:null}

export function CourseHero({title,level,language,document:doc,children,shared=false,contextLabel}:{title:string;level:string;language:'ja'|'en';document?:GrammarPoint|ReadingDocument|null;children?:ReactNode;shared?:boolean;contextLabel?:string}){
 const example=doc?.kind==='grammar'?doc.examples[0]:undefined;
 return <section className={`course-hero ${shared?'shared-course-hero':''}`}>
  <div className="course-hero-meta"><span>{contextLabel??(doc?.kind==='reading'?'关联阅读':'语法专题')}</span><span>{level} · {doc?.kind==='reading'?'阅读':'语法'}</span></div>
  <div className="course-hero-heading"><h2 lang={language}>{title}</h2><span className="silver-symbol" aria-hidden="true">{language==='ja'?'あ':'Aa'}</span></div>
  {doc?.kind==='grammar'&&<p className="course-hero-meaning">{doc.meaningZh}</p>}
  {example&&<div className="course-hero-example"><p lang={language}>{example.target}</p><small>{example.zh}</small></div>}
  {doc?.kind==='reading'&&<p className="course-hero-meaning">{doc.topic}</p>}
  {children}
 </section>;
}
