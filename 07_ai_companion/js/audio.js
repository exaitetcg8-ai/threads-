// 音：Web Audioでその場で作るlo-fi音楽と環境音（著作権のある音源は使っていません）
M.audio = (() => {
  let ctx, master, musicBus, ambBus, noiseBuf, brownBuf;

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    // lo-fiらしい、こもった音
    const warm = ctx.createBiquadFilter(); warm.type = 'lowpass'; warm.frequency.value = 3200; warm.Q.value = 0.3;
    musicBus = ctx.createGain(); musicBus.gain.value = M.store.get().settings.musicVol / 100 * 0.5;
    musicBus.connect(warm); warm.connect(master);
    ambBus = ctx.createGain(); ambBus.gain.value = 1; ambBus.connect(master);
    noiseBuf = makeNoise('white');
    brownBuf = makeNoise('brown');
    return ctx;
  }

  function makeNoise(kind) {
    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
    }
    return buf;
  }

  function noiseSrc(buf) {
    const s = ctx.createBufferSource();
    s.buffer = buf; s.loop = true;
    s.loopStart = Math.random(); // 毎回ちがう位置から
    return s;
  }

  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

  // ---------------- lo-fi音楽 ----------------
  // コードはMIDIノート。ゆったりした7thコード中心。
  const TRACKS = [
    { name: 'しずくのノート', bpm: 74, drums: true, swing: 0.12,
      prog: [[50, 57, 60, 65], [55, 62, 65, 69], [48, 55, 59, 64], [57, 64, 67, 72]], scale: [72, 74, 76, 79, 81] },
    { name: 'あおい午後', bpm: 82, drums: true, swing: 0.1,
      prog: [[53, 60, 64, 69], [52, 59, 62, 67], [50, 57, 60, 65], [55, 62, 65, 71]], scale: [69, 72, 74, 76, 79] },
    { name: 'みなもの窓', bpm: 70, drums: true, swing: 0.16,
      prog: [[48, 55, 62, 64], [45, 52, 59, 60], [53, 60, 64, 67], [55, 62, 65, 69]], scale: [72, 74, 76, 79, 83] },
    { name: 'よるのせせらぎ', bpm: 66, drums: false, swing: 0,
      prog: [[45, 52, 55, 60], [41, 48, 52, 57], [43, 50, 55, 59], [40, 47, 52, 55]], scale: [69, 71, 72, 76, 79] },
    { name: 'ゆめの音符', bpm: 60, drums: false, swing: 0,
      prog: [[48, 55, 64, 67], [53, 57, 64, 69], [50, 57, 65, 69], [55, 59, 62, 67]], scale: [72, 76, 79, 81, 84] },
    { name: 'あさの水しぶき', bpm: 88, drums: true, swing: 0.08,
      prog: [[55, 62, 66, 71], [52, 59, 62, 67], [48, 55, 59, 64], [50, 57, 60, 66]], scale: [74, 76, 78, 81, 83] },
  ];

  let playing = false, schedTimer = null, nextTime = 0, step = 0, trackIdx = 0;

  function rhodes(freq, t, dur, vel) {
    const o1 = ctx.createOscillator(); o1.type = 'sine'; o1.frequency.value = freq;
    const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = freq * 2.001;
    const g = ctx.createGain();
    const g2 = ctx.createGain(); g2.gain.value = 0.12;
    // テープのゆらぎ
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.6 + Math.random() * 0.4;
    const lfoG = ctx.createGain(); lfoG.gain.value = freq * 0.0025;
    lfo.connect(lfoG); lfoG.connect(o1.frequency); lfoG.connect(o2.frequency);
    o1.connect(g); o2.connect(g2); g2.connect(g); g.connect(musicBus);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.02);
    g.gain.exponentialRampToValueAtTime(vel * 0.4, t + 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    [o1, o2, lfo].forEach((o) => { o.start(t); o.stop(t + dur + 0.05); });
  }

  function kick(t) {
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
    g.gain.setValueAtTime(0.55, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + 0.4);
  }
  function snare(t) {
    const s = noiseSrc(noiseBuf); const f = ctx.createBiquadFilter(); const g = ctx.createGain();
    f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.7;
    g.gain.setValueAtTime(0.22, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    s.connect(f); f.connect(g); g.connect(musicBus); s.start(t, Math.random()); s.stop(t + 0.22);
  }
  function hat(t, v) {
    const s = noiseSrc(noiseBuf); const f = ctx.createBiquadFilter(); const g = ctx.createGain();
    f.type = 'highpass'; f.frequency.value = 7000;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    s.connect(f); f.connect(g); g.connect(musicBus); s.start(t, Math.random()); s.stop(t + 0.06);
  }
  let crackle;
  function startCrackle() {
    if (crackle) return;
    const s = noiseSrc(noiseBuf); const f = ctx.createBiquadFilter(); const g = ctx.createGain();
    f.type = 'highpass'; f.frequency.value = 2500;
    // レコードのかすかなノイズ
    g.gain.value = 0.012;
    s.connect(f); f.connect(g); g.connect(musicBus); s.start();
    crackle = { s, g };
  }
  function stopCrackle() { if (crackle) { crackle.s.stop(); crackle = null; } }

  function scheduler() {
    const tr = TRACKS[trackIdx];
    const sixteenth = 60 / tr.bpm / 4;
    while (nextTime < ctx.currentTime + 0.15) {
      const bar = Math.floor(step / 16) % tr.prog.length;
      const s16 = step % 16;
      const swing = (s16 % 2 === 1) ? sixteenth * tr.swing : 0;
      const t = nextTime + swing;
      const chord = tr.prog[bar];
      if (s16 === 0) chord.forEach((n, i) => rhodes(midi(n), t + i * 0.012, sixteenth * 15, 0.09));
      if (s16 === 10 && Math.random() < 0.5) chord.slice(1).forEach((n) => rhodes(midi(n), t, sixteenth * 6, 0.05));
      // ベース
      if (s16 === 0 || (s16 === 8 && tr.drums)) rhodes(midi(chord[0] - 12), t, sixteenth * 7, 0.14);
      // メロディ（ときどき）
      if (s16 % 4 === 2 && Math.random() < 0.22) rhodes(midi(M.pick(tr.scale)), t, sixteenth * 5, 0.05);
      if (tr.drums) {
        if (s16 === 0 || s16 === 7 || (s16 === 10 && Math.random() < 0.4)) kick(t);
        if (s16 === 4 || s16 === 12) snare(t);
        if (s16 % 2 === 0) hat(t, s16 % 4 === 0 ? 0.05 : 0.03);
      }
      nextTime += sixteenth;
      step++;
    }
  }

  function playMusic(idx) {
    if (!ensure()) return;
    if (idx != null) trackIdx = idx;
    stopMusic(true);
    playing = true; step = 0; nextTime = ctx.currentTime + 0.1;
    startCrackle();
    schedTimer = setInterval(scheduler, 25);
  }
  function stopMusic(keep) {
    clearInterval(schedTimer); schedTimer = null;
    if (!keep) { playing = false; stopCrackle(); }
  }
  function setMusicVol(v) { if (musicBus) musicBus.gain.setTargetAtTime(v / 100 * 0.5, ctx.currentTime, 0.2); }

  // ---------------- 環境音 ----------------
  const AMBS = {
    rain:    { label: '雨' },
    stream:  { label: '川のせせらぎ' },
    waves:   { label: '波' },
    fire:    { label: '暖炉' },
    wind:    { label: '風' },
    cafe:    { label: 'カフェ' },
    birds:   { label: '小鳥' },
    insects: { label: '夜の虫' },
    chime:   { label: '風鈴' },
    clock:   { label: '時計の音' },
    keys:    { label: 'キーボード' },
    pages:   { label: 'ページをめくる音' },
  };
  const live = {}; // id -> { gain, nodes[], timers[] }

  function filtered(buf, type, freq, q) {
    const s = noiseSrc(buf); const f = ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; if (q) f.Q.value = q;
    s.connect(f); s.start();
    return { s, f };
  }
  function lfo(rate, depth, target, base) {
    const o = ctx.createOscillator(); o.frequency.value = rate;
    const g = ctx.createGain(); g.gain.value = depth;
    o.connect(g); g.connect(target); if (base != null) target.value = base; o.start();
    return o;
  }
  function blip(out, freq, dur, vol, type) {
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = type || 'sine'; o.frequency.value = freq;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.02);
    return o;
  }
  function click(out, freq, vol, dur) {
    const t = ctx.currentTime;
    const s = noiseSrc(noiseBuf); const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 2;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.04));
    s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random() * 3); s.stop(t + (dur || 0.04) + 0.01);
  }
  function every(min, max, fn, timers) {
    const loop = () => { fn(); timers.push(setTimeout(loop, min + Math.random() * (max - min))); };
    timers.push(setTimeout(loop, Math.random() * max));
  }

  function build(id, out) {
    const nodes = [], timers = [];
    if (id === 'rain') {
      const a = filtered(noiseBuf, 'lowpass', 1400); const g = ctx.createGain(); g.gain.value = 0.35;
      a.f.connect(g); g.connect(out); nodes.push(a.s);
      const b = filtered(noiseBuf, 'highpass', 4000); const g2 = ctx.createGain(); g2.gain.value = 0.06;
      b.f.connect(g2); g2.connect(out); nodes.push(b.s);
      every(30, 160, () => click(out, 2500 + Math.random() * 3000, 0.08, 0.02), timers);
    } else if (id === 'stream') {
      const a = filtered(noiseBuf, 'bandpass', 900, 0.8); const g = ctx.createGain(); g.gain.value = 0.5;
      a.f.connect(g); g.connect(out); nodes.push(a.s, lfo(0.3, 300, a.f.frequency));
      every(80, 300, () => blip(out, 600 + Math.random() * 900, 0.08, 0.025), timers);
    } else if (id === 'waves') {
      const a = filtered(noiseBuf, 'lowpass', 700); const g = ctx.createGain(); g.gain.value = 0.2;
      a.f.connect(g); g.connect(out); nodes.push(a.s, lfo(0.09, 0.2, g.gain, 0.22), lfo(0.09, 400, a.f.frequency));
    } else if (id === 'fire') {
      const a = filtered(brownBuf, 'lowpass', 500); const g = ctx.createGain(); g.gain.value = 0.5;
      a.f.connect(g); g.connect(out); nodes.push(a.s);
      every(60, 400, () => click(out, 1500 + Math.random() * 2500, 0.15 + Math.random() * 0.15, 0.03), timers);
    } else if (id === 'wind') {
      const a = filtered(noiseBuf, 'bandpass', 500, 1.5); const g = ctx.createGain(); g.gain.value = 0.25;
      a.f.connect(g); g.connect(out); nodes.push(a.s, lfo(0.05, 300, a.f.frequency), lfo(0.07, 0.12, g.gain, 0.25));
    } else if (id === 'cafe') {
      const a = filtered(brownBuf, 'bandpass', 400, 0.6); const g = ctx.createGain(); g.gain.value = 0.35;
      a.f.connect(g); g.connect(out); nodes.push(a.s, lfo(0.4, 120, a.f.frequency));
      every(2500, 7000, () => { blip(out, 2200 + Math.random() * 1500, 0.4, 0.02, 'triangle'); }, timers);
    } else if (id === 'birds') {
      every(1500, 6000, () => {
        const n = 2 + Math.floor(Math.random() * 4), base = 2500 + Math.random() * 1500;
        for (let i = 0; i < n; i++) setTimeout(() => {
          const t = ctx.currentTime; const o = ctx.createOscillator(); const g = ctx.createGain();
          o.frequency.setValueAtTime(base, t); o.frequency.exponentialRampToValueAtTime(base * 1.4, t + 0.07);
          g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.04, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
          o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.12);
        }, i * 130);
      }, timers);
    } else if (id === 'insects') {
      const o = ctx.createOscillator(); o.frequency.value = 4200;
      const g = ctx.createGain(); g.gain.value = 0;
      o.connect(g); g.connect(out); o.start(); nodes.push(o, lfo(18, 0.012, g.gain, 0.012));
    } else if (id === 'chime') {
      every(4000, 12000, () => {
        const f = M.pick([1568, 1760, 2093, 2349, 2637]);
        blip(out, f, 2.5, 0.04); blip(out, f * 2.76, 1.2, 0.01);
      }, timers);
    } else if (id === 'clock') {
      every(1000, 1000, () => click(out, 3500, 0.12, 0.015), timers);
    } else if (id === 'keys') {
      every(90, 420, () => { if (Math.random() < 0.85) click(out, 1800 + Math.random() * 1200, 0.12, 0.03); }, timers);
    } else if (id === 'pages') {
      every(8000, 20000, () => {
        const t = ctx.currentTime; const s = noiseSrc(noiseBuf); const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 3000;
        const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.08, t + 0.15); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
        s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random() * 3); s.stop(t + 0.55);
      }, timers);
    }
    return { nodes, timers };
  }

  function setAmb(id, vol) {
    if (!ensure()) return;
    const v = vol / 100;
    if (v <= 0) {
      if (live[id]) {
        const L = live[id]; delete live[id];
        L.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
        L.timers.forEach(clearTimeout);
        setTimeout(() => L.nodes.forEach((n) => { try { n.stop(); } catch (e) {} }), 1500);
      }
      return;
    }
    if (!live[id]) {
      const g = ctx.createGain(); g.gain.value = 0; g.connect(ambBus);
      const b = build(id, g);
      live[id] = { gain: g, nodes: b.nodes, timers: b.timers };
    }
    live[id].gain.gain.setTargetAtTime(v, ctx.currentTime, 0.4);
  }

  // やさしいチャイム（ポモドーロの切りかわり）
  function chime(kind) {
    if (!ensure()) return;
    const notes = kind === 'break' ? [76, 79, 84] : [72, 76, 79];
    notes.forEach((n, i) => {
      const t = ctx.currentTime + i * 0.28;
      const o = ctx.createOscillator(); o.frequency.value = midi(n);
      const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.12, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + 1.9);
    });
  }

  return {
    TRACKS, AMBS, ensure, playMusic, stopMusic, setMusicVol, setAmb, chime,
    get playing() { return playing; }, get track() { return trackIdx; },
  };
})();
