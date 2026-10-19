// へや：景色（時間帯・天気）、へやの色、家具、服、設定画面
M.room = (() => {
  const THEMES = {
    aqua:  { label: 'みずいろ', lv: 1, wall: '#e8f6f9', wall2: '#d4eef4', floor: '#cfe3e8' },
    mint:  { label: 'ミント', lv: 2, wall: '#ebf8f2', wall2: '#d6f0e4', floor: '#d3e6dc' },
    lav:   { label: 'ラベンダー', lv: 4, wall: '#f0eefb', wall2: '#e2ddf6', floor: '#d9d6ea' },
    sakura:{ label: 'さくら', lv: 6, wall: '#fbf0f2', wall2: '#f5e0e5', floor: '#e8d6da' },
    cream: { label: 'クリーム', lv: 8, wall: '#fbf7ee', wall2: '#f2ead8', floor: '#e3dacb' },
    deep:  { label: 'しんかい', lv: 10, wall: '#dbe9f3', wall2: '#c4d9ea', floor: '#b5c9d8' },
  };

  const FURN = {
    plant: { label: '観葉植物', lv: 1, pos: 'left:2%;bottom:22%;width:12%;height:24%',
      svg: '<svg viewBox="0 0 60 100"><path d="M18 70h24l-4 28H22z" fill="#e9dccb"/><path d="M30 70C10 50 8 30 20 18c2 20 8 34 10 52zM30 70c20-22 24-40 12-54-4 22-8 36-12 54zM30 70C30 46 28 26 30 6c6 20 4 42 0 64z" fill="#8fcfae"/></svg>' },
    lamp: { label: 'あかりスタンド', lv: 1, pos: 'right:4%;bottom:30%;width:9%;height:22%',
      svg: '<svg viewBox="0 0 40 100"><path d="M6 30L14 4h12l8 26z" fill="#fff6d8" stroke="#e9dccb"/><rect x="18" y="30" width="4" height="60" fill="#c9b8a2"/><rect x="8" y="88" width="24" height="6" rx="3" fill="#c9b8a2"/><circle cx="20" cy="22" r="22" fill="#fff3c0" opacity=".25" class="glow"/></svg>' },
    shelf: { label: '本だな', lv: 2, pos: 'right:3%;top:12%;width:16%;height:22%',
      svg: '<svg viewBox="0 0 80 90"><rect x="2" y="2" width="76" height="86" rx="4" fill="#f3e8da"/><rect x="2" y="44" width="76" height="4" fill="#e1d2bf"/><rect x="8" y="12" width="8" height="30" fill="#8fd8ea"/><rect x="18" y="16" width="7" height="26" fill="#cfc8f2"/><rect x="27" y="10" width="9" height="32" fill="#bfeee3"/><rect x="46" y="20" width="22" height="22" rx="11" fill="#fff" stroke="#8fd8ea"/><rect x="10" y="56" width="10" height="28" fill="#f5c8d2"/><rect x="22" y="60" width="8" height="24" fill="#8fd8ea"/><rect x="40" y="62" width="30" height="22" rx="3" fill="#e6f6fb"/></svg>' },
    aquarium: { label: 'ちいさな水そう', lv: 3, pos: 'left:16%;bottom:26%;width:14%;height:14%',
      svg: '<svg viewBox="0 0 80 60"><rect x="4" y="6" width="72" height="48" rx="6" fill="#c9f2fb" stroke="#8fd8ea" stroke-width="2" opacity=".9"/><path d="M4 18c12-4 24 4 36 0s24-4 36 0" stroke="#8fd8ea" fill="none"/><g class="fish"><path d="M30 34c6-6 14-6 18 0-4 6-12 6-18 0zM48 34l6-5v10z" fill="#ffb7a8"/></g><circle cx="60" cy="26" r="2" fill="#fff"/><circle cx="62" cy="18" r="1.5" fill="#fff"/><path d="M14 54c2-10 4-14 2-22M20 54c0-8 4-10 2-16" stroke="#8fcfae" stroke-width="2" fill="none"/></svg>' },
    lights: { label: 'ガーランドライト', lv: 4, pos: 'left:4%;top:3%;width:60%;height:8%',
      svg: '<svg viewBox="0 0 300 30" preserveAspectRatio="none"><path d="M0 4C75 26 225 26 300 4" stroke="#c9b8a2" fill="none"/><g class="tw">' + Array.from({ length: 11 }, (_, i) => { const x = 15 + i * 27; const y = 4 + 22 * Math.sin(Math.PI * x / 300) * 0.8; return `<circle cx="${x}" cy="${y + 4}" r="3.5" fill="${['#fff3c0', '#c9f2fb', '#f5c8d2'][i % 3]}"/>`; }).join('') + '</g></svg>' },
    record: { label: 'レコードプレーヤー', lv: 5, pos: 'right:14%;bottom:30%;width:13%;height:12%',
      svg: '<svg viewBox="0 0 80 50"><rect x="2" y="10" width="76" height="38" rx="6" fill="#f3e8da" stroke="#e1d2bf"/><g class="spin" style="transform-origin:34px 28px"><circle cx="34" cy="28" r="16" fill="#3a4a55"/><circle cx="34" cy="28" r="5" fill="#8fd8ea"/><path d="M24 22a12 12 0 0 1 8-6" stroke="#5a6b77" fill="none"/></g><path d="M66 16L56 34" stroke="#c9b8a2" stroke-width="3" stroke-linecap="round"/></svg>' },
    cushion: { label: 'ねこクッション', lv: 6, pos: 'left:30%;bottom:16%;width:11%;height:9%',
      svg: '<svg viewBox="0 0 60 40"><path d="M6 36C2 20 10 10 30 10s28 10 24 26z" fill="#e6f6fb" stroke="#8fd8ea"/><path d="M14 14l2-10 8 7M46 14l-2-10-8 7" fill="#e6f6fb" stroke="#8fd8ea"/><path d="M22 24q2 2 4 0M34 24q2 2 4 0M28 28q2 2 4 0" stroke="#3f9fbf" fill="none"/></svg>' },
    furin: { label: '風鈴', lv: 7, pos: 'left:40%;top:9%;width:5%;height:16%',
      svg: '<svg viewBox="0 0 30 90"><path d="M15 0v14" stroke="#c9b8a2"/><path d="M4 30a11 14 0 0 1 22 0z" fill="#c9f2fb" stroke="#5fb8d6"/><path d="M8 26c3-4 6 2 9-2s6 2 6 2" stroke="#3f9fbf" fill="none"/><path d="M15 30v24" stroke="#c9b8a2"/><rect x="9" y="54" width="12" height="26" rx="2" fill="#fff" stroke="#8fd8ea"/><text x="15" y="70" font-size="8" text-anchor="middle" fill="#3f9fbf">♪</text></svg>' },
    poster: { label: '音符のポスター', lv: 8, pos: 'left:52%;top:12%;width:11%;height:20%',
      svg: '<svg viewBox="0 0 50 70"><rect x="2" y="2" width="46" height="66" rx="3" fill="#fff" stroke="#d6ebf1"/><path d="M8 50c8-4 14 4 22 0s12-4 14 0" stroke="#8fd8ea" fill="none" stroke-width="2"/><text x="25" y="36" font-size="24" text-anchor="middle" fill="#7fd3e6">♫</text></svg>' },
    cloudlamp: { label: 'くものランプ', lv: 9, pos: 'right:24%;top:4%;width:12%;height:12%',
      svg: '<svg viewBox="0 0 70 50"><path d="M35 0v12" stroke="#c9b8a2"/><path d="M14 40a10 10 0 0 1 2-20 14 14 0 0 1 26-6 11 11 0 0 1 16 10 8 8 0 0 1-2 16z" fill="#fffdf2" stroke="#e9dccb"/><circle cx="35" cy="30" r="30" fill="#fff6c8" opacity=".18" class="glow"/></svg>' },
    keyboard: { label: 'ちいさな鍵盤', lv: 11, pos: 'left:2%;bottom:6%;width:18%;height:8%',
      svg: '<svg viewBox="0 0 100 30"><rect x="1" y="1" width="98" height="28" rx="4" fill="#fff" stroke="#8fd8ea"/>' + Array.from({ length: 13 }, (_, i) => `<path d="M${8 + i * 7} 8v20" stroke="#d6ebf1"/>`).join('') + Array.from({ length: 9 }, (_, i) => [0, 1, 3, 4, 5, 7, 8, 10, 11].includes(i) ? `<rect x="${11 + i * 7}" y="8" width="4" height="12" fill="#3a4a55"/>` : '').join('') + '</svg>' },
  };

  function applyScene() {
    const s = M.store.get().settings;
    const tod = s.time === 'auto' ? M.timeOfDay() : s.time;
    const sky = M.$('#sky');
    sky.className = 'sky ' + tod + ' ' + s.weather;
    const deco = M.$('#skyDeco');
    deco.innerHTML = '';
    const night = tod === 'night' || s.weather === 'stars';
    const clearSky = s.weather === 'clear' || s.weather === 'stars';
    if (night && clearSky) {
      deco.append(M.el('div', { class: 'moon' }));
      for (let i = 0; i < 26; i++) deco.append(M.el('div', { class: 'star', style: `left:${Math.random() * 100}%;top:${Math.random() * 70}%;animation-delay:${Math.random() * 3}s` }));
    } else if (!night && s.weather === 'clear') deco.append(M.el('div', { class: 'sun' }));
    if (s.weather !== 'stars') {
      for (let i = 0; i < 3; i++) deco.append(M.el('div', { class: 'cloud', style: `top:${10 + i * 22}%;animation-delay:-${i * 20}s;opacity:${s.weather === 'clear' ? 0.7 : 0.95}` }));
    }
    const wx = M.$('#weather');
    wx.innerHTML = '';
    if (s.weather === 'rain') for (let i = 0; i < 50; i++) wx.append(M.el('div', { class: 'drop', style: `left:${Math.random() * 100}%;animation-duration:${0.6 + Math.random() * 0.5}s;animation-delay:${Math.random()}s` }));
    if (s.weather === 'snow') for (let i = 0; i < 40; i++) wx.append(M.el('div', { class: 'flake', style: `left:${Math.random() * 100}%;animation-duration:${5 + Math.random() * 5}s;animation-delay:${Math.random() * 5}s` }));
    // 夜はへやを少し暗く
    const th = THEMES[s.theme] || THEMES.aqua;
    const dim = { morning: 0, day: 0, evening: 0.08, night: 0.2 }[tod];
    const room = M.$('#room');
    room.style.setProperty('--wall', th.wall);
    room.style.setProperty('--wall2', th.wall2);
    room.style.setProperty('--floor', th.floor);
    room.style.filter = dim ? `brightness(${1 - dim}) saturate(${1 - dim / 2})` : '';
    document.querySelector('meta[name=theme-color]').setAttribute('content', th.wall);
  }

  function applyFurniture() {
    const s = M.store.get().settings;
    const box = M.$('#furniture');
    box.innerHTML = '';
    s.furniture.forEach((id) => {
      const f = FURN[id];
      if (f) box.insertAdjacentHTML('beforeend', `<div class="furn furn-${id}" style="${f.pos}">${f.svg}</div>`);
    });
    if (!M.$('#furnAnim')) {
      const st = document.createElement('style');
      st.id = 'furnAnim';
      st.textContent = `.furn .spin{animation:spin 4s linear infinite}.furn .fish{animation:swim 7s ease-in-out infinite}.furn .glow{animation:glow 4s ease-in-out infinite}.furn .tw circle{animation:twinkle 3s ease-in-out infinite}.furn .tw circle:nth-child(2n){animation-delay:1.5s}.furn-furin{transform-origin:top center;animation:sway 5s ease-in-out infinite}
      @keyframes spin{to{transform:rotate(360deg)}}@keyframes swim{50%{transform:translateX(-14px)}}@keyframes glow{50%{opacity:.08}}`;
      document.head.appendChild(st);
    }
  }

  function floatNote() {
    if (M.store.get().settings.calm) return;
    const n = M.el('div', { class: 'fnote', text: M.pick(['♪', '♫', '♩', '♬']), style: `left:${30 + Math.random() * 50}%` });
    M.$('#notesFloat').append(n);
    setTimeout(() => n.remove(), 6200);
  }

  // ---------- 設定画面 ----------
  function renderUnlocks() {
    const s = M.store.get();
    const lv = M.story.level(s.bond);
    const furn = M.$('#furnList');
    furn.innerHTML = '';
    for (const [id, f] of Object.entries(FURN)) {
      const locked = lv < f.lv;
      const on = s.settings.furniture.includes(id);
      furn.append(M.el('button', { type: 'button', class: 'unlock' + (on ? ' on' : '') + (locked ? ' locked' : ''), onclick: () => {
        if (locked) return M.toast(`なかよし度 Lv.${f.lv} でおけるようになるよ`);
        const list = s.settings.furniture;
        if (on) list.splice(list.indexOf(id), 1); else list.push(id);
        M.store.save(); applyFurniture(); renderUnlocks();
      } }, locked ? '🔒 ' + f.label : f.label, M.el('small', { text: locked ? `Lv.${f.lv}` : on ? 'おいてある' : 'しまってある' })));
    }
    const out = M.$('#outfitList');
    out.innerHTML = '';
    for (const [id, o] of Object.entries(M.chara.OUTFITS)) {
      const locked = lv < o.lv;
      out.append(M.el('button', { type: 'button', class: 'unlock' + (s.settings.outfit === id ? ' on' : '') + (locked ? ' locked' : ''), onclick: () => {
        if (locked) return M.toast(`なかよし度 Lv.${o.lv} で着られるようになるよ`);
        s.settings.outfit = id; M.store.save(); M.chara.setOutfit(id); renderUnlocks();
        M.voice.say(M.pick(['どうかな、にあう？', 'えへへ、着がえてみたよ。', 'この服、すきなんだ♪']), 'happy');
      } }, locked ? '🔒 ' + o.label : o.label, M.el('small', { text: locked ? `Lv.${o.lv}` : s.settings.outfit === id ? '着ている' : '' })));
    }
    const th = M.$('#setTheme');
    th.innerHTML = '';
    for (const [id, t] of Object.entries(THEMES)) {
      th.append(M.el('option', { value: id, disabled: lv < t.lv ? '' : false, text: lv < t.lv ? `🔒 ${t.label}（Lv.${t.lv}）` : t.label }));
    }
    th.value = s.settings.theme;
  }

  function fillVoiceSelect() {
    const sel = M.$('#setVoiceName');
    if (!sel) return;
    const s = M.store.get().settings;
    sel.innerHTML = '';
    if (!M.voice.voices.length) sel.append(M.el('option', { value: '', text: '日本語の音声が見つかりません' }));
    M.voice.voices.forEach((v) => sel.append(M.el('option', { value: v.name, text: v.name })));
    if (s.voiceName) sel.value = s.voiceName;
  }

  function bindSettings() {
    const s = M.store.get().settings;
    const bindVal = (id, key, after, num) => {
      const e = M.$(id);
      e.value = s[key];
      e.addEventListener('change', () => { s[key] = num ? Number(e.value) : e.value; M.store.save(); after && after(); });
      if (e.type === 'range') e.addEventListener('input', () => { s[key] = Number(e.value); M.store.save(); });
    };
    const bindChk = (id, key, after) => {
      const e = M.$(id);
      e.checked = !!s[key];
      e.addEventListener('change', () => { s[key] = e.checked; M.store.save(); after && after(); });
    };
    bindVal('#setTime', 'time', applyScene);
    bindVal('#setWeather', 'weather', () => {
      applyScene();
      // 天気にあわせて環境音を提案（自動では鳴らさない）
      const hint = { rain: '雨の音も流してみる？', snow: '雪の日は、暖炉の音が似合うよ。', stars: '星の夜は、虫の声もいいね。' }[s.weather];
      if (hint) M.voice.say(hint, 'smile');
    });
    bindVal('#setTheme', 'theme', applyScene);
    bindVal('#setVoiceName', 'voiceName');
    bindVal('#setRate', 'rate', null, true);
    bindVal('#setPitch', 'pitch', null, true);
    bindVal('#setVVol', 'vvol', null, true);
    bindChk('#setVoice', 'voice', () => { if (s.voice) M.voice.say('声、きこえるかな。りんです。よろしくね。', 'happy'); else M.voice.stop(); });
    bindChk('#setCalm', 'calm', applyBody);
    bindChk('#setBigText', 'bigText', applyBody);
    bindChk('#setNotify', 'notify', () => {
      if (s.notify && 'Notification' in window && Notification.permission === 'default') Notification.requestPermission();
    });
    const name = M.$('#setName');
    name.value = s.name;
    name.addEventListener('change', () => { s.name = name.value.trim(); M.store.save(); M.voice.say(s.name ? `${s.name}、ってよぶね。` : '「キミ」ってよぶね。', 'happy'); });
    M.$('#voiceTest').addEventListener('click', () => {
      const was = s.voice; s.voice = true;
      M.voice.say(M.pick(['こんにちは、りんです♡ ゆっくりしていってね。', '今日もここにいるよ。心地よく、自分らしく、自由にね。', 'おつかれさま。ひと休みしようか。']), 'smile');
      s.voice = was;
    });
    fillVoiceSelect();

    M.$('#dataExport').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(M.store.get(), null, 2)], { type: 'application/json' });
      const a = M.el('a', { href: URL.createObjectURL(blob), download: `mion-room-${M.today()}.json` });
      document.body.append(a); a.click(); a.remove();
    });
    M.$('#dataImport').addEventListener('change', (e) => {
      const f = e.target.files[0];
      if (!f) return;
      f.text().then((t) => { M.store.replace(JSON.parse(t)); location.reload(); }).catch(() => M.toast('読みこめなかったみたい'));
    });
    M.$('#dataReset').addEventListener('click', () => {
      if (confirm('記録や設定をすべて消して、はじめからにします。よろしいですか？')) { M.store.reset(); location.reload(); }
    });
  }

  function renderProfile() {
    const P = M.story.PROFILE;
    const box = M.$('#profileCard');
    box.innerHTML = '';
    box.append(M.el('h3', { text: 'Profile' }),
      M.el('dl', { class: 'profile' }, M.el('dt', { text: '名前' }), M.el('dd', { text: P.name }),
        ...P.rows.flatMap(([k, v]) => [M.el('dt', { text: k }), M.el('dd', { text: M.fill(v) })])),
      M.el('div', { class: 'tiny muted', text: '好きなこと' }),
      M.el('ul', { class: 'likes' }, ...P.likes.map((l) => M.el('li', { text: M.fill(l) }))));
  }

  function applyBody() {
    const s = M.store.get().settings;
    document.body.classList.toggle('calm', s.calm);
    document.body.classList.toggle('big-text', s.bigText);
  }

  function init() {
    applyBody();
    applyScene();
    applyFurniture();
    renderUnlocks();
    renderProfile();
    bindSettings();
    setInterval(() => { if (M.store.get().settings.time === 'auto') applyScene(); }, 10 * 60 * 1000);
  }

  return { init, applyScene, applyFurniture, renderUnlocks, floatNote, fillVoiceSelect, THEMES, FURN };
})();
