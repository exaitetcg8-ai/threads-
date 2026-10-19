// 会話モード：テーマにそって、りんと一緒に気持ちを整理するガイドつきの会話
M.talk = (() => {
  const MOODS = [
    { label: '☀ はれ', value: 'sun', emoji: '☀️' },
    { label: '⛅ くもり', value: 'cloud', emoji: '⛅' },
    { label: '☂ 雨', value: 'rain', emoji: '🌧️' },
    { label: '⚡ あらし', value: 'storm', emoji: '⛈️' },
    { label: '🌙 よくわからない', value: 'moon', emoji: '🌙' },
  ];
  const v = (...arr) => arr; // 言いかえの候補

  const FLOWS = [
    {
      id: 'checkin', title: '朝のチェックイン', desc: '心の天気と、今日のちいさな目標をひとつ。', tag: '3分',
      steps: [
        { say: v('おはよう。今日の心の天気は、どれに近いかな？', '今日の心、空でいうとどんな感じ？', 'まずは今の気持ちを、天気でおしえてね。'), choices: MOODS, key: 'mood' },
        { say: (a) => ({ sun: 'はれなんだね。いい一日のはじまりだね。', cloud: 'くもりなんだね。そういう日もあるよね。', rain: '雨なんだね。今日はゆっくりいこう。', storm: 'あらしなんだね。教えてくれてありがとう。今日は自分を守る日にしよう。', moon: 'よくわからない、も立派な答えだよ。' }[a.mood] + '\n体はどう？'),
          choices: [{ label: '元気', value: '元気' }, { label: 'ふつう', value: 'ふつう' }, { label: 'ちょっと重い', value: '重い' }, { label: 'かなりつらい', value: 'つらい' }], key: 'body' },
        { say: v('今日の「これができたら十分」を、ひとつだけ決めてみよう。どんなに小さくてもいいよ。', '今日のちいさな目標をひとつ。「顔を洗う」でも立派な目標だよ。'), input: true, placeholder: '例：お水を飲む、メールを1通返す', key: 'goal' },
      ],
      end: (a) => `「${a.goal || 'ゆっくりすごす'}」だね。\nできたら、それだけで花丸。できなくても、今日を生きてるだけで十分だよ。\nやることリストにも入れておくね。`,
      after: (a) => { M.focus.addTodo(a.goal); },
    },
    {
      id: 'night', title: '夜のふりかえり', desc: 'よかったことを3つ。自分をねぎらって一日をとじる。', tag: '5分',
      steps: [
        { say: v('今日もおつかれさま。今の心の天気はどう？', '一日のおわりだね。心の天気をおしえて。'), choices: MOODS, key: 'mood' },
        { say: v('今日あった、よかったことをひとつ教えて。ほんの小さなことでいいよ。', '今日のよかったこと、1つめ。ごはんがおいしかった、とかでも。'), input: true, placeholder: '例：空がきれいだった', key: 'g1' },
        { say: v('いいね。2つめは？', 'すてき。もうひとつあるかな？'), input: true, placeholder: '思いつかなければ「なし」でOK', key: 'g2' },
        { say: v('3つめ。それが起きたのは、どうしてだと思う？', '最後の1つ。思いつかなかったら、「ここまで来た」でもいいよ。'), input: true, placeholder: '例：自分で外に出たから', key: 'g3' },
        { say: v('最後に、今日の自分にひとこと声をかけてあげて。', '今日のキミに、ねぎらいの言葉をひとつ。'), input: true, placeholder: '例：よくやったね', key: 'self' },
      ],
      end: (a) => `「${a.self || 'おつかれさま'}」。すてきな言葉だね。\nよかったことに目を向けると、少しずつ心が明るくなりやすいんだって。\n今日はもう、ゆっくり休もうね。おやすみ。`,
    },
    {
      id: 'moyamoya', title: 'もやもや整理', desc: '出来事・気持ち・考えを分けて、別の見方をさがす。', tag: '7分',
      steps: [
        { say: v('もやもやしたこと、まずは出来事だけを短く教えて。', '何があったのか、事実だけを書いてみよう。'), input: true, placeholder: '例：上司に返事をされなかった', key: 'event' },
        { say: v('そのとき、どんな気持ちになった？', 'そのときの気持ちに、名前をつけるとしたら？'),
          choices: ['不安', '悲しい', 'イライラ', 'はずかしい', 'さみしい', 'くやしい', 'あせり'].map((x) => ({ label: x, value: x })), key: 'feel' },
        { say: (a) => `「${a.feel}」の強さは、どのくらい？`, choices: [{ label: '少し', value: 30 }, { label: 'まあまあ', value: 60 }, { label: 'とても', value: 90 }], key: 'lv1' },
        { say: v('そのとき、頭の中にどんな言葉が浮かんだ？', '心の中で、どんな声がした？'), input: true, placeholder: '例：嫌われたかもしれない', key: 'thought' },
        { say: (a) => `「${a.thought}」って考えたんだね。\nもし大切な友だちが同じことを言っていたら、なんて声をかける？`, input: true, placeholder: '例：忙しかっただけかもしれないよ', key: 'alt' },
        { say: v('ほかにも、ありえそうな理由はあるかな？', '別の見方を、もうひとつ探してみよう。'), input: true, placeholder: '思いつかなければ「なし」でOK', key: 'alt2' },
        { say: (a) => `いま「${a.feel}」の強さは、どのくらいになった？`, choices: [{ label: '少し', value: 30 }, { label: 'まあまあ', value: 60 }, { label: 'とても', value: 90 }, { label: '変わらない', value: 'same' }], key: 'lv2' },
      ],
      end: (a) => {
        const down = a.lv2 !== 'same' && Number(a.lv2) < Number(a.lv1);
        return (down ? '少しだけ、ゆるんだみたいだね。' : '変わらなくても大丈夫。考えを書き出せただけで、距離がとれてるよ。') +
          `\n\n出来事：${a.event}\n考え：${a.thought}\n別の見方：${a.alt}${a.alt2 && a.alt2 !== 'なし' ? '／' + a.alt2 : ''}\n\n考えは「事実」じゃなくて「ひとつの見方」。それに気づけたキミは、すごいよ。`;
      },
    },
    {
      id: 'worry', title: '不安のとなりに', desc: '心配ごとを「できること」と「今はできないこと」に分ける。', tag: '5分',
      steps: [
        { say: v('今気になっている心配ごとを、そのまま書いてみて。', '頭の中でぐるぐるしていること、ひとつ教えて。'), input: true, placeholder: '例：来週の発表がうまくいくか', key: 'worry' },
        { say: (a) => `「${a.worry}」だね。\nそれは、今のキミが何か手を打てること？`, choices: [{ label: 'できることがある', value: 'yes' }, { label: '今はどうにもできない', value: 'no' }, { label: 'わからない', value: 'unk' }], key: 'ctrl' },
        { say: (a) => a.ctrl === 'yes' ? 'じゃあ、いちばん小さい一歩はなにかな？' : '今はどうにもできないことは、いったん「心配ごとの箱」にしまっておこう。\n箱をあけるのは、決めた時間だけ。いつにする？',
          inputIf: (a) => a.ctrl === 'yes', choicesIf: (a) => a.ctrl !== 'yes', choices: [{ label: '今夜の15分', value: '今夜の15分' }, { label: '明日の朝', value: '明日の朝' }, { label: '週末', value: '週末' }], placeholder: '例：資料のファイルを開く', key: 'next' },
      ],
      end: (a) => a.ctrl === 'yes'
        ? `「${a.next}」だね。やることリストに入れておくよ。\n一歩が決まると、不安は少しだけ小さくなるんだって。`
        : `「${a.next}」に、箱をあけようね。それまでは、心配ごとは箱の中でおやすみ。\nもし浮かんできたら「あとでね」って声をかけてあげて。`,
      after: (a) => { if (a.ctrl === 'yes') M.focus.addTodo(a.next); },
    },
    {
      id: 'compassion', title: 'セルフ・コンパッション', desc: '自分を責めてしまう日に。やさしい3つのステップ。', tag: '4分',
      steps: [
        { say: v('今、自分を責めてしまっていることはある？短くでいいよ。', 'うまくいかなくて、自分にきびしくなってることを教えて。'), input: true, placeholder: '例：ミスをしてしまった', key: 'pain' },
        { say: v('胸に手をあてて、心の中で言ってみよう。\n「今、わたしはつらい」\n言えたら「言えた」を押してね。'), choices: [{ label: '言えた', value: 1 }], key: 's1' },
        { say: v('次はこれ。\n「つらいのは、わたしだけじゃない。人はみんな、うまくいかない日がある」'), choices: [{ label: '言えた', value: 1 }], key: 's2' },
        { say: v('最後に、自分にやさしい言葉をかけてあげて。\n大切な友だちに言うみたいに。'), input: true, placeholder: '例：よくがんばってるよ', key: 'kind' },
      ],
      end: (a) => `「${a.kind}」。\nその言葉、ちゃんとキミに届いてるよ。\n自分へのやさしさは、甘えじゃなくて、また歩きだすための力なんだって。`,
    },
    {
      id: 'boundary', title: '心の境界線', desc: '相手の気持ちと自分の気持ちを分けて、やさしい断り方をつくる。', tag: '5分',
      steps: [
        { say: v('最近、気をつかいすぎた相手や場面はある？', 'どんな場面で、つい自分をあとまわしにしちゃう？'), input: true, placeholder: '例：同僚に仕事を頼まれた', key: 'scene' },
        { say: v('そのとき、本当はどうしたかった？心の中だけで、正直に。'), input: true, placeholder: '例：今日は断りたかった', key: 'want' },
        { say: v('じゃあ、やさしい断り方をつくってみよう。どの形がしっくりくる？'),
          choices: [
            { label: '感謝＋理由＋代わり案', value: '声をかけてくれてありがとう。今日は手がいっぱいだから、明日の午後ならできるよ。' },
            { label: 'すぐ答えない', value: '確認してから、あとで返事してもいい？' },
            { label: 'シンプルに', value: 'ごめんね、今回はやめておくね。' },
          ], key: 'phrase' },
      ],
      end: (a) => `たとえば、こんなふうに。\n「${a.phrase}」\n\n断るのは、相手を大事にしないことじゃないよ。キミを大事にすることなんだ。\n使えそうなら、メモにも残しておくね。`,
      after: (a) => { M.focus.appendMemo('断りフレーズ：' + a.phrase); },
    },
    {
      id: 'stimulus', title: '刺激のふりかえり', desc: '今日疲れた刺激と、回復した刺激を見つける。', tag: '4分',
      steps: [
        { say: v('今日、疲れたなって感じた刺激はなにかな？', '音・光・におい・人…今日しんどかった刺激はある？'),
          choices: ['音', '光', 'におい', '人の多さ', '会話', '画面', '予定の多さ', 'とくにない'].map((x) => ({ label: x, value: x })), key: 'tire' },
        { say: v('反対に、ほっとした刺激は？'),
          choices: ['好きな音楽', '静けさ', 'あたたかい飲み物', '自然', 'やわらかいもの', 'ひとりの時間', '誰かとの会話', 'とくにない'].map((x) => ({ label: x, value: x })), key: 'heal' },
        { say: v('明日、疲れる刺激をひとつだけへらすとしたら、どんな工夫ができそう？'), input: true, placeholder: '例：イヤホンを持っていく', key: 'idea' },
      ],
      end: (a) => `疲れた刺激：${a.tire}\nほっとした刺激：${a.heal}\n明日の工夫：${a.idea}\n\n自分の「疲れる」と「回復する」を知っていることは、繊細さんの一番の味方だよ。`,
    },
    {
      id: 'goodnight', title: 'おやすみ前のおしゃべり', desc: '考えごとを箱にしまって、眠る準備をする。', tag: '3分',
      steps: [
        { say: v('こんばんは。眠る前に、頭に残っていることはある？', 'ふとんに入る前に、気になってることを置いていこう。'), input: true, placeholder: 'なければ「なし」でOK', key: 'left' },
        { say: (a) => (a.left && a.left !== 'なし' ? `「${a.left}」は、明日の自分にあずけておこうね。` : '頭の中、すっきりしてるみたいだね。') + '\n一緒に、ゆっくり3回呼吸しよう。吸って……吐いて……。終わったら押してね。', choices: [{ label: 'できた', value: 1 }], key: 'b' },
      ],
      end: () => '今日もここまで、おつかれさま。\n眠れなくても、横になって休めたら十分だよ。\nおやすみ、{name}。',
    },
  ];

  let flow = null, idx = 0, answers = {};

  function renderMenu() {
    const box = M.$('#talkMenu');
    box.innerHTML = '';
    FLOWS.forEach((f) => box.append(M.el('button', { class: 'pick', type: 'button', onclick: () => start(f.id) },
      M.el('b', { text: f.title }), M.el('small', { text: f.desc }), M.el('span', { class: 'tag', text: f.tag }))));
  }

  function start(id) {
    flow = FLOWS.find((f) => f.id === id);
    idx = 0; answers = {};
    M.$('#talkMenu').hidden = true;
    M.$('#talkRun').hidden = false;
    M.$('#talkTitle').textContent = flow.title;
    M.$('#talkLog').innerHTML = '';
    step();
  }

  function sayText(s) {
    if (typeof s === 'function') return s(answers);
    return Array.isArray(s) ? M.pick(s) : s;
  }

  function step() {
    const s = flow.steps[idx];
    const log = M.$('#talkLog');
    if (!s) return finish();
    const text = sayText(s.say);
    M.dialogue.addMsg('ai', text, log);
    M.voice.say(text, 'smile');
    const chips = M.$('#talkChips');
    chips.innerHTML = '';
    const form = M.$('#talkForm');
    const useInput = s.inputIf ? s.inputIf(answers) : s.input && !s.choicesIf;
    const useChoices = s.choicesIf ? s.choicesIf(answers) : !!s.choices;
    form.hidden = !useInput;
    if (useInput) {
      const input = M.$('#talkInput');
      input.value = '';
      input.placeholder = s.placeholder || '';
      input.focus({ preventScroll: true });
    }
    if (useChoices) {
      s.choices.forEach((c) => chips.append(M.el('button', { class: 'chip', type: 'button', text: c.label, onclick: () => answer(c.value, c.label) })));
    }
    chips.append(M.el('button', { class: 'chip', type: 'button', text: 'とばす', onclick: () => answer('', 'とばす') }));
  }

  function answer(value, label) {
    const s = flow.steps[idx];
    answers[s.key] = value;
    M.dialogue.addMsg('me', String(label), M.$('#talkLog'));
    if (s.key === 'mood' && value) M.app.addMood(value);
    idx++;
    setTimeout(step, 400);
  }

  function finish() {
    const text = flow.end(answers);
    M.dialogue.addMsg('ai', M.fill(text), M.$('#talkLog'));
    M.voice.say(text, 'happy');
    M.chara.hop();
    if (flow.after) flow.after(answers);
    M.app.addBond(5, 'talk');
    M.$('#talkForm').hidden = true;
    const chips = M.$('#talkChips');
    chips.innerHTML = '';
    chips.append(M.el('button', { class: 'chip', type: 'button', text: 'ほかのテーマを選ぶ', onclick: exit }));
    chips.append(M.el('button', { class: 'chip', type: 'button', text: '5分ワークをやってみる', onclick: () => M.app.showTab('work') }));
  }

  function exit() {
    flow = null;
    M.$('#talkMenu').hidden = false;
    M.$('#talkRun').hidden = true;
  }

  function init() {
    renderMenu();
    M.$('#talkExit').addEventListener('click', exit);
    M.$('#talkForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const t = M.$('#talkInput').value.trim();
      if (!t) return;
      if (M.dialogue.detect(t).type === 'crisis') M.$('#safeCard').hidden = false;
      answer(t, t);
    });
  }

  return { init, start, MOODS, FLOWS };
})();
