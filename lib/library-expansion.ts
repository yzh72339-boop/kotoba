import type {Language, Word} from './content';

export type GrammarLesson={id:string;level:string;title:string;meaning:string;structure:string[];explanation:string;example:string;translation:string;question:string;options:string[];answer:number;insight?:string};
export type ReadingArticle={id:string;title:string;subtitle:string;category:string;level:string;paragraphs:string[];translations:string[];question:string;options:string[];answer:number;summary:string};
export type ListeningEpisode={id:string;title:string;description:string;level:string;lines:{text:string;translation:string}[]};

export const extraVocabulary:Record<Language,Word[]>={
 ja:[
  {id:'ja-setsumei',word:'説明',pronunciation:'せつめい',meaning:'说明 · 解释',example:'もう一度説明していただけますか。',translation:'能请您再解释一次吗？',tag:'N3 · 名词'},
  {id:'ja-yoyaku',word:'予約',pronunciation:'よやく',meaning:'预约 · 预订',example:'病院の予約を変更しました。',translation:'我更改了医院的预约。',tag:'N3 · 名词'},
  {id:'ja-henkou',word:'変更',pronunciation:'へんこう',meaning:'变更 · 更改',example:'予定に変更がありました。',translation:'计划有变。',tag:'N3 · 名词'},
  {id:'ja-tsugou',word:'都合',pronunciation:'つごう',meaning:'方便与否 · 情况',example:'木曜日は都合がいいですか。',translation:'周四方便吗？',tag:'N3 · 名词'},
  {id:'ja-renraku',word:'連絡',pronunciation:'れんらく',meaning:'联系 · 通知',example:'着いたら連絡してください。',translation:'到了以后请联系我。',tag:'N3 · 名词'},
  {id:'ja-moushikomi',word:'申し込み',pronunciation:'もうしこみ',meaning:'申请 · 报名',example:'講座の申し込みは明日までです。',translation:'课程报名截止到明天。',tag:'N3 · 名词'},
  {id:'ja-shorui',word:'書類',pronunciation:'しょるい',meaning:'文件 · 材料',example:'必要な書類を確認します。',translation:'我会确认所需材料。',tag:'N3 · 名词'},
  {id:'ja-hitsuyou',word:'必要',pronunciation:'ひつよう',meaning:'必要',example:'予約には名前が必要です。',translation:'预约需要姓名。',tag:'N3 · 形容动词'},
  {id:'ja-junbi',word:'準備',pronunciation:'じゅんび',meaning:'准备',example:'旅行の準備をしています。',translation:'我正在准备旅行。',tag:'N3 · 名词'},
  {id:'ja-kakunin',word:'確認',pronunciation:'かくにん',meaning:'确认 · 核对',example:'時間をもう一度確認します。',translation:'我再确认一次时间。',tag:'N3 · 名词'},
  {id:'ja-yotei',word:'予定',pronunciation:'よてい',meaning:'计划 · 安排',example:'週末の予定はまだ決まっていません。',translation:'周末的安排还没定。',tag:'N3 · 名词'},
  {id:'ja-iken',word:'意見',pronunciation:'いけん',meaning:'意见 · 看法',example:'みんなの意見を聞きたいです。',translation:'我想听听大家的意见。',tag:'N3 · 名词'},
  {id:'ja-rikai',word:'理解',pronunciation:'りかい',meaning:'理解',example:'説明を聞いて理解できました。',translation:'听了解释后我明白了。',tag:'N3 · 名词'},
  {id:'ja-taiken',word:'体験',pronunciation:'たいけん',meaning:'体验 · 亲身经历',example:'茶道を体験してみたいです。',translation:'我想体验一下茶道。',tag:'N3 · 名词'},
  {id:'ja-shippai',word:'失敗',pronunciation:'しっぱい',meaning:'失败 · 失误',example:'失敗から学ぶことも大切です。',translation:'从失败中学习也很重要。',tag:'N3 · 名词'},
  {id:'ja-seikou',word:'成功',pronunciation:'せいこう',meaning:'成功',example:'小さな成功を大切にしましょう。',translation:'珍惜每一次小小的成功吧。',tag:'N3 · 名词'},
  {id:'ja-erabu',word:'選ぶ',pronunciation:'えらぶ',meaning:'选择',example:'好きな本を一冊選んでください。',translation:'请选一本喜欢的书。',tag:'N3 · 动词'},
  {id:'ja-tasukeru',word:'助ける',pronunciation:'たすける',meaning:'帮助',example:'困っている人を助けました。',translation:'我帮助了遇到困难的人。',tag:'N3 · 动词'},
  {id:'ja-komaru',word:'困る',pronunciation:'こまる',meaning:'为难 · 遇到困难',example:'道が分からなくて困りました。',translation:'我不认识路，感到很为难。',tag:'N3 · 动词'},
  {id:'ja-maniau',word:'間に合う',pronunciation:'まにあう',meaning:'赶得上 · 来得及',example:'早く出れば電車に間に合います。',translation:'早点出门就能赶上电车。',tag:'N3 · 动词'},
  {id:'ja-ochitsuku',word:'落ち着く',pronunciation:'おちつく',meaning:'平静下来 · 安定',example:'深呼吸すると気持ちが落ち着きます。',translation:'深呼吸会让心情平静下来。',tag:'N3 · 动词'},
  {id:'ja-tsutaeru',word:'伝える',pronunciation:'つたえる',meaning:'传达 · 告诉',example:'感謝の気持ちを言葉で伝えます。',translation:'用语言表达感谢之情。',tag:'N3 · 动词'},
  {id:'ja-kangae',word:'考え',pronunciation:'かんがえ',meaning:'想法 · 思考',example:'あなたの考えを教えてください。',translation:'请告诉我你的想法。',tag:'N3 · 名词'},
  {id:'ja-tokuni',word:'特に',pronunciation:'とくに',meaning:'特别 · 尤其',example:'特に週末は混んでいます。',translation:'尤其是周末很拥挤。',tag:'N3 · 副词'},
  {id:'ja-tatoeba',word:'例えば',pronunciation:'たとえば',meaning:'例如',example:'例えば、図書館で勉強できます。',translation:'例如，可以在图书馆学习。',tag:'N3 · 副词'},
  {id:'ja-sorezore',word:'それぞれ',pronunciation:'それぞれ',meaning:'各自 · 分别',example:'人にはそれぞれ好きな方法があります。',translation:'每个人都有各自喜欢的方法。',tag:'N3 · 副词'},
  {id:'ja-kekka',word:'結果',pronunciation:'けっか',meaning:'结果',example:'練習した結果、上手に話せました。',translation:'经过练习，结果说得更好了。',tag:'N3 · 名词'},
  {id:'ja-ryuu',word:'理由',pronunciation:'りゆう',meaning:'理由 · 原因',example:'遅れた理由を説明します。',translation:'我会说明迟到的原因。',tag:'N3 · 名词'},
  {id:'ja-jouhou',word:'情報',pronunciation:'じょうほう',meaning:'信息 · 资讯',example:'新しい情報を調べました。',translation:'我查了新信息。',tag:'N3 · 名词'},
  {id:'ja-chousa',word:'調査',pronunciation:'ちょうさ',meaning:'调查 · 查找',example:'出発前に交通情報を調査します。',translation:'出发前我会查交通信息。',tag:'N3 · 名词'}
 ],
 en:[
  {id:'en-arrange',word:'arrange',pronunciation:'/əˈreɪndʒ/',meaning:'安排 · 整理',example:'Can we arrange a meeting for Friday?',translation:'我们能安排周五开会吗？',tag:'B1 · verb'},
  {id:'en-confirm',word:'confirm',pronunciation:'/kənˈfɜːm/',meaning:'确认',example:'Please confirm your booking by email.',translation:'请通过邮件确认预订。',tag:'B1 · verb'},
  {id:'en-available',word:'available',pronunciation:'/əˈveɪ.lə.bəl/',meaning:'有空的 · 可用的',example:'Is this room available tomorrow?',translation:'这个房间明天可用吗？',tag:'B1 · adjective'},
  {id:'en-schedule',word:'schedule',pronunciation:'/ˈʃed.juːl/',meaning:'日程 · 安排',example:'My schedule is full this afternoon.',translation:'我今天下午的日程排满了。',tag:'B1 · noun'},
  {id:'en-reschedule',word:'reschedule',pronunciation:'/ˌriːˈʃed.juːl/',meaning:'重新安排时间',example:'We need to reschedule the appointment.',translation:'我们需要重新安排预约时间。',tag:'B1 · verb'},
  {id:'en-appointment',word:'appointment',pronunciation:'/əˈpɔɪnt.mənt/',meaning:'预约 · 约定',example:'I have a dentist appointment on Monday.',translation:'我周一约了牙医。',tag:'B1 · noun'},
  {id:'en-deadline',word:'deadline',pronunciation:'/ˈded.laɪn/',meaning:'截止日期',example:'The deadline for the form is Friday.',translation:'表格的截止日期是周五。',tag:'B1 · noun'},
  {id:'en-requirement',word:'requirement',pronunciation:'/rɪˈkwaɪə.mənt/',meaning:'要求 · 必要条件',example:'A passport is a basic requirement.',translation:'护照是一项基本要求。',tag:'B1 · noun'},
  {id:'en-prepare',word:'prepare',pronunciation:'/prɪˈpeə/',meaning:'准备',example:'I prepared a short presentation.',translation:'我准备了一个简短的演讲。',tag:'B1 · verb'},
  {id:'en-explain',word:'explain',pronunciation:'/ɪkˈspleɪn/',meaning:'解释 · 说明',example:'Could you explain that point again?',translation:'你能再解释一下那一点吗？',tag:'B1 · verb'},
  {id:'en-compare',word:'compare',pronunciation:'/kəmˈpeə/',meaning:'比较',example:'Compare the two options before you decide.',translation:'决定前比较一下两个选项。',tag:'B1 · verb'},
  {id:'en-suggest',word:'suggest',pronunciation:'/səˈdʒest/',meaning:'建议 · 提议',example:'I suggest taking the earlier train.',translation:'我建议乘早一点的火车。',tag:'B1 · verb'},
  {id:'en-consider',word:'consider',pronunciation:'/kənˈsɪd.ə/',meaning:'考虑',example:'Please consider all the information.',translation:'请考虑所有信息。',tag:'B1 · verb'},
  {id:'en-decision',word:'decision',pronunciation:'/dɪˈsɪʒ.ən/',meaning:'决定',example:'It was a difficult decision.',translation:'这是个艰难的决定。',tag:'B1 · noun'},
  {id:'en-opportunity',word:'opportunity',pronunciation:'/ˌɒp.əˈtjuː.nə.ti/',meaning:'机会',example:'The course is a good opportunity to practise.',translation:'这门课是练习的好机会。',tag:'B1 · noun'},
  {id:'en-challenge',word:'challenge',pronunciation:'/ˈtʃæl.ɪndʒ/',meaning:'挑战 · 难题',example:'Speaking in public is a challenge for me.',translation:'当众讲话对我来说是个挑战。',tag:'B1 · noun'},
  {id:'en-improve',word:'improve',pronunciation:'/ɪmˈpruːv/',meaning:'改进 · 提高',example:'Regular practice can improve your confidence.',translation:'经常练习能提高你的信心。',tag:'B1 · verb'},
  {id:'en-progress',word:'progress',pronunciation:'/ˈprəʊ.ɡres/',meaning:'进步 · 进展',example:'You have made steady progress.',translation:'你取得了稳步进步。',tag:'B1 · noun'},
  {id:'en-confidence',word:'confidence',pronunciation:'/ˈkɒn.fɪ.dəns/',meaning:'信心',example:'Small successes build confidence.',translation:'小小的成功会建立信心。',tag:'B1 · noun'},
  {id:'en-habit',word:'habit',pronunciation:'/ˈhæb.ɪt/',meaning:'习惯',example:'Reading every day became a habit.',translation:'每天阅读成了习惯。',tag:'B1 · noun'},
  {id:'en-reliable',word:'reliable',pronunciation:'/rɪˈlaɪ.ə.bəl/',meaning:'可靠的',example:'We need a reliable source of information.',translation:'我们需要可靠的信息来源。',tag:'B1 · adjective'},
  {id:'en-source',word:'source',pronunciation:'/sɔːs/',meaning:'来源 · 资料来源',example:'What is the source of this information?',translation:'这条信息的来源是什么？',tag:'B1 · noun'},
  {id:'en-evidence',word:'evidence',pronunciation:'/ˈev.ɪ.dəns/',meaning:'证据 · 依据',example:'Is there evidence to support that claim?',translation:'有证据支持那个说法吗？',tag:'B1 · noun'},
  {id:'en-solution',word:'solution',pronunciation:'/səˈluː.ʃən/',meaning:'解决办法',example:'Together, we found a simple solution.',translation:'我们一起找到了一个简单的解决办法。',tag:'B1 · noun'},
  {id:'en-support',word:'support',pronunciation:'/səˈpɔːt/',meaning:'支持 · 帮助',example:'My friends supported me during the move.',translation:'搬家期间，朋友们帮助了我。',tag:'B1 · verb'},
  {id:'en-recommend',word:'recommend',pronunciation:'/ˌrek.əˈmend/',meaning:'推荐',example:'Can you recommend a good book?',translation:'你能推荐一本好书吗？',tag:'B1 · verb'},
  {id:'en-manage',word:'manage',pronunciation:'/ˈmæn.ɪdʒ/',meaning:'设法做到 · 管理',example:'I managed to finish before the deadline.',translation:'我设法在截止日期前完成了。',tag:'B1 · verb'},
  {id:'en-avoid',word:'avoid',pronunciation:'/əˈvɔɪd/',meaning:'避免',example:'I avoid checking my phone while studying.',translation:'学习时我尽量不看手机。',tag:'B1 · verb'},
  {id:'en-achieve',word:'achieve',pronunciation:'/əˈtʃiːv/',meaning:'实现 · 达到',example:'She achieved her goal after months of practice.',translation:'经过几个月的练习，她实现了目标。',tag:'B1 · verb'},
  {id:'en-reflect',word:'reflect',pronunciation:'/rɪˈflekt/',meaning:'反思 · 反映',example:'Take a moment to reflect on what you learned.',translation:'花点时间回顾所学的内容。',tag:'B1 · verb'}
 ]
};

