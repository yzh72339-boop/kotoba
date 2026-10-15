declare module 'kuroshiro' {
 export default class Kuroshiro {
  static Util:{kanaToHiragna:(value:string)=>string};
  init(analyzer:import('kuroshiro-analyzer-kuromoji').default):Promise<void>;
 }
}
declare module 'kuroshiro-analyzer-kuromoji' {
 export default class KuromojiAnalyzer {
  constructor(options:{dictPath:string});
  init():Promise<void>;
  parse(text:string):Promise<import('./japanese-types').MorphToken[]>;
 }
}
