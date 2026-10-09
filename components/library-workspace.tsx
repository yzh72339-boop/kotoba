'use client';
import {useState} from 'react';
import {useStudy} from './study-context';
import ContentLibrary from './content-library';
import {Grammar,Reading} from './reading';
export default function LibraryWorkspace(){
 const {state,changeLanguage}=useStudy();const [kind,setKind]=useState<'grammar'|'reading'>('grammar');
 return <div className="library-workspace"><header className="library-workspace-heading"><h1>资料库</h1><div className="scope-switch" aria-label="资料语言">{(['ja','en'] as const).map(language=><button key={language} aria-pressed={state.profile.language===language} onClick={()=>changeLanguage(language)}>{language==='ja'?'日本語':'English'}</button>)}</div></header><div className="course-segments" aria-label="资料类型"><button aria-pressed={kind==='grammar'} onClick={()=>setKind('grammar')}>语法</button><button aria-pressed={kind==='reading'} onClick={()=>setKind('reading')}>阅读</button></div><ContentLibrary key={kind+state.profile.language} kind={kind} legacy={kind==='grammar'?<Grammar/>:<Reading/>}/></div>;
}