export const extraGrammar:Record<Language,GrammarLesson[]>={
 ja:[
  {id:'grammar-ja-you-ni',level:'N3',title:'〜ようにする',meaning:'尽量做到…… · 养成……习惯',structure:['动词辞书形 + ようにする','动词ない形 + ようにする'],explanation:'表示有意识地努力改变行为，常用于日常习惯。与「ようになる」表示自然发生的变化不同，「ようにする」强调自己的选择与努力。',example:'毎日、日本語のニュースを読むようにしています。',translation:'我尽量每天读日语新闻。',question:'健康のために、早く寝る＿＿＿。',options:['ようにしています','ことになりました','わけではありません'],answer:0,insight:'「読むようにする」是努力去读；「読めるようになる」是变得能够读。'},
  {id:'grammar-ja-tame-ni',level:'N3',title:'〜ために',meaning:'为了…… · 因为……',structure:['动词辞书形 + ために（目的）','名词 + の + ために（目的或原因）'],explanation:'说目的时，前后动作的主语通常相同，后句多是有意志的行动。它也可表示客观原因，需结合上下文判断。',example:'試験に合格するために、毎日練習しています。',translation:'为了通过考试，我每天都练习。',question:'日本語を上達させる＿＿＿、会話の練習をしています。',options:['ために','わけではない','たびに'],answer:0},
  {id:'grammar-ja-tabi-ni',level:'N3',title:'〜たびに',meaning:'每当……就……',structure:['动词辞书形 + たびに','名词 + の + たびに'],explanation:'表示某件事每次发生，另一件事也随之发生。适合描述反复出现的经验或感受。',example:'この写真を見るたびに、旅行を思い出します。',translation:'每次看到这张照片，我都会想起那次旅行。',question:'この歌を聞く＿＿＿、子どものころを思い出します。',options:['たびに','ために','ように'],answer:0}
 ],
 en:[
  {id:'grammar-en-conditionals',level:'B1',title:'First conditional',meaning:'谈有可能发生的未来结果',structure:['If + present simple, will + base verb','Will + base verb + if + present simple'],explanation:'用现在时说明未来的条件，用 will 表达可能的结果。if 从句通常不用 will。',example:'If I finish early, I will call you.',translation:'如果我提前完成，就会给你打电话。',question:'If it rains tomorrow, we ____ at home.',options:['will stay','stay yesterday','would stayed'],answer:0,insight:'If it rains 是未来条件，动词仍用一般现在时。'},
  {id:'grammar-en-passive',level:'B1',title:'The passive voice',meaning:'突出动作或结果，而非执行者',structure:['Subject + be + past participle','The report was sent yesterday.'],explanation:'当执行者未知、不重要，或重点是接受动作的人和事物时使用被动语态。时态由 be 的形式体现。',example:'The meeting was moved to Friday.',translation:'会议改到了周五。',question:'The documents ____ by email yesterday.',options:['were sent','was send','sent are'],answer:0},
  {id:'grammar-en-relative',level:'B1',title:'Relative clauses',meaning:'用从句补充说明人或事物',structure:['person + who + clause','thing + that / which + clause'],explanation:'关系从句紧跟它描述的名词。who 通常指人；which 指物；that 在限定性从句中常可指人或物。',example:'This is the book that helped me learn English.',translation:'这就是帮助我学习英语的那本书。',question:'The teacher ____ helped me was very patient.',options:['who','where','when'],answer:0}
 ]
};

