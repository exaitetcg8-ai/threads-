// 5分ワーク：毎日の提案 → 一緒に実践 → ほめる
// 内容は 04_product/21days_work.md（21日間ワーク）と同じ考え方で、5分以内に収まるよう短くしている。
M.works = (() => {
  const W = [
    // 呼吸・体
    { id: 'breath46', title: '吐く息を長くする呼吸', cat: '呼吸', why: '吐く息を長くすると、体を休ませる神経がはたらきやすくなるといわれています。', breath: true,
      steps: [['楽な姿勢で座ろう。目は閉じても、閉じなくても大丈夫。', 15], ['光の輪が大きくなったら4つ数えて吸って、小さくなったら6つ数えて吐こう。', 120], ['呼吸をふだんのリズムに戻して、体の感じを眺めてみよう。', 20]] },
    { id: 'box', title: '四角い呼吸', cat: '呼吸', why: '数えながら呼吸すると、考えごとから少しはなれやすくなります。',
      steps: [['4つ数えて吸う', 4], ['4つ数えて止める', 4], ['4つ数えて吐く', 4], ['4つ数えて止める', 4], ['これを、あと4回くり返そう。自分のペースでね。', 70], ['おしまい。ふだんの呼吸に戻ろう。', 10]] },
    { id: 'bodyscan', title: 'ミニ・ボディスキャン', cat: '体', why: '体の感覚に順番に注意を向けると、緊張に気づいてゆるめやすくなります。',
      steps: [['横になるか、楽に座ろう。', 10], ['足の先に意識を向けて。あたたかい？つめたい？そのまま感じよう。', 30], ['ふくらはぎ、ひざ、太もも。力が入っていたら、ふっとぬこう。', 35], ['おなかと胸。呼吸でふくらんで、しぼむのを感じよう。', 35], ['肩、腕、手のひら。重さを床や椅子にあずけよう。', 35], ['首、あご、おでこ。顔の力もゆるめて。', 35], ['体ぜんぶを、ひとつの呼吸で感じたら、おしまい。', 20]] },
    { id: 'shoulders', title: '肩と首のほぐし', cat: '体', why: '緊張は肩や首に出やすいもの。動かして気づくことがリセットの第一歩です。',
      steps: [['肩をぎゅっと耳に近づけて…', 5], ['ストンと落とす。これを3回。', 15], ['肩を後ろに、ゆっくり5回まわそう。', 20], ['首を右にゆっくり倒して、左の首すじを伸ばそう。痛くないところまで。', 20], ['左にも倒して、右の首すじを伸ばそう。', 20], ['両手を上に、ぐーっと伸び。', 15], ['ゆっくり下ろして、体の感じを味わおう。', 15]] },
    { id: 'shake', title: 'ぶるぶるリセット', cat: '体', why: '体を小さくふるわせると、こわばったエネルギーを外に出しやすくなります。',
      steps: [['立てたら立って、座ったままでもOK。', 8], ['手首をぶらぶら、ゆらしてみよう。', 20], ['肩、ひざも一緒に、全身をぶるぶる。', 30], ['ゆっくり止めて、じんわりする感じを味わおう。', 25], ['深呼吸を1回。おしまい。', 10]] },
    { id: 'eyesrest', title: '目のおやすみ', cat: '体', why: '画面を見続けた目と脳を休ませると、刺激の量がへります。',
      steps: [['手のひらをこすって、あたためよう。', 15], ['あたたかい手を、目にそっとかぶせて。真っ暗を感じよう。', 45], ['手をはなして、窓の外か部屋の一番遠いところを見よう。', 30], ['ゆっくりまばたきを10回。', 20], ['おしまい。目、ありがとう。', 8]] },
    { id: 'water', title: 'お水をゆっくり一杯', cat: '体', why: 'こまめな水分は、体調と集中のささえになります。ゆっくり飲むことで、今ここにも戻れます。',
      steps: [['お水かお茶を用意しよう。', 30], ['コップの重さ、温度を感じてみよう。', 15], ['ひとくちずつ、のどを通る感じを味わいながら飲もう。', 60], ['飲みおわったら、「ありがとう」って体に伝えよう。', 10]] },
    { id: 'sunlight', title: '光をあびる', cat: '体', why: '朝の光は、眠りと目覚めのリズムを整える助けになるといわれています。',
      steps: [['カーテンを開けるか、窓の近くに行こう。', 20], ['外の明るさを、目を細めながら感じよう。直接太陽は見ないでね。', 60], ['空の色、雲の形をひとつ見つけてみよう。', 40], ['深呼吸を1回。おしまい。', 10]] },
    // 今ここ・マインドフルネス
    { id: 'grounding54321', title: '5・4・3・2・1', cat: '今ここ', why: '五感で今を数えると、不安なぐるぐるから注意を戻しやすくなります。',
      steps: [['見えるものを5つ、心の中で名前を言おう。', 40], ['聞こえる音を4つ、さがしてみよう。', 40], ['触れているものを3つ感じよう。服、椅子、床…', 30], ['においを2つ。なければ、好きなにおいを思い出して。', 25], ['味をひとつ。口の中の感じでもいいよ。', 20], ['今ここに戻ってこられたね。', 8]] },
    { id: 'meditation3', title: '3分のマインドフルネス', cat: '今ここ', why: '心がさまよったことに気づいて戻る練習は、それ自体が練習の中心です。',
      steps: [['足の裏を床につけて、背中を楽にしよう。', 15], ['呼吸を1から10まで数えよう。数を忘れたら、責めずに1に戻ってね。', 150], ['ゆっくり目を開けよう。考えごとに流れた回数だけ、気づけたってことだよ。', 15]] },
    { id: 'soundbath', title: '音のマインドフルネス', cat: '今ここ', why: '音にただ耳を向けると、考えから感覚に注意を移せます。好きな音は、体からゆるめる助けになります。', music: true,
      steps: [['澪音がやさしい音を流すね。目を閉じて聴いてみよう。', 15], ['いちばん近くの音、いちばん遠くの音をさがしてみよう。', 60], ['音が生まれて、消えていくのを眺めよう。いい・わるいをつけずに。', 70], ['体のどこかがゆるんでいたら、そこを感じよう。', 30], ['ゆっくり目を開けて、おしまい。', 10]] },
    { id: 'tea', title: 'あたたかい一杯を味わう', cat: '今ここ', why: '五感を使って味わうことは、日常でできるマインドフルネスです。',
      steps: [['あたたかい飲み物を用意しよう。', 40], ['湯気と香りを、ゆっくり感じよう。', 30], ['ひとくち含んで、温度と味を感じよう。', 40], ['飲みこむとき、体があたたまっていくのを感じよう。', 30], ['おいしかったね。おしまい。', 8]] },
    { id: 'cloudwatch', title: '空をながめる', cat: '今ここ', why: '遠くや広いものを見る時間は、こまかい刺激から目と心を休ませます。',
      steps: [['窓の外か、空の写真を見よう。', 15], ['雲や光の動きを、ただ眺めよう。', 90], ['浮かんできた考えも、雲みたいに流してみよう。', 60], ['おしまい。ゆっくり戻ってきてね。', 10]] },
    // 気持ち
    { id: 'labeling', title: '気持ちに名前をつける', cat: '気持ち', why: '感情を言葉にすると、感情の強さがやわらぐことが研究で報告されています。',
      steps: [['今の気持ちを、ひとことで言うと？心の中で答えてみよう。', 30], ['それは体のどこで感じる？胸？おなか？のど？', 30], ['その気持ちに、「〇〇がいるね」って声をかけてあげよう。', 30], ['気持ちの強さは、0〜10でいくつ？', 20], ['名前をつけられたね。それだけで十分だよ。', 8]] },
    { id: 'selfcompassion', title: 'セルフ・コンパッション', cat: '気持ち', why: '自分にやさしく接することは、落ちこみや不安をやわらげる助けになるとされています。',
      steps: [['胸にそっと手をあてよう。', 10], ['心の中で「今、わたしはつらい」と言ってみよう。', 25], ['「つらいのは、わたしだけじゃない」と言ってみよう。', 25], ['「わたしが、わたしにやさしくできますように」と言ってみよう。', 25], ['手のあたたかさを、もう少しだけ感じよう。', 30], ['おしまい。やさしくできたね。', 8]] },
    { id: 'goodthings3', title: 'よかったことを3つ', cat: '気持ち', why: 'よかったことを書く習慣は、幸福感を高めやすいことが報告されています。', note: true,
      steps: [['今日（か昨日）のよかったことを1つ思い出そう。', 45], ['もう1つ。ほんの小さなことでいいよ。', 45], ['3つめ。それが起きた理由も考えてみよう。', 60], ['メモに書いておくと、あとで見返せるよ。', 15]] },
    { id: 'expressive', title: '気持ちの書き出し', cat: '気持ち', why: '気持ちを書き出すと、頭の中のぐるぐるが整理されやすくなります。', note: true,
      steps: [['メモか紙を用意しよう。だれにも見せなくていいよ。', 15], ['今の気持ちを、きれいにまとめずにそのまま書こう。', 180], ['書いたものを、ちょっと離れて眺めよう。', 30], ['書けたね。紙なら破っても、とっておいてもいいよ。', 10]] },
    { id: 'reframe', title: '別の見方をさがす', cat: '気持ち', why: '考えを「事実」ではなく「ひとつの見方」として眺めるのは、認知行動療法の基本です。',
      steps: [['最近ひっかかっている考えを、ひとつ思い浮かべよう。', 30], ['その考えを支える事実と、そうじゃない事実を考えてみよう。', 60], ['友だちが同じことを言っていたら、なんて声をかける？', 60], ['少しだけやわらかい考え方を、ひとつ作ってみよう。', 45], ['おしまい。見方がひとつ増えたね。', 8]] },
    { id: 'namecall', title: '自分を名前で呼ぶ', cat: '気持ち', why: '自分を名前で呼んで考えると、少し距離をとって落ち着いて考えやすくなるといわれています。',
      steps: [['今の悩みをひとつ思い浮かべよう。', 20], ['「{name}は、今なにに困ってる？」と、名前で問いかけてみよう。', 50], ['「{name}は、どうしたら少し楽になる？」と聞いてみよう。', 60], ['出てきた答えを、やさしく受けとろう。', 30], ['おしまい。', 8]] },
    { id: 'lettertoself', title: '未来の自分への手紙', cat: '気持ち', why: '未来の自分を思い描くと、今の自分を大事にしやすくなります。', note: true,
      steps: [['1年後の自分を思い浮かべよう。どんな場所で、どんな顔をしてる？', 40], ['その自分に、今のことを短く伝えてみよう。', 90], ['最後に「待っててね」か「ありがとう」をつけよう。', 30], ['すてきな手紙になったね。', 8]] },
    { id: 'worrybox', title: '心配ごとの箱', cat: '気持ち', why: '心配する時間を決めておくと、ほかの時間に心配が入りこみにくくなることがあります。', note: true,
      steps: [['気になっていることを、メモに書き出そう。', 90], ['それぞれ「今できること」「今はできないこと」に分けよう。', 60], ['できないことは、「心配ごとの箱」にしまうイメージをしよう。', 30], ['箱をあける時間を決めよう。今夜の15分、とか。', 20], ['おしまい。箱の中はしばらくおやすみ。', 8]] },
    { id: 'tomorrowbox', title: '明日の箱', cat: '気持ち', why: '寝る前に気がかりを書き出すと、眠りに入りやすくなったという研究があります。', note: true,
      steps: [['明日やること、気になることを書き出そう。', 90], ['書いたものに「明日の自分にまかせた」と言おう。', 20], ['深呼吸を3回。吐く息を長くね。', 40], ['おやすみの準備ができたね。', 8]] },
    // 整える
    { id: 'braindump', title: '頭の中を全部出す', cat: '整える', why: '頭の中の「やらなきゃ」を外に出すと、作業記憶に余白がうまれます。', note: true,
      steps: [['メモを開こう。', 10], ['頭にあること、やること、気になること、ぜんぶ書き出そう。順番はバラバラでいいよ。', 180], ['書けたら、その中で「今日やる」を1つだけ選ぼう。', 40], ['よくできました。頭が少し軽くなったかな。', 8]] },
    { id: 'onething', title: '今日のひとつを決める', cat: '整える', why: 'やることを1つにしぼると、始めるハードルが下がります。',
      steps: [['今日やりたいこと、やらなきゃいけないことを思い浮かべよう。', 40], ['その中から、1つだけ選ぼう。いちばん小さくてもいいよ。', 40], ['それをもっと小さく分けると、最初の一歩はなに？', 50], ['やることリストに入れておこう。できたら花丸だよ。', 20]] },
    { id: 'tidy', title: '机の上をひとつ片づける', cat: '整える', why: '目に入るものが少ないほど、刺激がへって集中しやすくなります。',
      steps: [['机の上を見わたそう。', 10], ['今使わないものを、ひとつだけ片づけよう。', 60], ['もうひとつ、いけそうならどうぞ。むりならここまで。', 60], ['すっきりしたところを眺めよう。おしまい。', 10]] },
    { id: 'boundary', title: '心の境界線', cat: '整える', why: '自分と相手の気持ちを分けて考えることは、共感疲れを防ぐ助けになります。',
      steps: [['最近、気をつかった相手を思い浮かべよう。', 30], ['その人の気持ちは、その人のもの。自分の気持ちは、自分のもの。線を引くイメージをしよう。', 60], ['線のこちら側の、自分の気持ちを感じてみよう。', 45], ['「わたしはわたしを大切にしていい」と心の中で言ってみよう。', 20], ['おしまい。', 8]] },
    { id: 'comfortmap', title: '心地よさを集める', cat: '整える', why: '自分の回復のしかたを知っておくと、疲れたときにすぐ使えます。', note: true,
      steps: [['ほっとする音を3つ思い浮かべよう。', 40], ['ほっとする場所、もの、香りを3つ。', 50], ['ほっとする人や、言葉を1つ。', 40], ['メモに残しておくと、つらいときの道具箱になるよ。', 20]] },
    { id: 'playlist', title: 'じぶんのための3曲', cat: '整える', why: '好きな音楽は、気分を整えるのに役立つことが知られています。', note: true,
      steps: [['気分を上げたいときの1曲を思い浮かべよう。', 40], ['落ち着きたいときの1曲を思い浮かべよう。', 40], ['眠る前の1曲を思い浮かべよう。', 40], ['メモに残しておこう。いつでも聴けるように。', 20]] },
    { id: 'walk', title: '緑と音の散歩', cat: '整える', why: '自然の中で過ごす時間は、気分の回復に役立つことが報告されています。',
      steps: [['外に出られそうなら、少しだけ歩こう。むりなら窓の外の緑を見るだけでOK。', 30], ['葉っぱや空、植物の色をさがしてみよう。', 100], ['聞こえる自然の音を、ひとつ見つけよう。', 60], ['ゆっくり戻ろう。おかえり。', 10]] },
    { id: 'smile', title: 'やさしい表情をつくる', cat: '体', why: '顔や体の力をぬくと、気持ちもやわらぎやすくなります。',
      steps: [['おでこの力をぬいて、眉のあいだを広げよう。', 15], ['あごの力をぬいて、奥歯をはなそう。', 15], ['口角をほんの少しだけ上げてみよう。', 20], ['その表情のまま、3回呼吸しよう。', 30], ['おしまい。いい顔だったよ。', 8]] },
  ];

  // ほめ言葉：3つの部品で組み合わせる（15×15×12 = 2700通り）
  const PR_A = ['よくできました！', 'やったね、{name}！', 'おつかれさま！', 'できたね！', 'すてき！', 'えらい、えらい！', 'わあ、さいごまでできたね。', 'ちゃんと時間をとれたね。',
    'ゆっくりできたね。', 'ありがとう、一緒にやってくれて。', '今日もひとつ、自分を大切にできたね。', 'いい時間だったね。', 'ナイス♪', 'お見事！', '花丸だよ。'];
  const PR_B = ['自分のために5分を使えたのは、すごく大事なことだよ。', 'やってみようって思えた気持ちが、もう立派だよ。', '体も心も、きっとよろこんでるよ。',
    '途中で考えごとに流れても大丈夫。戻ってこられたのがえらいんだ。', '小さなケアの積み重ねが、心地よさをつくるんだって。', 'あなたのペースでできたのが、いちばんいいところ。',
    '今の感じを、少しだけ覚えておいてね。', 'できた日があることが、あなたの味方になるよ。', '水がゆっくり流れるみたいに、心も少し流れたかな。',
    '自分にやさしくする練習、ちゃんとできてるよ。', '休むのが上手になってきたね。', '今日のあなたに、拍手をおくるね。', '繊細さんのためのケアを、ちゃんと選べたね。',
    'あなたがあなたを大事にする姿、すてきだよ。', 'わたしもとなりで、心がほどけたよ。'];
  const PR_C = ['このあとは、好きにすごしてね。', 'また気が向いたら、一緒にやろうね。', '今日はもう、これだけで十分だよ。', 'お水を一杯どうぞ。', 'ゆっくり戻ってきてね。',
    '明日もやらなきゃ、なんて思わなくていいからね。', 'スタンプ、押しておいたよ♪', 'いい音色が聞こえてきそう。', '自由に、心地よく、ね。', 'ここにいるからね。',
    '今の気持ちも、教えてくれたらうれしいな。', 'ふふ、えらかったね。'];

  let run = null;

  const get = (id) => W.find((w) => w.id === id);

  // 今日のおすすめ：日付で決まり、時間帯と気分も少し考える
  function suggest(offset) {
    const s = M.store.get();
    const tod = M.timeOfDay();
    const lastMood = s.moods.length ? s.moods[s.moods.length - 1].m : null;
    let pool = W.slice();
    if (tod === 'night') pool = pool.filter((w) => !['sunlight', 'walk'].includes(w.id));
    if (tod === 'morning') pool = pool.filter((w) => !['tomorrowbox'].includes(w.id));
    if (lastMood === 'rain' || lastMood === 'storm') pool = pool.filter((w) => ['呼吸', '体', '気持ち', '今ここ'].includes(w.cat));
    const rnd = M.seeded(M.today() + ':' + (offset || 0));
    return pool[Math.floor(rnd() * pool.length)];
  }

  let offset = 0;
  function renderToday() {
    const w = suggest(offset);
    const box = M.$('#workToday');
    const doneToday = (M.store.get().worksByDay[M.today()] || []).length;
    box.innerHTML = '';
    box.append(
      M.el('div', { class: 'tiny muted', text: doneToday ? `今日は ${doneToday} 回できたよ。もう十分すぎるくらい。` : '今日の5分ワークの提案' }),
      M.el('h4', { text: w.title }),
      M.el('div', { class: 'why', text: w.why }),
      M.el('div', { class: 'tiny muted', text: `${w.cat}・約${Math.ceil(total(w) / 60)}分` }),
      M.el('div', { class: 'btns' },
        M.el('button', { class: 'btn', type: 'button', text: 'やってみる', onclick: () => start(w.id) }),
        M.el('button', { class: 'btn ghost', type: 'button', text: 'ちがうのにする', onclick: () => { offset++; renderToday(); } }),
        M.el('button', { class: 'btn ghost', type: 'button', text: '今日はやめておく', onclick: () => { M.voice.say(M.pick(['うん、それも大事な選択だよ。', 'やらない日があっても大丈夫。ゆっくりしてね。', 'わかった。今日は休むのがワークだね。']), 'smile'); } }),
      ),
    );
  }

  const total = (w) => w.steps.reduce((n, s) => n + s[1], 0);

  function renderList() {
    const box = M.$('#workList');
    box.innerHTML = '';
    W.forEach((w) => box.append(M.el('button', { class: 'pick', type: 'button', onclick: () => start(w.id) },
      M.el('b', { text: w.title }), M.el('small', { text: w.why }), M.el('span', { class: 'tag', text: `${w.cat}・約${Math.ceil(total(w) / 60)}分` }))));
  }

  function start(id) {
    const w = get(id);
    if (!w) return;
    M.app.showTab('work');
    stop(true);
    run = { w, i: 0, left: w.steps[0][1], paused: false, timer: null, breathTimer: null };
    M.$('#workToday').hidden = true;
    const box = M.$('#workRun');
    box.hidden = false;
    box.innerHTML = '';
    box.append(...[
      M.el('div', { class: 'tiny muted', text: w.cat }),
      M.el('h3', { text: w.title }),
      w.breath ? M.el('div', { class: 'breath', id: 'breathOrb' }) : null,
      M.el('div', { class: 'work-step', id: 'workStep' }),
      M.el('div', { class: 'progress' }, M.el('i', { id: 'workBar' })),
      M.el('div', { class: 'tiny muted', id: 'workLeft' }),
      M.el('div', { class: 'btns pomo-btns' },
        M.el('button', { class: 'btn ghost', type: 'button', id: 'workPause', text: '一時停止', onclick: togglePause }),
        M.el('button', { class: 'btn ghost', type: 'button', text: '次へ', onclick: next }),
        M.el('button', { class: 'btn ghost', type: 'button', text: 'ここでおわる', onclick: () => finish(true) }),
      ),
    ].filter(Boolean));
    if (w.music && !M.audio.playing) { M.audio.playMusic(4); M.focus.syncMusicUI(); run.startedMusic = true; }
    M.chara.setExp('calm');
    showStep();
    run.timer = setInterval(tick, 1000);
  }

  function showStep() {
    const [text] = run.w.steps[run.i];
    M.$('#workStep').textContent = M.fill(text);
    M.voice.say(text, 'calm');
    if (run.w.breath && run.i === 1) startBreath(); else stopBreath();
    updateBar();
  }

  function startBreath() {
    const orb = M.$('#breathOrb');
    if (!orb) return;
    let inhale = true;
    const cycle = () => {
      orb.className = 'breath ' + (inhale ? 'in' : 'out');
      M.$('#workStep').textContent = inhale ? '吸って… 1・2・3・4' : '吐いて… 1・2・3・4・5・6';
      run.breathTimer = setTimeout(() => { inhale = !inhale; cycle(); }, inhale ? 4000 : 6000);
    };
    cycle();
  }
  function stopBreath() { if (run && run.breathTimer) clearTimeout(run.breathTimer); }

  function updateBar() {
    const all = total(run.w);
    const done = run.w.steps.slice(0, run.i).reduce((n, s) => n + s[1], 0) + (run.w.steps[run.i][1] - run.left);
    M.$('#workBar').style.width = Math.min(100, done / all * 100) + '%';
    M.$('#workLeft').textContent = `のこり ${M.fmtTime(all - done)}`;
  }

  function tick() {
    if (!run || run.paused) return;
    run.left--;
    if (run.left <= 0) return next();
    updateBar();
  }

  function next() {
    if (!run) return;
    stopBreath();
    run.i++;
    if (run.i >= run.w.steps.length) return finish(false);
    run.left = run.w.steps[run.i][1];
    showStep();
  }

  function togglePause() {
    run.paused = !run.paused;
    M.$('#workPause').textContent = run.paused ? 'つづける' : '一時停止';
    if (run.paused) stopBreath(); else if (run.w.breath && run.i === 1) startBreath();
  }

  function stop(silent) {
    if (!run) return;
    clearInterval(run.timer);
    stopBreath();
    if (run.startedMusic) { M.audio.stopMusic(); M.focus.syncMusicUI(); }
    run = null;
    if (!silent) M.voice.stop();
  }

  function praise() {
    return [M.pickFresh('pa', PR_A, 6), M.pickFresh('pb', PR_B, 6), M.pickFresh('pc', PR_C, 5)].join('\n');
  }

  function finish(early) {
    const w = run.w;
    stop(true);
    const s = M.store.get();
    const day = M.today();
    s.worksByDay[day] = s.worksByDay[day] || [];
    s.worksByDay[day].push(w.id);
    M.store.save();
    M.app.addBond(10, 'work');
    const text = early
      ? M.fill(M.pick(['途中でおわるのも、自分の声をきけた証拠だよ。', 'ここまでで十分。始めたこと自体がすてきだよ。', 'やめどきを自分で選べたね。それも大事な力。'])) + '\n' + M.fill(M.pickFresh('pc', PR_C, 5))
      : M.fill(praise());
    const box = M.$('#workRun');
    box.innerHTML = '';
    box.append(...[
      M.el('h3', { text: w.title }),
      M.el('div', { class: 'praise', text: text }),
      M.el('div', { class: 'tiny muted', text: '今の気分は？（えらばなくても大丈夫）' }),
      M.el('div', { class: 'mood-pick' }, ...M.talk.MOODS.map((m) => M.el('button', { class: 'chip', type: 'button', text: m.label, onclick: (e) => {
        M.app.addMood(m.value);
        e.target.parentNode.innerHTML = '';
        M.voice.say(M.pick(['教えてくれてありがとう。', 'うん、きろくしておくね。', 'その気分も、ちゃんと大事だよ。']), 'smile');
      } }))),
      w.note ? M.el('button', { class: 'btn ghost', type: 'button', text: 'メモを開く', onclick: () => { M.app.showTab('focus'); M.$('#memo').focus(); } }) : null,
      M.el('button', { class: 'btn', type: 'button', text: 'もどる', onclick: back }),
    ].filter(Boolean));
    M.voice.say(text, 'happy');
    M.chara.hop();
    M.log && M.log.render();
  }

  function back() {
    M.$('#workRun').hidden = true;
    M.$('#workToday').hidden = false;
    renderToday();
  }

  function init() { renderToday(); renderList(); }

  return { init, start, get, suggest, praise, W, count: () => W.length, praiseCount: () => PR_A.length * PR_B.length * PR_C.length };
})();
