'use client';
import {useEffect,useState} from 'react';
import {useStudy} from './study-context';
import ContentLibrary from './content-library';
import {PersonalMaterials} from './personal-materials';
import {Button} from './ui/button';
import {Grammar,Reading} from './reading';
export default function LibraryWorkspace(){
 const {state,changeLanguage,userId}=useStudy();const [kind,setKind]=useState<'grammar'|'reading'|'personal'>(()=>typeof window!=='undefined'&&new URL(location.href).searchParams.get('section')==='materials'?'personal':'grammar');const [importOpen,setImportOpen]=useState(false);
 useEffect(()=>{const update=()=>{if(new URL(location.href).searchParams.get('section')==='materials')setKind('personal')};window.addEventListener('kotoba:navigate',update);window.addEventListener('popstate',update);return()=>{window.removeEventListener('kotoba:navigate',update);window.removeEventListener('popstate',update)}},[]);
 return <div className="library-workspace"><header className="library-workspace-heading"><h1>资料库</h1><Button onClick={()=>{setKind('personal');setImportOpen(true)}}>导入素材</Button><div className="scope-switch" aria-label="资料语言">{(['ja','en'] as const).map(language=><button key={language} aria-pressed={state.profile.language===language} onClick={()=>changeLanguage(language)}>{language==='ja'?'日本語':'English'}</button>)}</div></header><div className="course-segments" aria-label="资料类型"><button aria-pressed={kind==='grammar'} onClick={()=>setKind('grammar')}>语法</button><button aria-pressed={kind==='reading'} onClick={()=>setKind('reading')}>阅读</button><button aria-pressed={kind==='personal'} onClick={()=>setKind('personal')}>个人素材</button></div>{kind==='personal'?<PersonalMaterials key={userId+'-'+state.profile.language} importOpen={importOpen} onImportClose={()=>setImportOpen(false)}/>:<ContentLibrary key={kind+state.profile.language} kind={kind} legacy={kind==='grammar'?<Grammar/>:<Reading/>}/>}</div>;
}