export const extraArticles:Record<Language,ReadingArticle[]>={
 ja:[
  {id:'article-ja-library',title:'図書館で見つけた新しい習慣',subtitle:'在图书馆养成的新习惯',category:'学び / LEARNING',level:'N3',paragraphs:['仕事の帰りに、駅の近くの図書館へ寄るようにしています。家ではスマートフォンを見てしまいますが、図書館では落ち着いて本を読めます。','最初は難しい本を選び、すぐに読むのをやめてしまいました。今は短い文章から始めています。分からない言葉を全部調べるわけではありません。まず内容を楽しむことが大切です。','毎週少しずつ続けた結果、読むことが習慣になりました。大きな目標より、今日できる小さな一歩を選ぶほうが、私には合っているようです。'],translations:['下班回家时，我会尽量去车站附近的图书馆。待在家里总忍不住看手机，但在图书馆可以静下心来读书。','一开始我选了难书，很快就放弃了。现在我从短文章开始。并不是把所有不懂的词都查一遍；先享受内容很重要。','每周坚持一点点之后，阅读成了习惯。比起宏大的目标，选择今天能做到的一小步似乎更适合我。'],question:'作者现在怎样阅读？',options:['先读短文章，重视理解内容','每个生词都立刻查','只读最难的书'],answer:0,summary:'作者通过从短文开始、每周持续阅读，在图书馆养成了适合自己的学习习惯。'},
  {id:'article-ja-trip',title:'予定を変えた週末の旅',subtitle:'一次改了计划的周末旅行',category:'旅 / TRAVEL',level:'N3',paragraphs:['週末、友人と海の近くの町へ行く予定でした。ところが、朝から雨が降っていたため、駅で予定を変更しました。','観光案内所で情報を調べて、小さな美術館を選びました。展示を見たあと、近くの店で温かい昼ご飯を食べました。店の人は町の歴史を丁寧に説明してくれました。','海は見られませんでしたが、思いがけない体験ができました。旅行は計画どおりに進まないこともあります。そのたびに、新しい風景に出会えるのかもしれません。'],translations:['周末我原计划和朋友去海边的小镇。可是早上下起雨，所以我们在车站更改了计划。','我们在游客咨询处查了信息，选了一家小美术馆。看完展览后，在附近的店吃了热午饭。店主细心地讲解了小镇的历史。','虽然没看到海，却有了意外的体验。旅行有时不会按计划进行。也许每次变化都能带来新的风景。'],question:'旅行计划为什么改变了？',options:['因为下雨','因为美术馆关门','因为朋友迟到'],answer:0,summary:'雨天打乱了海边旅行的计划，作者却在小镇的美术馆和餐馆获得了意外收获。'}
 ],
 en:[
  {id:'article-en-library',title:'A better way to practise',subtitle:'找到适合自己的练习方式',category:'LEARNING / 学习',level:'B1',paragraphs:['Maya wanted to improve her English, but her schedule was full. She decided to read for ten minutes on the train each morning. At first, she chose difficult articles and stopped after a few days.','A friend suggested shorter stories about topics Maya enjoyed. If she found an unfamiliar word, she tried to understand the sentence before looking it up. She wrote down only the words she wanted to use herself.','After a month, reading had become a habit. Maya could see her progress in the notes she had kept. She learned that a small, reliable routine was more useful to her than an ambitious plan she could not follow.'],translations:['玛雅想提高英语水平，但日程很满。她决定每天早上在火车上读十分钟。起初，她选择了难文章，几天后就停下来了。','朋友建议她读自己感兴趣主题的短故事。遇到生词时，她先试着理解整句话，再查词。她只记下自己想使用的词。','一个月后，阅读成了习惯。她能从笔记中看到进步。她发现，稳定的小习惯比无法坚持的宏大计划更适合自己。'],question:'What changed Maya’s reading habit?',options:['Choosing shorter, interesting stories','Reading for several hours','Avoiding all new words'],answer:0,summary:'Maya built a steady reading habit by choosing manageable stories and keeping useful notes.'},
  {id:'article-en-community',title:'The neighbourhood repair café',subtitle:'社区里的修理聚会',category:'COMMUNITY / 社区',level:'B1',paragraphs:['Once a month, people in my neighbourhood meet at the library to repair broken things. Some bring lamps or bicycles. Others bring clothes that need a button. Volunteers share tools and explain each step.','Last Saturday, I brought an old radio. A volunteer showed me how to check a loose wire. I could not fix it alone, but I learned something useful. While we worked, I met two neighbours I had never spoken to before.','The repair café does not solve every problem. Still, it gives people an opportunity to learn, save money and help one another. I will bring my bicycle next month—and perhaps I will be able to help someone else.'],translations:['每个月，社区居民都会在图书馆聚会，修理坏掉的东西。有些人带来台灯或自行车，另一些人带来需要钉扣子的衣服。志愿者分享工具，并讲解每一步。','上周六我带去一台旧收音机。一位志愿者教我检查松动的电线。我没法独自修好它，但学到了有用的东西。一起动手时，我认识了两位以前没交谈过的邻居。','修理聚会并不能解决所有问题，但它给大家提供了学习、省钱和互相帮助的机会。下个月我会带上自行车，也许还能帮到别人。'],question:'What is one benefit of the repair café?',options:['People learn from one another','Everything is replaced with new items','Only professionals may attend'],answer:0,summary:'A monthly repair café helps neighbours learn practical skills and build connections.'}
 ]
};

