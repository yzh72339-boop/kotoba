export type ReaderAnchor={index:number;within:number};
export function readAnchor(value:string|undefined,count:number):ReaderAnchor|null{
 try{const a=JSON.parse(value??'null');return a&&Number.isInteger(a.index)&&a.index>=0&&a.index<count&&Number.isFinite(a.within)&&a.within>=0&&a.within<=1?{index:a.index,within:a.within}:null}catch{return null}
}
export function readerScrollTarget(position:{progress:number;offset?:number}|undefined,range:number,anchor:ReaderAnchor|null,paragraphs:{top:number;height:number}[]):number{
 const p=anchor?paragraphs[anchor.index]:null;const target=p&&anchor?p.top+p.height*anchor.within:position?.offset!==undefined?position.offset:(position?.progress??0)/100*range;
 return Math.max(0,Math.min(Math.max(0,range),Number.isFinite(target)?target:0));
}
export function readerAnchor(scroll:number,paragraphs:{top:number;height:number}[]):ReaderAnchor|null{
 let index=-1;for(let i=0;i<paragraphs.length;i++)if(paragraphs[i].top<=scroll)index=i;
 return index<0?null:{index,within:Math.min(1,Math.max(0,(scroll-paragraphs[index].top)/Math.max(1,paragraphs[index].height)))};
}
