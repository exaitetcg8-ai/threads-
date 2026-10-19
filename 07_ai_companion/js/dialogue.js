// おしゃべり（チャットモード）：気持ちを読みとって、部品を組み合わせて返事をつくる
M.dialogue = (() => {
  const D = M.dialogueData;
  let lastIntent = null;

  const norm = (t) => t.toLowerCase().replace(/\s+/g, '');

  function detect(text) {
    const t = norm(text);
    if (D.CRISIS.some((k) => t.includes(k))) return { type: 'crisis' };
    let best = null, bestScore = 0;
    for (const [id, it] of Object.entries(D.INTENTS)) {
      const s = it.keys.reduce((n, k) => n + (t.includes(k.toLowerCase()) ? 1 : 0), 0);
      if (s > bestScore) { best = id; bestScore = s; }
    }
    if (best) return { type: 'intent', id: best };
    for (const [id, it] of Object.entries(D.BRIGHT)) {
      if (it.keys.some((k) => t.includes(k))) return { type: 'bright', id };
    }
    if (D.GREET_KEYS.some((k) => t.includes(k))) return { type: 'greet' };
    if (/ポモ|タイマー|集中|作業し/.test(text)) return { type: 'cmd', id: 'focus' };
    if (/ワーク|なにか.*やりたい|何か.*やりたい/.test(text)) return { type: 'cmd', id: 'work' };
    if (/音楽|BGM|ローファイ|lo-?fi/i.test(text)) return { type: 'cmd', id: 'music' };
    return { type: 'other' };
  }

  const P = (key, arr) => M.pickFresh(key, arr, 5);

  function compose(det, style) {
    if (det.type === 'intent') {
      const it = D.INTENTS[det.id];
      const w = (s) => s.replace(/\{w\}/g, it.word);
      lastIntent = det.id;
      if (style === 'listen') {
        return { text: [P('listen', D.LISTEN), w(P(det.id + 'o', it.open)), P(det.id + 'f', it.feel)].join('\n'), exp: 'calm', intent: det.id };
      }
      if (style === 'hint') {
        return { text: [w(P(det.id + 'o', it.open)), P(det.id + 'h', it.hint), P('close', D.CLOSE)].join('\n'), exp: 'smile', intent: det.id };
      }
      return {
        text: [w(P(det.id + 'o', it.open)) + P(det.id + 'f', it.feel), P('norm', D.NORM), P(det.id + 'h', it.hint), P('close', D.CLOSE)].join('\n'),
        exp: it.exp, intent: det.id,
      };
    }
    if (det.type === 'bright') {
      const it = D.BRIGHT[det.id];
      const w = (s) => s.replace(/\{w\}/g, it.word || '');
      return { text: [w(P(det.id + 'a', it.a)), P(det.id + 'b', it.b), style === 'listen' ? '' : P('close', it.c)].filter(Boolean).join('\n'), exp: it.exp };
    }
    if (det.type === 'greet') {
      return { text: P('greet', D.GREET[M.timeOfDay()]), exp: 'smile' };
    }
    if (det.type === 'cmd') {
      const msg = {
        focus: '作業支援のタブを開くね。今日は何分くらいにしようか。',
        work: '今日の5分ワークを開くね。やりたくなかったら、見るだけでもいいよ。',
        music: 'lo-fiを流すね。音量は小さめから。',
      }[det.id];
      return { text: msg, exp: 'smile', cmd: det.id };
    }
    // どれにも当てはまらないとき
    if (style === 'listen') return { text: P('listen', D.LISTEN), exp: 'calm' };
    return { text: [P('fa', D.FALLBACK.a), P('fb', D.FALLBACK.b)].join('\n'), exp: 'normal' };
  }

  // 組み合わせの数（画面に表示する）
  function countPatterns() {
    let total = 0;
    const N = D.NORM.length, C = D.CLOSE.length, L = D.LISTEN.length;
    for (const it of Object.values(D.INTENTS)) {
      total += it.open.length * it.feel.length * N * it.hint.length * C; // ふつう
      total += L * it.open.length * it.feel.length;                       // ただ聞いて
      total += it.open.length * it.hint.length * C;                       // ヒント
    }
    for (const it of Object.values(D.BRIGHT)) total += it.a.length * it.b.length * (it.c.length + 1);
    total += D.FALLBACK.a.length * D.FALLBACK.b.length + L;
    for (const g of Object.values(D.GREET)) total += g.length;
    return total;
  }

  // ---------- 画面 ----------
  const log = () => M.$('#chatLog');

  function addMsg(who, text, target) {
    const box = target || log();
    const m = M.el('div', { class: 'msg ' + who, text: M.fill(text) });
    box.append(m);
    box.scrollTop = box.scrollHeight;
    return m;
  }

  function setChips(list, target) {
    const box = target || M.$('#chatChips');
    box.innerHTML = '';
    list.forEach(([label, fn]) => box.append(M.el('button', { class: 'chip', type: 'button', text: label, onclick: fn })));
  }

  function style() {
    const r = M.$('input[name=chatStyle]:checked');
    return r ? r.value : 'normal';
  }

  function reply(text) {
    const det = detect(text);
    if (det.type === 'crisis') {
      const msg = 'そこまでつらい気持ちを、話してくれてありがとう。\nあなたのことが、とても大事だよ。\n今は、人の声につながってほしいな。相談先を出すね。';
      addMsg('ai', msg);
      M.voice.say(msg, 'worry');
      M.$('#safeCard').hidden = false;
      setChips([['相談先をもう一度見る', () => { M.$('#safeCard').hidden = false; }], ['ゆっくり呼吸する', () => M.works.start('breath46')]]);
      return;
    }
    const r = compose(det, style());
    setTimeout(() => {
      addMsg('ai', r.text);
      M.voice.say(r.text, r.exp);
      if (r.cmd) M.app.runCmd(r.cmd);
      chipsFor(r);
    }, 500 + Math.random() * 500);
    M.app.addBond(1, 'chat');
  }

  function chipsFor(r) {
    const chips = [];
    if (r.intent) {
      const it = D.INTENTS[r.intent];
      const wid = M.pick(it.works);
      const w = M.works.get(wid);
      if (w) chips.push(['5分ワーク：' + w.title, () => { M.app.showTab('work'); M.works.start(wid); }]);
      chips.push(['ほかのヒントも聞きたい', () => {
        const h = M.pickFresh(r.intent + 'h', it.hint, 5);
        addMsg('ai', h); M.voice.say(h, 'smile');
      }]);
    }
    chips.push(['ただ聞いてほしい', () => { M.$('input[name=chatStyle][value=listen]').checked = true; M.toast('「ただ聞いてほしい」にしたよ'); }]);
    chips.push(['会話モードで整理する', () => M.app.showTab('talk')]);
    setChips(chips);
  }

  function init() {
    M.$('#chatForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const input = M.$('#chatInput');
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      addMsg('me', text);
      reply(text);
      M.store.get().talks++;
      M.store.save();
    });
    M.$('#patternCount').textContent = `おしゃべりの返事は ${countPatterns().toLocaleString()} 通り以上の組み合わせから生まれます。会話はこの端末の中だけで処理され、外には送られません。`;
    const hello = M.pick(D.GREET[M.timeOfDay()]);
    addMsg('ai', hello);
    setChips([
      ['つかれた', () => quick('つかれた')],
      ['なんだか不安', () => quick('なんだか不安')],
      ['いいことがあった', () => quick('いいことがあってうれしい')],
      ['眠れない', () => quick('眠れない')],
      ['ただ話したい', () => quick('ただ話したい')],
    ]);
  }

  function quick(text) { addMsg('me', text); reply(text); }

  return { init, detect, compose, countPatterns, addMsg, setChips, get lastIntent() { return lastIntent; } };
})();
