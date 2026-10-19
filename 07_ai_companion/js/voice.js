// 澪音の声：吹き出し表示＋端末の日本語女性音声で読み上げ
M.voice = (() => {
  const synth = window.speechSynthesis;
  let voices = [];
  // 女性の声として知られている日本語音声の名前（端末ごとに違う）
  const FEMALE_HINTS = ['Nanami', 'Kyoko', 'Haruka', 'Ayumi', 'Mizuki', 'Sayaka', 'Hikari', 'O-ren', 'Google 日本語', 'Female', '女性'];
  const MALE_HINTS = ['Keita', 'Ichiro', 'Otoya', 'Hattori', 'Daichi', 'Naoki', 'Male', '男性'];

  function load() {
    if (!synth) return;
    voices = synth.getVoices().filter((v) => /^ja/i.test(v.lang));
    voices.sort((a, b) => score(b) - score(a));
    M.room && M.room.fillVoiceSelect && M.room.fillVoiceSelect();
  }
  function score(v) {
    let s = 0;
    if (FEMALE_HINTS.some((h) => v.name.includes(h))) s += 10;
    if (MALE_HINTS.some((h) => v.name.includes(h))) s -= 20;
    if (/Natural|Online|Neural|Premium|Enhanced/i.test(v.name)) s += 3;
    return s;
  }
  if (synth) {
    load();
    synth.onvoiceschanged = load;
  }

  function current() {
    const set = M.store.get().settings;
    return voices.find((v) => v.name === set.voiceName) || voices[0] || null;
  }

  let typeTimer;
  function show(text) {
    const t = M.$('#bubbleText');
    clearInterval(typeTimer);
    if (M.store.get().settings.calm) { t.textContent = text; return; }
    t.textContent = '';
    let i = 0;
    typeTimer = setInterval(() => {
      t.textContent = text.slice(0, ++i);
      if (i >= text.length) clearInterval(typeTimer);
    }, 38);
  }

  // say：吹き出し＋読み上げ。exp で表情も変える
  function say(text, exp) {
    text = M.fill(text);
    if (exp) M.chara.setExp(exp);
    show(text);
    const set = M.store.get().settings;
    if (!set.voice || !synth) {
      // 声なしでも少しだけ口を動かす
      M.chara.speak(true);
      clearTimeout(say._t);
      say._t = setTimeout(() => M.chara.speak(false), Math.min(4000, 120 * text.length));
      return;
    }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[♪〜]/g, '').replace(/\n/g, '。'));
    const v = current();
    if (v) u.voice = v;
    u.lang = 'ja-JP';
    u.rate = set.rate / 100;
    u.pitch = set.pitch / 100;
    u.volume = set.vvol / 100;
    u.onstart = () => M.chara.speak(true);
    u.onend = u.onerror = () => M.chara.speak(false);
    synth.speak(u);
  }

  function stop() { synth && synth.cancel(); M.chara.speak(false); }

  return { say, stop, get voices() { return voices; }, supported: !!synth };
})();