export const extraEpisodes:Record<Language,ListeningEpisode[]>={
 ja:[
  {id:'episode-ja-booking',title:'予約を変更する',description:'给诊所打电话改预约',level:'N3',lines:[{text:'お電話ありがとうございます。さくらクリニックです。',translation:'感谢来电。这里是樱花诊所。'},{text:'明日の予約について連絡しました。時間を変更できますか。',translation:'我来电是关于明天的预约。可以改时间吗？'},{text:'はい。お名前と予約の時間を教えてください。',translation:'可以。请告诉我姓名和预约时间。'},{text:'田中です。午前十時の予約です。',translation:'我姓田中，预约的是上午十点。'},{text:'午後二時でしたら空いています。ご都合はいかがですか。',translation:'下午两点有空，您方便吗？'},{text:'はい、二時でお願いします。ありがとうございます。',translation:'方便，请改到两点。谢谢。'}]},
  {id:'episode-ja-station',title:'駅で道を聞く',description:'在车站询问换乘路线',level:'N3',lines:[{text:'すみません、美術館へはどう行けばいいですか。',translation:'不好意思，去美术馆怎么走？'},{text:'この電車に乗って、次の駅で降りてください。',translation:'请坐这趟车，在下一站下车。'},{text:'そこでバスに乗り換える必要がありますか。',translation:'在那里需要换乘公交车吗？'},{text:'いいえ、駅から歩いて十分ぐらいです。',translation:'不用，从车站步行大约十分钟。'},{text:'分かりました。助かりました。',translation:'明白了。帮大忙了。'}]}
 ],
 en:[
  {id:'episode-en-booking',title:'Changing an appointment',description:'打电话重新安排预约',level:'B1',lines:[{text:'Good afternoon. Green Street Clinic. How can I help?',translation:'下午好。这里是格林街诊所。有什么可以帮您？'},{text:'I have an appointment tomorrow, but I need to reschedule it.',translation:'我明天有个预约，但需要改时间。'},{text:'Of course. Could you confirm your name, please?',translation:'当然。能请您确认一下姓名吗？'},{text:'It is Alex Chen. Is Friday morning available?',translation:'我叫 Alex Chen。周五上午有空吗？'},{text:'We have an opening at ten thirty. Would that work?',translation:'十点半有一个空档。这个时间可以吗？'},{text:'That would be great. Thank you for your help.',translation:'那太好了。谢谢您的帮助。'}]},
  {id:'episode-en-library',title:'At the library',description:'询问借书和归还日期',level:'B1',lines:[{text:'Excuse me, can I borrow this book with my library card?',translation:'请问，我能用借书证借这本书吗？'},{text:'Yes. You can keep it for three weeks.',translation:'可以，您可以借三周。'},{text:'Can I renew it online if I need more time?',translation:'如果需要更多时间，我能在线续借吗？'},{text:'Yes, unless someone else has reserved it.',translation:'可以，除非其他人已经预约了这本书。'},{text:'Great. Could you show me where to find the return date?',translation:'太好了。能告诉我在哪里查看归还日期吗？'}]}
 ]
};
