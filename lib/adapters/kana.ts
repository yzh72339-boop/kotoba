// WanaKana is loaded on explicit conversion, never used to replace a native IME.
let modulePromise:Promise<typeof import('wanakana')>|null=null;
export async function convertJapaneseInput(text:string,script:'hiragana'|'katakana'){
 if(text.length>4000)throw new Error('输入过长，请分段转换。');
 modulePromise??=import('wanakana').catch(error=>{modulePromise=null;throw error});
 const kana=await modulePromise;
 return script==='hiragana'?kana.toHiragana(text):kana.toKatakana(text);
}
export async function japaneseSearchKeys(query:string){
 const value=query.normalize('NFKC').trim().toLowerCase();if(!value||value.length>100)return [];
 const keys=await Promise.all([convertJapaneseInput(value,'hiragana'),convertJapaneseInput(value,'katakana')]);
 return [...new Set(keys)].filter(key=>key!==value);
}
