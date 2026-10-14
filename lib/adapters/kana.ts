// WanaKana is loaded on explicit conversion, never used to replace a native IME.
let modulePromise:Promise<typeof import('wanakana')>|null=null;
export async function convertJapaneseInput(text:string,script:'hiragana'|'katakana'){
 if(text.length>4000)throw new Error('输入过长，请分段转换。');
 modulePromise??=import('wanakana').catch(error=>{modulePromise=null;throw error});
 const kana=await modulePromise;
 return script==='hiragana'?kana.toHiragana(text):kana.toKatakana(text);
}
