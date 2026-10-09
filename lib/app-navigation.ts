export const appPages=['Today','Learn','Library','Vocabulary','Grammar','Reading','Listening','Speaking','Review','Progress','AI Tutor','Settings','Profile','My Sentences','Mistake Notebook'] as const;
export type Page=typeof appPages[number];
export const mobilePageTitle:Record<Page,string>={Today:'首页',Learn:'学习',Library:'资料库',Vocabulary:'词汇',Grammar:'语法',Reading:'阅读',Listening:'听力',Speaking:'口语',Review:'复习',Progress:'学习进度','AI Tutor':'AI 导师',Settings:'设置',Profile:'我的','My Sentences':'句子收藏','Mistake Notebook':'错题本'};
export function mobileNavParent(page:Page):Page{
 if(['Grammar','Reading','My Sentences','Mistake Notebook'].includes(page))return 'Library';
 if(['Vocabulary','Review','Listening','Speaking','AI Tutor'].includes(page))return 'Learn';
 if(['Settings','Progress'].includes(page))return 'Profile';
 return page;
}
export type RouteOptions={content?:string;word?:string;legacy?:boolean};
export function pageFromHash(hash:string):Page|undefined{try{const page=decodeURIComponent(hash.replace(/^#/,''));return appPages.find(p=>p===page)}catch{return undefined}}
export function pageURL(current:string,page:Page,options:RouteOptions={}){
 const url=new URL(current);for(const key of ['content','word','legacy'])url.searchParams.delete(key);
 if(options.content&&/^[a-z0-9-]+$/.test(options.content))url.searchParams.set('content',options.content);
 if(options.word&&/^[a-z0-9-]+$/.test(options.word))url.searchParams.set('word',options.word);
 if(options.legacy)url.searchParams.set('legacy','1');
 url.hash=encodeURIComponent(page);return url;
}
