// 作業支援モード：ポモドーロ、やることリスト、メモ、lo-fi、環境音、ミニ表示
M.focus = (() => {
  const PRESETS = [
    { label: 'ちょっとだけ 5/3', work: 5, short: 3, long: 10 },
    { label: 'ゆるポモ 15/5', work: 15, short: 5, long: 15 },
    { label: 'スタンダード 25/5', work: 25, short: 5, long: 15 },
    { label: 'じっくり 50/10', work: 50, short: 10, long: 20 },
  ];
  const PHASE_LABEL = { work: '集中', short: '休憩', long: '長い休憩' };

  const LINES = {
    start: ['じゃあ、はじめよっか。わたしもとなりで書きものするね。', 'いってらっしゃい。ここで一緒にがんばるよ。', 'ゆっくりいこう。わからなくなったら、深呼吸ね。', 'スタート。完ぺきじゃなくて大丈夫だよ。', '一緒にいるから、ひとりじゃないよ。'],
    during: ['……♪', '（澪音はノートに何か書いている）', 'いい調子だね。', '肩の力、ぬけてるかな？', 'お水、近くにある？', '（ページをめくる音）', 'ここ、静かでいいね。', '……ふう。', 'その調子、その調子。', '（澪音は小さく鼻歌をうたっている）', 'わたしもがんばるね。', '姿勢、ちょっとだけ伸ばしてみる？'],
    toBreak: ['おつかれさま！休憩の時間だよ。', 'ひと区切り！えらいね。少し休もう。', 'できたね。休憩しよっか。', 'おつかれさま。画面から目をはなして、遠くを見てね。', 'わあ、集中できたね。ひと休みしよう。'],
    breakTip: ['立ち上がって、ぐーっと伸びをしてみよう。', 'お水かお茶を一杯どうぞ。', '窓の外を眺めて、目を休めよう。', '肩をストンと落として、3回呼吸しよう。', 'ちょっと歩いてみる？', '休憩中は、スマホも少しお休みしよう。', '手首と指を、ぶらぶらほぐそう。', '目を閉じて、30秒だけ何もしないでみよう。'],
    toLong: ['たくさんがんばったね。長めの休憩にしよう。', 'ここまで本当にえらいよ。ゆっくり休んでね。', '長い休憩だよ。おやつタイムにしちゃう？'],
    toWork: ['休憩おしまい。また一緒にやろっか。', 'さあ、もうひと区切り。むりなら休んでもいいよ。', 'おかえり。つづき、ゆっくりはじめよう。'],
    pause: ['ちょっと止めるね。いつでも再開できるよ。', '一時停止。休むのも大事だよ。'],
    todoDone: ['ひとつ終わったね！すごい！', 'やったね、チェック！', 'できたね。ちゃんと前に進んでるよ。', 'おみごと！花丸あげる。', 'ひとつ終わった。自分をほめてあげてね。'],
  };

  const P = (k) => M.fill(M.pickFresh('f-' + k, LINES[k], 4));

  let phase = 'work', running = false, endAt = 0, remain = 0, total = 0, cycle = 0, tickTimer = null, lastMinuteMark = 0, nextTalk = 0, pip = null;

  const cfg = () => M.store.get().settings.pomo;
  const phaseLen = (p) => (p === 'work' ? cfg().work : p === 'short' ? cfg().short : cfg().long) * 60;

  function resetPhase(p) {
    phase = p;
    total = remain = phaseLen(p);
    running = false;
    endAt = 0;
    render();
  }

  function start() {
    M.audio.ensure();
    if (running) return pause();
    running = true;
    endAt = Date.now() + remain * 1000;
    lastMinuteMark = remain;
    planTalk();
    if (phase === 'work') { M.chara.setWorking(true); M.voice.say(P('start'), 'smile'); }
    clearInterval(tickTimer);
    tickTimer = setInterval(tick, 500);
    render();
  }

  function pause() {
    running = false;
    remain = Math.max(0, Math.round((endAt - Date.now()) / 1000));
    clearInterval(tickTimer);
    M.chara.setWorking(false);
    M.voice.say(P('pause'), 'smile');
    render();
  }

  function planTalk() {
    const f = cfg().talk;
    nextTalk = f === 0 ? Infinity : Date.now() + (f === 1 ? 8 + Math.random() * 8 : 3 + Math.random() * 4) * 60000;
  }

  function tick() {
    if (!running) return;
    remain = Math.max(0, Math.round((endAt - Date.now()) / 1000));
    // 集中した分を1分ごとに記録
    if (phase === 'work' && lastMinuteMark - remain >= 60) {
      const mins = Math.floor((lastMinuteMark - remain) / 60);
      lastMinuteMark -= mins * 60;
      addFocusMinutes(mins);
    }
    if (phase === 'work' && Date.now() > nextTalk) {
      M.voice.say(P('during'), M.pick(['smile', 'calm', 'normal']));
      if (Math.random() < 0.5) M.room.floatNote();
      planTalk();
    }
    if (remain <= 0) return complete();
    render();
  }

  function addFocusMinutes(n) {
    const s = M.store.get();
    const d = M.today();
    s.focusByDay[d] = (s.focusByDay[d] || 0) + n;
    M.store.save();
    M.app.addBond(n, 'focus');
  }

  function complete() {
    clearInterval(tickTimer);
    running = false;
    const s = M.store.get();
    if (phase === 'work') {
      const d = M.today();
      s.pomosByDay[d] = (s.pomosByDay[d] || 0) + 1;
      M.store.save();
      cycle++;
      const longNow = cycle % cfg().every === 0;
      if (cfg().chime) M.audio.chime('break');
      M.chara.setWorking(false);
      M.chara.hop();
      M.voice.say((longNow ? P('toLong') : P('toBreak')) + '\n' + P('breakTip'), 'happy');
      notify('休憩の時間だよ', P('breakTip'));
      resetPhase(longNow ? 'long' : 'short');
      M.log && M.log.render();
      if (cfg().auto) start();
    } else {
      if (cfg().chime) M.audio.chime('work');
      M.voice.say(P('toWork'), 'smile');
      notify('休憩おしまい', 'またゆっくりはじめよう');
      resetPhase('work');
      if (cfg().auto) start();
    }
  }

  function skip() {
    clearInterval(tickTimer);
    running = false;
    M.chara.setWorking(false);
    if (phase === 'work') { cycle++; resetPhase(cycle % cfg().every === 0 ? 'long' : 'short'); M.voice.say(P('breakTip'), 'smile'); }
    else resetPhase('work');
  }

  function reset() {
    clearInterval(tickTimer);
    M.chara.setWorking(false);
    resetPhase('work');
  }

  function notify(title, body) {
    const s = M.store.get().settings;
    if (!s.notify || !('Notification' in window) || Notification.permission !== 'granted' || !document.hidden) return;
    try { new Notification('澪音：' + title, { body }); } catch (e) {}
  }

  function render() {
    const t = M.fmtTime(remain);
    M.$('#pomoTime').textContent = t;
    M.$('#pomoPhase').textContent = PHASE_LABEL[phase] + (running ? '' : '（とまっています）');
    M.$('#pomoStart').textContent = running ? '一時停止' : remain < total ? 'つづける' : 'はじめる';
    M.$('.pomo').classList.toggle('break', phase !== 'work');
    const c = 326.7;
    M.$('#ringFg').style.strokeDashoffset = String(c * (1 - remain / total));
    const today = M.store.get().pomosByDay[M.today()] || 0;
    M.$('#pomoCount').textContent = `今日 ${today} ポモドーロ`;
    M.$('#miniTime').textContent = t;
    M.$('#miniPhase').textContent = PHASE_LABEL[phase];
    M.$('#miniTimer').hidden = !running && remain === total;
    document.title = running ? `${t} ${PHASE_LABEL[phase]}｜澪音のへや` : '澪音のへや';
    if (pip) {
      pip.document.getElementById('t').textContent = t;
      pip.document.getElementById('p').textContent = PHASE_LABEL[phase] + (running ? '' : '（停止中）');
      pip.document.getElementById('b').textContent = running ? '一時停止' : 'はじめる';
    }
  }

  // ---------- やることリスト ----------
  function renderTodos() {
    const ul = M.$('#todoList');
    const s = M.store.get();
    ul.innerHTML = '';
    if (!s.todos.length) ul.append(M.el('li', { class: 'muted tiny', text: 'まだ何もないよ。何もない日も、すてきな日。' }));
    s.todos.forEach((t, i) => {
      const cb = M.el('input', { type: 'checkbox' });
      cb.checked = t.done;
      cb.addEventListener('change', () => {
        t.done = cb.checked;
        if (t.done) { M.voice.say(P('todoDone'), 'happy'); M.chara.hop(); M.app.addBond(2, 'todo'); }
        M.store.save(); renderTodos();
      });
      ul.append(M.el('li', { class: t.done ? 'done' : '' }, cb, M.el('span', { text: t.text }),
        M.el('button', { type: 'button', title: '消す', text: '×', onclick: () => { s.todos.splice(i, 1); M.store.save(); renderTodos(); } })));
    });
  }
  function addTodo(text) {
    if (!text || text === 'なし') return;
    M.store.get().todos.push({ text, done: false });
    M.store.save();
    renderTodos();
  }
  function appendMemo(line) {
    const s = M.store.get();
    s.memo = (s.memo ? s.memo + '\n' : '') + line;
    M.$('#memo').value = s.memo;
    M.store.save();
  }

  // ---------- 音 ----------
  const AMB_PRESETS = [
    { label: '雨の日のへや', set: { rain: 50, clock: 20, pages: 15 } },
    { label: '川べり', set: { stream: 50, birds: 30, wind: 12 } },
    { label: '夜のカフェ', set: { cafe: 40, rain: 20 } },
    { label: '暖炉の夜', set: { fire: 50, wind: 15, clock: 12 } },
    { label: '夏の縁側', set: { chime: 40, insects: 25, wind: 12 } },
    { label: '海辺', set: { waves: 50, wind: 15 } },
    { label: 'となりで作業', set: { keys: 30, pages: 20, clock: 10 } },
  ];

  function syncMusicUI() {
    M.$('#musicToggle').textContent = M.audio.playing ? '❚❚ とめる' : '▶ 再生';
    M.$('#musicNow').textContent = M.audio.playing ? '♪ ' + M.audio.TRACKS[M.audio.track].name : '—';
    M.$$('#trackList .chip').forEach((c, i) => c.classList.toggle('on', M.audio.playing && i === M.audio.track));
  }

  function renderSound() {
    const s = M.store.get().settings;
    const tl = M.$('#trackList');
    M.audio.TRACKS.forEach((t, i) => tl.append(M.el('button', { type: 'button', class: 'chip', text: t.name + (t.drums ? '' : '（しずか）'), onclick: () => {
      s.track = i; M.store.save(); M.audio.playMusic(i); syncMusicUI();
    } })));
    M.$('#musicToggle').addEventListener('click', () => {
      if (M.audio.playing) M.audio.stopMusic(); else M.audio.playMusic(s.track);
      syncMusicUI();
    });
    M.$('#musicNext').addEventListener('click', () => {
      s.track = (M.audio.track + 1) % M.audio.TRACKS.length; M.store.save();
      M.audio.playMusic(s.track); syncMusicUI();
    });
    const vol = M.$('#musicVol');
    vol.value = s.musicVol;
    vol.addEventListener('input', () => { s.musicVol = Number(vol.value); M.audio.setMusicVol(s.musicVol); M.store.save(); });

    const grid = M.$('#ambGrid');
    for (const [id, a] of Object.entries(M.audio.AMBS)) {
      const r = M.el('input', { type: 'range', min: 0, max: 100, value: 0, 'data-amb': id });
      r.addEventListener('input', () => { M.audio.setAmb(id, Number(r.value)); s.amb[id] = Number(r.value); M.store.save(); });
      grid.append(M.el('label', null, a.label, r));
    }
    const pre = M.$('#ambPresets');
    const hasSaved = Object.values(s.amb).some((v) => v > 0);
    if (hasSaved) pre.append(M.el('button', { type: 'button', class: 'chip', text: '前回の音', onclick: () => applyAmb(Object.assign({}, s.amb)) }));
    AMB_PRESETS.forEach((p) => pre.append(M.el('button', { type: 'button', class: 'chip', text: p.label, onclick: () => applyAmb(p.set) })));
    pre.append(M.el('button', { type: 'button', class: 'chip', text: 'ぜんぶ止める', onclick: () => applyAmb({}) }));
  }

  function applyAmb(set) {
    const s = M.store.get().settings;
    M.$$('#ambGrid input').forEach((r) => {
      const id = r.dataset.amb;
      const v = set[id] || 0;
      r.value = v;
      M.audio.setAmb(id, v);
      s.amb[id] = v;
    });
    M.store.save();
  }

  // ---------- ミニ表示（Picture-in-Picture があれば別ウィンドウ） ----------
  async function openMini() {
    if ('documentPictureInPicture' in window) {
      try {
        if (pip) { pip.close(); pip = null; return; }
        pip = await window.documentPictureInPicture.requestWindow({ width: 260, height: 170 });
        pip.document.body.innerHTML = `
          <style>body{margin:0;font-family:sans-serif;background:linear-gradient(180deg,#e8f6f9,#d4eef4);color:#2f4753;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh}
          #t{font-size:44px;font-variant-numeric:tabular-nums}#p{font-size:13px;color:#5f7a86}.n{color:#3f9fbf;font-size:12px}
          button{border:none;background:#3f9fbf;color:#fff;border-radius:999px;padding:4px 16px;margin-top:4px;cursor:pointer}</style>
          <div class="n">♪ 澪音といっしょ</div><div id="p"></div><div id="t"></div><button id="b"></button>`;
        pip.document.getElementById('b').addEventListener('click', start);
        pip.addEventListener('pagehide', () => { pip = null; });
        render();
        return;
      } catch (e) { pip = null; }
    }
    M.$('#app').classList.toggle('mini');
  }

  function bindCustom() {
    const c = cfg();
    const map = { '#cWork': 'work', '#cShort': 'short', '#cLong': 'long', '#cEvery': 'every' };
    for (const [sel, key] of Object.entries(map)) {
      const e = M.$(sel);
      e.value = c[key];
      e.addEventListener('change', () => {
        const v = Math.max(Number(e.min), Math.min(Number(e.max), Number(e.value) || c[key]));
        c[key] = v; e.value = v; M.store.save();
        if (!running) resetPhase(phase);
      });
    }
    const auto = M.$('#cAuto'); auto.checked = c.auto; auto.addEventListener('change', () => { c.auto = auto.checked; M.store.save(); });
    const chime = M.$('#cChime'); chime.checked = c.chime; chime.addEventListener('change', () => { c.chime = chime.checked; M.store.save(); });
    const talk = M.$('#cTalk'); talk.value = c.talk; talk.addEventListener('change', () => { c.talk = Number(talk.value); M.store.save(); planTalk(); });
    const pr = M.$('#pomoPresets');
    PRESETS.forEach((p) => pr.append(M.el('button', { type: 'button', class: 'chip', text: p.label, onclick: () => {
      Object.assign(c, { work: p.work, short: p.short, long: p.long });
      M.$('#cWork').value = p.work; M.$('#cShort').value = p.short; M.$('#cLong').value = p.long;
      M.store.save();
      if (!running) resetPhase('work');
      M.toast(`${p.label} にしたよ`);
    } })));
  }

  function init() {
    bindCustom();
    resetPhase('work');
    M.$('#pomoStart').addEventListener('click', start);
    M.$('#pomoSkip').addEventListener('click', skip);
    M.$('#pomoReset').addEventListener('click', reset);
    M.$('#todoForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const i = M.$('#todoInput');
      addTodo(i.value.trim());
      i.value = '';
    });
    M.$('#todoClear').addEventListener('click', () => {
      const s = M.store.get();
      s.todos = s.todos.filter((t) => !t.done);
      M.store.save(); renderTodos();
    });
    renderTodos();
    const memo = M.$('#memo');
    memo.value = M.store.get().memo;
    memo.addEventListener('input', () => { M.store.get().memo = memo.value; M.store.save(); });
    renderSound();
    syncMusicUI();
    M.$('#btnMini').addEventListener('click', openMini);
    M.$('#btnFocusView').addEventListener('click', () => M.$('#app').classList.toggle('focus-view'));
    M.$('#btnMusic').addEventListener('click', () => { M.app.showTab('focus'); M.$('#soundCard').scrollIntoView({ behavior: 'smooth' }); });
    M.$('#miniTimer').addEventListener('click', () => { M.$('#app').classList.remove('mini', 'focus-view'); });
  }

  return { init, addTodo, appendMemo, syncMusicUI, start, get running() { return running; }, get phase() { return phase; } };
})();
