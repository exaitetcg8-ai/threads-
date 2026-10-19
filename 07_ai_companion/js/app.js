// 全体をつなぐ
M.app = (() => {
  const POKE = {
    any: ['なあに？', 'ふふ、くすぐったいよ。', 'ここにいるよ♪', '呼んだ？', 'いっしょにいられて、うれしいな。', '{name}、今日も来てくれてありがとう。',
      'お水、飲んだ？', '肩、こってない？', 'なにもしなくても、ここにいていいんだよ。', 'いい音、聞こえる？', '心地よく、自分らしく、自由に、ね。', '今日の心の天気はどう？'],
    working: ['しーっ、今は集中タイムだよ。', 'がんばってるね。応援してる。', 'わたしもノート書いてるよ。', 'あと少ししたら休憩だね。'],
    night: ['夜ふかしさん、目はつかれてない？', '眠くなったら、むりせず寝ようね。', '静かな夜だね。'],
    morning: ['朝の光、きれいだね。', 'ゆっくり起きて大丈夫だよ。'],
  };
  const CHAT_CAP = 30; // おしゃべりで増えるなかよし度は1日30まで

  function showTab(name) {
    M.$$('.tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
    M.$$('.tab-body').forEach((b) => b.classList.toggle('active', b.dataset.body === name));
    if (name === 'log') M.log.render();
    if (name === 'room') M.room.renderUnlocks();
  }

  function addBond(n, kind) {
    const s = M.store.get();
    if (kind === 'chat') {
      const key = 'chat:' + M.today();
      s._chat = s._chat && s._chat.d === key ? s._chat : { d: key, n: 0 };
      if (s._chat.n >= CHAT_CAP) return;
      s._chat.n += n;
    }
    const before = M.story.level(s.bond);
    s.bond += n;
    M.store.save();
    const after = M.story.level(s.bond);
    renderBond();
    if (after > before) levelUp(after);
  }

  function levelUp(lv) {
    const unlocked = [];
    Object.values(M.room.FURN).forEach((f) => { if (f.lv === lv) unlocked.push(f.label); });
    Object.values(M.chara.OUTFITS).forEach((o) => { if (o.lv === lv) unlocked.push('服「' + o.label + '」'); });
    Object.values(M.room.THEMES).forEach((t) => { if (t.lv === lv) unlocked.push('へやの色「' + t.label + '」'); });
    const ep = M.story.EP.findIndex((e) => e.lv === lv);
    if (ep >= 0) unlocked.push(`ものがたり 第${ep + 1}話`);
    M.chara.hop();
    M.voice.say(`なかよし度が Lv.${lv} になったよ。いつも一緒にいてくれて、ありがとう。` + (unlocked.length ? `\n${unlocked.join('、')} がひらいたよ♪` : ''), 'happy');
    M.toast(`なかよし度 Lv.${lv}`);
    M.room.renderUnlocks();
  }

  function renderBond() {
    const b = M.store.get().bond;
    M.$('#bondLv').textContent = 'Lv.' + M.story.level(b);
    M.$('#bondBar').style.width = Math.round(M.story.progress(b) * 100) + '%';
  }

  function addMood(m) {
    const s = M.store.get();
    s.moods.push({ d: M.today(), m });
    if (s.moods.length > 400) s.moods.shift();
    M.store.save();
  }

  function poke() {
    const tod = M.timeOfDay();
    let pool = POKE.any;
    if (M.focus.running && M.focus.phase === 'work') pool = POKE.working;
    else if (tod === 'night' && Math.random() < 0.4) pool = POKE.night;
    else if (tod === 'morning' && Math.random() < 0.4) pool = POKE.morning;
    M.voice.say(M.pickFresh('poke' + pool.length, pool, 4), M.pick(['smile', 'happy', 'surprise']));
    M.room.floatNote();
  }

  function runCmd(cmd) {
    if (cmd === 'focus') showTab('focus');
    if (cmd === 'work') showTab('work');
    if (cmd === 'music') { M.audio.playMusic(M.store.get().settings.track); M.focus.syncMusicUI(); }
  }

  function clock() {
    const n = new Date();
    M.$('#clock').textContent = `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
  }

  function init() {
    M.chara.mount(M.$('#chara'));
    M.room.init();
    M.dialogue.init();
    M.talk.init();
    M.works.init();
    M.focus.init();
    M.log.render();
    renderBond();
    clock();
    setInterval(clock, 10000);

    M.$$('.tabs button').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));
    M.$('#safeClose').addEventListener('click', () => { M.$('#safeCard').hidden = true; M.voice.say('うん、ここにいるよ。ゆっくり呼吸しようね。', 'calm'); });
    M.$('#storyClose').addEventListener('click', () => { M.$('#storyView').hidden = true; });

    const s = M.store.get();
    const first = !s.talks && !s.bond;
    const greet = first
      ? 'はじめまして。わたしは澪音（みおん）。\nここは、がんばっても、がんばらなくてもいい部屋だよ。\nおしゃべりしたり、5分ワークをしたり、一緒に作業したり。好きにすごしてね。'
      : M.pick(M.dialogueData.GREET[M.timeOfDay()]);
    setTimeout(() => M.voice.say(greet, 'smile'), 400);

    // ときどき音符がふわっと浮かぶ
    setInterval(() => { if (Math.random() < 0.5) M.room.floatNote(); }, 7000);
  }

  return { init, showTab, addBond, addMood, poke, runCmd };
})();

document.addEventListener('DOMContentLoaded', M.app.init);
