// Imported only by the optional worker and real-library Node tests.
import Kuroshiro from 'kuroshiro';
import KuromojiAnalyzer from 'kuroshiro-analyzer-kuromoji';
import {japaneseTokens,validateJapaneseParagraphs} from './japanese-types';
export async function createJapaneseAnalyzer(dictPath:string){
 const analyzer=new KuromojiAnalyzer({dictPath}),kuroshiro=new Kuroshiro();
 await kuroshiro.init(analyzer);
 return async(paragraphs:string[])=>{
  validateJapaneseParagraphs(paragraphs);
  const result=[];
  for(const text of paragraphs)result.push(japaneseTokens(text,await analyzer.parse(text),Kuroshiro.Util.kanaToHiragna));
  return result;
 };
}
