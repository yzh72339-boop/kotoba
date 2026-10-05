import type {Language,Word} from './content.ts';

// Append-only, original examples. Keep the row order stable: IDs are persisted by SRS.
const rows:Record<string,string>= {
 N5:`家|いえ|家|家に帰ります。|回家。
母|はは|母亲|母は料理をします。|妈妈做饭。
父|ちち|父亲|父は会社に行きます。|爸爸去公司。
朝|あさ|早晨|朝、パンを食べます。|早晨吃面包。
夜|よる|夜晚|夜に本を読みます。|晚上读书。
買う|かう|买|スーパーで水を買います。|在超市买水。
見る|みる|看|映画を見ます。|看电影。
聞く|きく|听|音楽を聞きます。|听音乐。
話す|はなす|说话|友達と話します。|和朋友说话。
小さい|ちいさい|小的|小さい犬がいます。|有一只小狗。
新しい|あたらしい|新的|新しい本を買いました。|买了一本新书。
古い|ふるい|旧的|この家は古いです。|这所房子很旧。
一緒に|いっしょに|一起|一緒に行きましょう。|一起去吧。
少し|すこし|一点|水を少し飲みます。|喝一点水。
右|みぎ|右边|右に曲がってください。|请向右转。
左|ひだり|左边|駅は左にあります。|车站在左边。`,
 N4:`片付ける|かたづける|整理|部屋を片付けました。|整理了房间。
伝える|つたえる|传达|先生に予定を伝えます。|把计划告诉老师。
選ぶ|えらぶ|选择|好きな本を選びました。|选了喜欢的书。
説明|せつめい|说明|使い方の説明を聞きます。|听使用方法的说明。
安心|あんしん|放心|無事だと聞いて安心しました。|听说平安无事，放心了。
安全|あんぜん|安全|この道は夜も安全です。|这条路晚上也安全。
特別|とくべつ|特别|今日は特別な日です。|今天是特别的日子。
約束する|やくそくする|约定|明日会うと約束しました。|约好明天见面。
遅れる|おくれる|迟到|電車が遅れています。|电车晚点了。
間に合う|まにあう|赶得上|授業に間に合いました。|赶上了课。
似ている|にている|相似|二人はよく似ています。|两个人很像。
調べる|しらべる|查找|知らない言葉を調べます。|查询不认识的词。
習う|ならう|学习|週末に料理を習っています。|周末在学做菜。
連絡|れんらく|联系|着いたら連絡してください。|到了以后请联系我。
近所|きんじょ|附近|近所に公園があります。|附近有公园。
残る|のこる|剩下|ケーキが少し残っています。|还剩一点蛋糕。`,
 N2:`検討|けんとう|研究讨论|新しい案を検討しています。|正在研究新方案。
対応|たいおう|应对|問題に早く対応しました。|迅速应对了问题。
把握|はあく|掌握情况|全体の状況を把握します。|掌握整体情况。
確保|かくほ|确保|十分な時間を確保しました。|确保了充足的时间。
指摘|してき|指出|報告書の問題を指摘しました。|指出了报告的问题。
解決|かいけつ|解决|話し合いで問題を解決しました。|通过讨论解决了问题。
比較|ひかく|比较|二つの方法を比較します。|比较两种方法。
条件|じょうけん|条件|参加する条件を確認します。|确认参加条件。
需要|じゅよう|需求|夏は冷たい飲み物の需要が高まります。|夏天冷饮需求增加。
供給|きょうきゅう|供应|電力の供給が安定しています。|电力供应稳定。
収入|しゅうにゅう|收入|毎月の収入を記録します。|记录每月收入。
支出|ししゅつ|支出|支出を見直す必要があります。|有必要重新审视支出。
客観的|きゃっかんてき|客观的|客観的な意見を聞きたいです。|我想听客观意见。
慎重|しんちょう|慎重|慎重に判断してください。|请谨慎判断。
実施|じっし|实施|来月から調査を実施します。|从下月开始开展调查。
導入|どうにゅう|引进|新しい制度を導入しました。|引入了新制度。`,
 N1:`論拠|ろんきょ|论据|主張の論拠を示してください。|请提出主张的论据。
整合性|せいごうせい|一致性|二つの説明の整合性を確かめます。|核对两种解释是否一致。
脆弱|ぜいじゃく|脆弱|この仕組みには脆弱な部分があります。|这个机制有薄弱之处。
顧みる|かえりみる|回顾反省|過去の判断を顧みます。|回顾过去的判断。
是正|ぜせい|纠正|制度の不公平を是正します。|纠正制度中的不公平。
波及|はきゅう|波及|影響は周辺地域にも波及しました。|影响也波及周边地区。
逸脱|いつだつ|偏离|計画から逸脱しないようにします。|尽量不偏离计划。
見解|けんかい|见解|専門家の見解は分かれています。|专家的看法有分歧。
推移|すいい|变化趋势|人口の推移を図で示します。|用图表展示人口变化。
余地|よち|余地|改善の余地があります。|还有改进的余地。
厳密|げんみつ|严密|言葉の意味を厳密に定義します。|严格定义词义。
包括|ほうかつ|包含|複数の課題を包括して考えます。|综合考虑多个问题。
暫定的|ざんていてき|暂时的|暫定的な結論を出しました。|得出了暂时的结论。
相対的|そうたいてき|相对的|価値は相対的に判断されます。|价值是相对判断的。
自明|じめい|不言自明|その前提は自明ではありません。|那个前提并非不言自明。
精査|せいさ|仔细审查|資料を精査してから決めます。|仔细审查资料后再决定。`,
 A1:`family|/ˈfæməli/|家人|My family lives here.|我的家人住在这里。
mother|/ˈmʌðə/|母亲|My mother is at home.|我妈妈在家。
father|/ˈfɑːðə/|父亲|My father likes tea.|我爸爸喜欢茶。
morning|/ˈmɔːnɪŋ/|早晨|I study in the morning.|我早晨学习。
evening|/ˈiːvnɪŋ/|晚上|We eat together in the evening.|我们晚上一起吃饭。
food|/fuːd/|食物|The food is good.|食物很好吃。
coffee|/ˈkɒfi/|咖啡|I want a coffee, please.|请给我一杯咖啡。
table|/ˈteɪbəl/|桌子|The book is on the table.|书在桌子上。
small|/smɔːl/|小的|This room is small.|这个房间很小。
big|/bɪɡ/|大的|That house is big.|那所房子很大。
new|/njuː/|新的|I have a new bag.|我有一个新包。
old|/əʊld/|旧的；年老的|This is an old photo.|这是一张旧照片。
read|/riːd/|阅读|I read a book every day.|我每天读书。
write|/raɪt/|写|Please write your name.|请写下你的名字。
listen|/ˈlɪsən/|听|Listen to the teacher.|听老师讲课。
walk|/wɔːk/|走路|We walk to school.|我们步行去学校。`,
 A2:`journey|/ˈdʒɜːni/|旅程|The journey took two hours.|旅程花了两个小时。
neighbour|/ˈneɪbə/|邻居|My neighbour helped me.|邻居帮了我。
borrow|/ˈbɒrəʊ/|借入|Can I borrow your pen?|我能借一下你的笔吗？
return|/rɪˈtɜːn/|归还|Please return the book tomorrow.|请明天还书。
invite|/ɪnˈvaɪt/|邀请|I invited my friends to dinner.|我邀请朋友们来吃晚饭。
explain|/ɪkˈspleɪn/|解释|Can you explain this word?|你能解释这个词吗？
repair|/rɪˈpeə/|修理|They repaired my bicycle.|他们修好了我的自行车。
comfortable|/ˈkʌmftəbəl/|舒适的|This chair is comfortable.|这把椅子很舒服。
crowded|/ˈkraʊdɪd/|拥挤的|The bus was crowded today.|今天公交车很挤。
empty|/ˈempti/|空的|The bottle is empty.|瓶子空了。
careful|/ˈkeəfəl/|小心的|Be careful on the stairs.|上下楼梯要小心。
different|/ˈdɪfrənt/|不同的|We chose different meals.|我们选了不同的餐食。
message|/ˈmesɪdʒ/|消息|I sent her a message.|我给她发了消息。
address|/əˈdres/|地址|What is your address?|你的地址是什么？
market|/ˈmɑːkɪt/|市场|We bought fruit at the market.|我们在市场买了水果。
museum|/mjuˈziːəm/|博物馆|The museum opens at nine.|博物馆九点开门。`,
 B2:`consequence|/ˈkɒnsɪkwəns/|后果|The decision had an unexpected consequence.|这个决定带来了意外后果。
persuade|/pəˈsweɪd/|说服|She persuaded us to try again.|她说服我们再试一次。
justify|/ˈdʒʌstɪfaɪ/|证明合理|Can you justify this expense?|你能说明这笔支出的合理性吗？
interpret|/ɪnˈtɜːprɪt/|解释；理解|People interpret the data differently.|人们对数据的理解不同。
alternative|/ɔːlˈtɜːnətɪv/|替代方案|We need an alternative plan.|我们需要一个备选计划。
accurate|/ˈækjərət/|准确的|The report is accurate.|这份报告是准确的。
complex|/ˈkɒmpleks/|复杂的|The problem is more complex than it seems.|问题比看起来更复杂。
relevant|/ˈreləvənt/|相关的|Please include relevant examples.|请加入相关例子。
significant|/sɪɡˈnɪfɪkənt/|显著的|The change was significant.|变化十分显著。
estimate|/ˈestɪmeɪt/|估计|We estimate the work will take a week.|我们估计这项工作要一周。
negotiate|/nɪˈɡəʊʃieɪt/|协商|The teams negotiated a new schedule.|双方团队协商了新日程。
contribute|/kənˈtrɪbjuːt/|作出贡献|Everyone can contribute an idea.|每个人都可以提出一个想法。
inevitable|/ɪnˈevɪtəbəl/|不可避免的|Some delays were inevitable.|有些延误不可避免。
temporary|/ˈtempərəri/|暂时的|This is a temporary solution.|这是一个临时解决办法。
framework|/ˈfreɪmwɜːk/|框架|The new framework guides our decisions.|新框架指导我们的决策。
resource|/rɪˈzɔːs/|资源|Time is our most limited resource.|时间是我们最有限的资源。`,
 C1:`articulate|/ɑːˈtɪkjuleɪt/|清楚表达|She articulated the main concern clearly.|她清楚地表达了主要担忧。
compelling|/kəmˈpelɪŋ/|有说服力的|He made a compelling argument.|他提出了有说服力的论点。
comprehensive|/ˌkɒmprɪˈhensɪv/|全面的|The review was comprehensive.|这次审查很全面。
contentious|/kənˈtenʃəs/|有争议的|The proposal remains contentious.|这项提议仍有争议。
deliberate|/dɪˈlɪbərət/|深思熟虑的|It was a deliberate decision.|这是经过深思熟虑的决定。
elaborate|/ɪˈlæbəreɪt/|详尽说明|Could you elaborate on that point?|你能详细说明那一点吗？
facilitate|/fəˈsɪlɪteɪt/|促进|Clear rules facilitate cooperation.|明确的规则有助于合作。
feasible|/ˈfiːzəbəl/|可行的|The plan is feasible within our budget.|这项计划在预算内可行。
infer|/ɪnˈfɜː/|推断|We cannot infer intent from one remark.|不能凭一句话推断意图。
intrinsic|/ɪnˈtrɪnsɪk/|固有的|Trust has intrinsic value.|信任有其内在价值。
misleading|/mɪsˈliːdɪŋ/|误导性的|The headline was misleading.|标题具有误导性。
nevertheless|/ˌnevəðəˈles/|尽管如此|The task was difficult; nevertheless, we finished it.|任务很难，但我们还是完成了。
overlook|/ˌəʊvəˈlʊk/|忽视|Do not overlook the smaller costs.|不要忽视较小的成本。
profound|/prəˈfaʊnd/|深远的|The discovery had a profound effect.|这项发现产生了深远影响。
scrutinize|/ˈskruːtənaɪz/|仔细审查|The committee scrutinized the proposal.|委员会仔细审查了提案。
viable|/ˈvaɪəbəl/|可行的|We need a viable long-term option.|我们需要可行的长期方案。`,
 C2:`axiom|/ˈæksiəm/|公理|The argument starts from a simple axiom.|该论证从一条简单公理出发。
caveat|/ˈkæviæt/|保留意见|There is one important caveat to this claim.|这一说法有一个重要的保留条件。
conflate|/kənˈfleɪt/|混为一谈|We should not conflate correlation with cause.|不应将相关性与因果关系混为一谈。
contingent|/kənˈtɪndʒənt/|取决于条件的|Success is contingent on continued support.|成功取决于持续的支持。
dispassionate|/dɪsˈpæʃənət/|冷静客观的|She offered a dispassionate assessment.|她给出了冷静客观的评估。
extrapolate|/ɪkˈstræpəleɪt/|外推|We cannot extrapolate from one small sample.|不能从一个小样本直接外推。
fallacy|/ˈfæləsi/|谬误|The conclusion rests on a fallacy.|这个结论建立在一个谬误之上。
idiosyncratic|/ˌɪdiəʊsɪŋˈkrætɪk/|独特的|The author has an idiosyncratic style.|这位作者的风格别具一格。
inadvertent|/ˌɪnədˈvɜːtənt/|无意的|The omission was inadvertent.|这一遗漏并非有意。
intransigent|/ɪnˈtrænsɪdʒənt/|不肯妥协的|The two sides remained intransigent.|双方仍不肯让步。
obfuscate|/ˈɒbfəskeɪt/|使模糊|Technical language can obfuscate a simple point.|技术术语可能把简单的问题说得晦涩。
paradigm|/ˈpærədaɪm/|范式|The findings challenged the old paradigm.|这些发现挑战了旧范式。
qualify|/ˈkwɒlɪfaɪ/|修正；限定|The author later qualified that statement.|作者后来对那一说法作了限定。
salient|/ˈseɪliənt/|突出的|The report highlights the most salient risks.|报告强调了最突出的风险。
substantiate|/səbˈstænʃieɪt/|证实|The records substantiate her account.|记录证实了她的说法。
undermine|/ˌʌndəˈmaɪn/|削弱|The error could undermine public trust.|这一错误可能削弱公众信任。`
};

export function supplementalWords(language:Language,level:string):Word[]{
 const source=rows[level];
 if(!source)return [];
 return source.split('\n').map((row,index)=>{
  const [word,pronunciation,meaning,example,translation]=row.split('|');
  return {id:`supp-${language}-${level.toLowerCase()}-${index+1}`,word,pronunciation,meaning,example,translation,tag:`${language==='ja'?'JLPT ':''}${level}`};
 });
}
