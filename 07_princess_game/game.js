/* 光の姫の旅路 — ゲーム本体 */
'use strict';
(() => {
  /* ================= ユーティリティ ================= */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const uid = () => Math.random().toString(36).slice(2, 10);
  const pad = n => String(n).padStart(2, '0');
  const dkey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const WD = ['日', '月', '火', '水', '木', '金', '土'];
  const fmtHM = ms => { const m = Math.floor(ms / 60000); return `${Math.floor(m / 60)}:${pad(m % 60)}`; };
  const fmtMin = ms => Math.floor(ms / 60000);
  const clock = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`; };
  const hexRgb = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const rgbHex = a => '#' + a.map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
  const shade = (hex, amt) => rgbHex(hexRgb(hex).map(v => amt < 0 ? v * (1 + amt) : v + (255 - v) * amt));
  const EQ = Object.fromEntries(EQUIPMENT.map(e => [e.id, e]));
  const OF = Object.fromEntries(OUTFITS.map(o => [o.id, o]));
  const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ================= セーブデータ ================= */
  const KEY = 'hikari-hime-save-v1';
  function fresh() {
    const today = dkey();
    return {
      v: 1,
      settings: { work: 25, short: 5, long: 15, every: 4, auto: true, sound: true },
      timer: { mode: 'work', running: false, endAt: 0, remain: 25 * 60000, cycle: 0, sessStart: 0, sessMs: 0, last: 0 },
      stats: { launches: 0, totalMs: 0, sessions: 0, longestMs: 0, kills: 0, cheers: 0, gratitude: 0, talks: 0, maxDepth: 0, tasksDone: 0, schedDone: 0, urHeard: 0 },
      days: {}, sessLog: [],
      tasks: [
        { id: uid(), title: '（例）企画書の構成を書き出す', due: today, est: 2, pomo: 0, done: false, counted: false },
        { id: uid(), title: '（例）メールの返信をまとめて片付ける', due: '', est: 1, pomo: 0, done: false, counted: false },
      ],
      sched: [{ id: uid(), date: today, time: '', title: '（例）まずは1回だけ作業する', done: false, counted: false }],
      curTask: null,
      lv: { atk: 1, atkXp: 0, sup: 1, supXp: 0 },
      inv: { e01: 0 }, drops: {}, equip: { weapon: 'e01', guard: null },
      look: { outfit: 'o01', hair: 'long', color: '#e8b04a' },
      ach: {}, read: {}, seenUnlocked: 0, cleared: false,
      lines: {},
      adv: { phase: 'walk', next: 15000, acc: 0, foe: null, npc: null },
      abyss: false, depth: 0, log: [],
    };
  }
  function merge(base, src) {
    if (!src || typeof src !== 'object' || Array.isArray(src)) return src ?? base;
    const out = { ...base };
    for (const k of Object.keys(src)) {
      out[k] = (base && typeof base[k] === 'object' && base[k] && !Array.isArray(base[k])) ? merge(base[k], src[k]) : src[k];
    }
    return out;
  }
  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) return merge(fresh(), JSON.parse(raw)); } catch (e) { /* 保存領域が使えない */ }
    return fresh();
  }
  let S = load();
  let saveTimer = 0;
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* noop */ } }
  function saveSoon() { clearTimeout(saveTimer); saveTimer = setTimeout(save, 800); }

  /* ================= 派生値 ================= */
  const totalMin = () => S.stats.totalMs / 60000;
  const storyPoints = () => Math.floor(totalMin() / 30) + Object.keys(S.ach).length;
  function unlockedCount() { const p = storyPoints(); let n = 0; while (n < 50 && p >= storyReq(n + 1)) n++; return n; }
  const regionIdx = () => Math.min(9, Math.floor(Math.max(0, unlockedCount() - 1) / 5));
  const tier = () => S.abyss ? 10 + S.depth * 0.35 : regionIdx() + 1;
  const vivid = () => S.cleared ? 1 : Math.min(1, 0.65 * unlockedCount() / 50 + 0.35 * Math.min(1, totalMin() / 3000));
  const xpNeed = lv => 20 + lv * 10;
  function itemStat(e) { const m = 1 + 0.1 * (S.inv[e.id] || 0); return { atk: Math.round(e.atk * m), sup: Math.round(e.sup * m) }; }
  function power() {
    let atk = 4 + S.lv.atk * 2, sup = 4 + S.lv.sup * 2;
    for (const slot of ['weapon', 'guard']) {
      const id = S.equip[slot];
      if (id && id in S.inv) { const st = itemStat(EQ[id]); atk += st.atk; sup += st.sup; }
    }
    const o = OF[S.look.outfit]; if (o) { atk += o.atk; sup += o.sup; }
    return { atk, sup };
  }
  function streaks() {
    const keys = Object.keys(S.days).filter(k => S.days[k] >= 60000).sort();
    let best = 0, run = 0, prev = null;
    for (const k of keys) { const d = parseKey(k); run = (prev && Math.round((d - prev) / 864e5) === 1) ? run + 1 : 1; best = Math.max(best, run); prev = d; }
    let cur = 0; const d = new Date(); d.setHours(0, 0, 0, 0);
    if (!(S.days[dkey(d)] >= 60000)) d.setDate(d.getDate() - 1);
    while (S.days[dkey(d)] >= 60000) { cur++; d.setDate(d.getDate() - 1); }
    return { best, cur };
  }
  function statsView() {
    const st = S.stats;
    return {
      sessions: st.sessions, totalMin: totalMin(), launches: st.launches, longestMin: st.longestMs / 60000,
      bestDayMin: Math.max(0, ...Object.values(S.days)) / 60000, bestStreak: streaks().best,
      kills: st.kills, cheers: st.cheers, tasksDone: st.tasksDone, schedDone: st.schedDone, talks: st.talks,
      linesHeard: Object.keys(S.lines).length, urHeard: st.urHeard, itemsOwned: Object.keys(S.inv).length,
      maxPlus: Math.max(0, ...Object.values(S.inv)), cleared: S.cleared, maxDepth: st.maxDepth,
    };
  }
  function isUnlocked(u, id) {
    if (u === 'start') return true;
    if (u === 'drop') return !!S.drops[id];
    if (u.story) return unlockedCount() >= u.story;
    if (u.ach) return !!S.ach[u.ach];
    return false;
  }
  function unlockText(u) {
    if (u === 'drop') return '冒険中に見つかる';
    if (u.story) return `物語 第${u.story}話で解放`;
    if (u.ach) { const a = ACHIEVEMENTS.find(x => x.id === u.ach); return `実績「${a ? a.name : u.ach}」で解放`; }
    return '';
  }

  /* ================= ログ・トースト ================= */
  let dirty = true, panelDirty = true;
  function addLog(c, m) { S.log.push({ t: Date.now(), c, m }); if (S.log.length > 80) S.log.splice(0, S.log.length - 80); dirty = true; }
  function toast(head, body) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<b>${esc(head)}</b>${esc(body)}`;
    $('#toasts').appendChild(el);
    setTimeout(() => el.remove(), 4800);
    while ($('#toasts').children.length > 4) $('#toasts').firstChild.remove();
  }

  /* ================= 成長・実績・物語解放 ================= */
  function gainXp(kind, amt) {
    const k = kind + 'Xp';
    S.lv[k] += amt;
    while (S.lv[k] >= xpNeed(S.lv[kind])) {
      S.lv[k] -= xpNeed(S.lv[kind]);
      S.lv[kind]++;
      addLog('sys', `${kind === 'atk' ? '攻撃力' : '応援力'}が Lv${S.lv[kind]} に上がった`);
    }
  }
  function announceRewards(test) {
    const hit = u => u && typeof u === 'object' && ((test.story && u.story === test.story) || (test.ach && u.ach === test.ach));
    OUTFITS.filter(o => hit(o.unlock)).forEach(o => toast('新しい服装', o.name));
    HAIRSTYLES.filter(h => hit(h.unlock)).forEach(h => toast('新しい髪型', h.name));
    HAIRCOLORS.filter(h => hit(h.unlock)).forEach(h => toast('新しい髪色', h.name));
  }
  function checkProgress() {
    const sv = statsView();
    let changed = false;
    for (const a of ACHIEVEMENTS) {
      if (!S.ach[a.id] && a.cond(sv)) {
        S.ach[a.id] = Date.now(); changed = true;
        toast('実績を達成', a.name);
        addLog('sys', `実績「${a.name}」を達成した`);
        announceRewards({ ach: a.id });
      }
    }
    const u = unlockedCount();
    if (u > S.seenUnlocked) {
      for (let n = S.seenUnlocked + 1; n <= u; n++) {
        toast('物語が解放されました', `第${n}話「${STORY[n - 1].title}」`);
        addLog('sys', `物語 第${n}話「${STORY[n - 1].title}」が読めるようになった`);
        if (n > 1 && (n - 1) % 5 === 0) addLog('sys', `姫は「${REGIONS[(n - 1) / 5].name}」にたどり着いた`);
        announceRewards({ story: n });
      }
      S.seenUnlocked = u; changed = true;
    }
    if (changed) { dirty = panelDirty = true; saveSoon(); }
  }

  /* ================= 冒険（作業1秒ごとに進む） ================= */
  let quiet = false; // 長時間の追いつき処理中は演出を控える
  let sunUntil = 0;
  function sunburst() {
    if (quiet) return;
    sunUntil = performance.now() + 9000;
    const f = $('#flash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
  }
  function spawn() {
    const A = S.adv, t = tier();
    if (Math.random() < 0.62) {
      const base = S.abyss ? pick(ABYSS_MONSTERS) : pick(MONSTERS[regionIdx()]);
      const elite = Math.random() < 0.12;
      const hp = Math.round(35 * Math.pow(t, 1.35) * rand(0.85, 1.15) * (elite ? 2.5 : 1));
      const victim = !S.abyss && Math.random() < 0.3 ? pick(PEOPLE) : null;
      A.foe = { name: base[0], color: base[1], shape: base[2], hp, max: hp, t: 0, elite, victim, tier: t };
      A.phase = 'battle';
      addLog('', victim ? `${victim}が${base[0]}に襲われている！ 姫は駆け寄った` : `${elite ? '強敵 ' : ''}${base[0]}が現れた`);
    } else {
      A.npc = { name: pick(PEOPLE), color: pick(['#7a6a8a', '#6a7a6a', '#8a6a5a', '#5a6a8a', '#8a7a5a']), t: 0, tier: t };
      A.phase = 'cheer';
      addLog('', `${A.npc.name}に出会った`);
    }
    dirty = true;
  }
  function rollRarity(t) {
    const w = { N: 60, R: 22 + t * 1.5, SR: 4 + t * 1.1, SSR: 0.5 + t * 0.3 };
    let r = Math.random() * (w.N + w.R + w.SR + w.SSR);
    for (const k of RARITY_ORDER) { if ((r -= w[k]) < 0) return k; }
    return 'N';
  }
  function dropLoot(t, elite) {
    if (Math.random() > (elite ? 0.5 : 0.12)) return;
    let rar = rollRarity(t);
    const cap = S.abyss ? 99 : 10;
    const wantOutfit = Math.random() < 0.3;
    for (let ri = RARITY_ORDER.indexOf(rar); ri >= 0; ri--) {
      rar = RARITY_ORDER[ri];
      if (wantOutfit) {
        const pool = OUTFITS.filter(o => o.unlock === 'drop' && o.rarity === rar && !S.drops[o.id]);
        if (pool.length) {
          const o = pick(pool); S.drops[o.id] = true;
          addLog('loot', `【${rar}】服装「${o.name}」を手に入れた`); toast('服装を手に入れた', `【${rar}】${o.name}`);
          return;
        }
      }
      const pool = EQUIPMENT.filter(e => e.rarity === rar && (e.id === 'e30' ? S.abyss : e.tier <= Math.ceil(t) + 1));
      if (!pool.length) continue;
      const e = pick(pool);
      if (!(e.id in S.inv)) {
        S.inv[e.id] = 0;
        addLog('loot', `【${rar}】装備「${e.name}」を手に入れた`); toast('装備を手に入れた', `【${rar}】${e.name}`);
      } else if (S.inv[e.id] < cap) {
        S.inv[e.id]++;
        addLog('loot', `「${e.name}」が重なって +${S.inv[e.id]} に強化された`);
      } else {
        S.stats.gratitude += 3;
        addLog('loot', `「${e.name}」は鍛え抜かれている。村に寄付した（感謝+3）`);
      }
      return;
    }
  }
  function step() {
    const A = S.adv, P = power();
    if (A.phase === 'walk') {
      A.next -= 1000;
      if (A.next <= 0) spawn();
      return;
    }
    if (A.phase === 'battle' && A.foe) {
      const F = A.foe;
      F.t++;
      const crit = Math.random() < 0.1;
      F.hp -= P.atk * rand(0.75, 1.25) * (crit ? 2 : 1);
      if (F.hp <= 0) {
        S.stats.kills++;
        gainXp('atk', 4 + F.tier * 2 * (F.elite ? 2 : 1));
        addLog('win', `${F.name}を討伐した。雲が裂け、光が差し込む`);
        if (F.victim) {
          S.stats.cheers++; S.stats.gratitude += 4 + Math.ceil(F.tier);
          addLog('cheer', `${F.victim}「助かりました、お姫さま！」（感謝+${4 + Math.ceil(F.tier)}）`);
        }
        if (S.abyss) {
          S.depth++; S.stats.maxDepth = Math.max(S.stats.maxDepth, S.depth + 1);
          addLog('sys', `常闇の底 第${S.depth + 1}層へ。灯りがまた少し届いた`);
        }
        dropLoot(F.tier, F.elite);
        sunburst();
        A.foe = null; A.phase = 'walk'; A.next = (S.abyss ? rand(25, 50) : rand(35, 75)) * 1000;
        checkProgress();
      } else if (F.t >= 15) {
        gainXp('atk', 2);
        addLog('', `${F.name}は${S.abyss ? '闇' : '霧'}の中へ逃げていった`);
        A.foe = null; A.phase = 'walk'; A.next = rand(35, 70) * 1000;
      }
      dirty = true;
      return;
    }
    if (A.phase === 'cheer' && A.npc) {
      const N = A.npc;
      N.t++;
      if (N.t >= 4) {
        const need = 14 * Math.pow(N.tier, 1.25) * rand(0.8, 1.2);
        const pow = P.sup * rand(0.8, 1.3);
        S.stats.cheers++;
        if (pow >= need) {
          const g = 5 + Math.ceil(N.tier * 2);
          S.stats.gratitude += g;
          gainXp('sup', 6 + N.tier * 2);
          addLog('cheer', `姫「${pick(CHEERS)}」 — ${N.name}の顔がぱっと明るくなった（感謝+${g}）`);
          if (Math.random() < 0.08) {
            const pool = OUTFITS.filter(o => o.unlock === 'drop' && !S.drops[o.id] && RARITY_ORDER.indexOf(o.rarity) <= Math.min(3, Math.floor(N.tier / 3)));
            if (pool.length) { const o = pick(pool); S.drops[o.id] = true; addLog('loot', `お礼に服装「${o.name}」をもらった`); toast('お礼の贈り物', o.name); }
          }
        } else {
          S.stats.gratitude += 1;
          gainXp('sup', 3);
          addLog('cheer', `姫「${pick(CHEERS)}」 — ${N.name}は少しだけ元気を取り戻した（感謝+1）`);
        }
        A.npc = null; A.phase = 'walk'; A.next = rand(35, 75) * 1000;
        checkProgress();
      }
      dirty = true;
    }
  }
  function advance(dt) {
    const A = S.adv;
    A.acc += dt;
    quiet = dt > 5000;
    let guard = 0;
    while (A.acc >= 1000 && guard++ < 20000) { A.acc -= 1000; step(); }
    quiet = false;
  }
  function addWork(dt) {
    const T = S.timer;
    S.stats.totalMs += dt;
    const k = dkey(); S.days[k] = (S.days[k] || 0) + dt;
    T.sessMs += dt;
    gainXp('atk', dt / 60000 * 5);
    gainXp('sup', dt / 60000 * 5);
    advance(dt);
    dirty = true;
  }

  /* ================= タイマー ================= */
  const MODE_LABEL = { work: '作業', short: '小休憩', long: '長休憩' };
  const dur = m => S.settings[m] * 60000;
  let actx = null;
  function ensureAudio() {
    try { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch (e) { actx = null; }
  }
  function chime() {
    if (!S.settings.sound || !actx) return;
    try {
      [784, 988, 1175, 1568].forEach((f, i) => {
        const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + i * 0.17;
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.16, t + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
        o.connect(g).connect(actx.destination); o.start(t); o.stop(t + 1);
      });
    } catch (e) { /* noop */ }
  }
  function notify(title, body) {
    try { if ('Notification' in window && Notification.permission === 'granted' && document.hidden) new Notification(title, { body }); } catch (e) { /* noop */ }
  }
  const taskById = id => S.tasks.find(t => t.id === id);
  function finishSession(completed) {
    const T = S.timer, ms = T.sessMs;
    if (completed || ms >= 60000) {
      const t = taskById(S.curTask);
      S.sessLog.push({ s: T.sessStart || Date.now() - ms, ms, task: t ? t.title : '', full: completed });
      if (S.sessLog.length > 500) S.sessLog.splice(0, S.sessLog.length - 500);
      S.stats.longestMs = Math.max(S.stats.longestMs, ms);
      if (completed) { S.stats.sessions++; if (t) t.pomo++; }
    }
    T.sessMs = 0; T.sessStart = 0;
    panelDirty = true;
  }
  function start() {
    const T = S.timer;
    if (T.running) return;
    ensureAudio();
    try { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => {}); } catch (e) { /* noop */ }
    T.running = true; T.endAt = Date.now() + T.remain; T.last = Date.now();
    if (T.mode === 'work' && !T.sessStart) T.sessStart = Date.now();
    if (T.mode === 'work' && S.adv.phase === 'walk' && S.log.length < 3) addLog('', '姫は旅のマントを羽織り、歩き出した');
    dirty = true; save();
  }
  function pause() {
    const T = S.timer;
    if (!T.running) return;
    tick();
    T.remain = Math.max(0, T.endAt - Date.now()); T.running = false;
    dirty = true; save();
  }
  function setMode(m, run) {
    const T = S.timer;
    T.mode = m; T.remain = dur(m); T.running = false;
    if (run) start();
    dirty = true; save();
  }
  function stopRun() {
    const T = S.timer;
    if (T.running) tick();
    if (T.mode === 'work') finishSession(false);
    T.running = false; T.remain = dur(T.mode);
    dirty = true; checkProgress(); save();
  }
  function complete() {
    const T = S.timer;
    if (T.mode === 'work') {
      const min = Math.round(T.sessMs / 60000);
      finishSession(true);
      T.cycle++;
      setMode(T.cycle % S.settings.every === 0 ? 'long' : 'short', S.settings.auto);
      chime();
      toast('作業完了', `${min}分の作業、おつかれさま！`);
      notify('作業完了', `${min}分の作業、おつかれさま！ 休憩しましょう`);
      addLog('sys', `作業を1回やり遂げた（${min}分）。姫は焚き火を起こしてひと休み`);
      say(Math.random() < 0.3 ? 'R' : 'N');
    } else {
      setMode('work', false);
      chime();
      toast('休憩おわり', '次の作業をはじめましょう');
      notify('休憩おわり', '次の作業をはじめましょう');
    }
    checkProgress();
  }
  function skip() {
    const T = S.timer;
    if (T.running) tick();
    if (T.mode === 'work') { finishSession(false); setMode('short', false); }
    else setMode('work', false);
    checkProgress();
  }
  let lastSave = 0, lastPanel = 0;
  function tick() {
    const now = Date.now(), T = S.timer;
    if (T.running) {
      if (T.mode === 'work') {
        const upto = Math.min(now, T.endAt);
        const dt = Math.max(0, upto - (T.last || upto));
        if (dt > 0) addWork(dt);
        T.last = upto;
      }
      if (now >= T.endAt) complete();
      if (now - lastSave > 5000) { lastSave = now; save(); checkProgress(); }
    }
  }

  /* ================= 姫との会話 ================= */
  function talkWeights() {
    const h = Math.min(120, totalMin() / 60);
    const c = (S.timer.mode === 'work' && S.timer.running) ? S.timer.sessMs / 60000 : 0;
    return { N: 100, R: 30 + h * 1.2, SR: 5 + h * 0.6 + c * 0.15, UR: 0.6 + h * 0.15 + c * 0.05 };
  }
  const LINE_RARS = ['N', 'R', 'SR', 'UR'];
  let bubbleTimer = 0;
  function say(forced) {
    let rar = forced;
    if (!rar) {
      const w = talkWeights();
      let r = Math.random() * (w.N + w.R + w.SR + w.UR);
      rar = 'N';
      for (const k of LINE_RARS) { if ((r -= w[k]) < 0) { rar = k; break; } }
    }
    const pool = LINES[rar];
    const unheard = pool.map((_, i) => i).filter(i => !S.lines[rar + i]);
    const i = unheard.length && Math.random() < 0.6 ? pick(unheard) : Math.floor(Math.random() * pool.length);
    const key = rar + i;
    if (!S.lines[key] && rar === 'UR') S.stats.urHeard++;
    S.lines[key] = (S.lines[key] || 0) + 1;
    const b = $('#bubble');
    b.innerHTML = `<span class="rar rar-${rar}">${rar}</span>${esc(pool[i])}`;
    b.hidden = false;
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => { b.hidden = true; }, 8000);
    panelDirty = true;
  }
  function talk() {
    S.stats.talks++;
    say();
    checkProgress(); saveSoon();
  }

  /* ================= 姫・魔物・人々の絵 ================= */
  const SKIN = '#ffe2cf';
  const GLOW = { N: '#c8d0dc', R: '#8fc8ff', SR: '#c6a2ff', SSR: '#ffd36b' };
  const GOLD = '#e9b84a';
  const SHORT_BACK = c => `<path d="M35,46 Q35,24 60,24 Q85,24 85,46 L84,66 Q60,72 36,66 Z" fill="${c}"/>`;
  const HAIR_BACK = {
    long: c => `<path d="M34,46 Q34,22 60,22 Q86,22 86,46 L90,118 Q75,126 60,122 Q45,126 30,118 Z" fill="${c}"/>`,
    hime: c => `<path d="M34,46 Q34,22 60,22 Q86,22 86,46 L88,120 L32,120 Z" fill="${c}"/>`,
    wave: c => `<path d="M34,46 Q34,22 60,22 Q86,22 86,46 Q94,70 86,88 Q96,104 86,122 Q72,128 60,120 Q48,128 34,122 Q24,104 34,88 Q26,70 34,46 Z" fill="${c}"/>`,
    curl: c => `<path d="M34,46 Q34,22 60,22 Q86,22 86,46 L88,100 Q60,108 32,100 Z" fill="${c}"/>` +
      [[33, 102], [44, 109], [76, 109], [87, 102]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="8" fill="${c}"/><path d="M${x - 4},${y - 2} Q${x},${y + 5} ${x + 4},${y - 2}" stroke="${shade(c, -0.25)}" fill="none" stroke-width="1.2"/>`).join(''),
    half: c => `<path d="M34,46 Q34,22 60,22 Q86,22 86,46 L89,116 Q75,124 60,120 Q45,124 31,116 Z" fill="${c}"/>`,
    bob: c => `<path d="M33,48 Q32,22 60,22 Q88,22 87,48 L88,78 Q74,84 60,80 Q46,84 32,78 Z" fill="${c}"/>`,
    short: c => SHORT_BACK(c),
    pony: c => SHORT_BACK(c) + `<path d="M78,30 Q106,40 98,80 Q94,104 102,124 Q84,114 84,84 Q82,56 72,38 Z" fill="${c}"/>`,
    twin: c => SHORT_BACK(c) + `<path d="M40,34 Q12,48 18,86 Q20,110 12,126 Q32,116 32,88 Q34,60 44,42 Z" fill="${c}"/><path d="M80,34 Q108,48 102,86 Q100,110 108,126 Q88,116 88,88 Q86,60 76,42 Z" fill="${c}"/>`,
    side: c => SHORT_BACK(c) + `<path d="M38,50 Q16,64 22,96 Q24,116 14,130 Q34,122 36,94 Q38,72 44,56 Z" fill="${c}"/>`,
    braid: c => SHORT_BACK(c) + [74, 84, 94, 104, 114].map((y, i) => `<ellipse cx="${80 + i}" cy="${y}" rx="${7 - i * 0.5}" ry="6" fill="${c}" stroke="${shade(c, -0.25)}" stroke-width="1"/>`).join(''),
    bun: c => SHORT_BACK(c),
  };
  const BANGS_SWEPT = c => `<path d="M36,48 Q36,24 60,24 Q84,24 84,48 Q80,38 72,34 Q68,44 58,47 Q62,38 56,33 Q46,42 36,48 Z" fill="${c}"/>`;
  const BANGS_STRAIGHT = c => `<path d="M36,48 Q36,24 60,24 Q84,24 84,48 L79,44 L73,47 L67,43 L60,47 L53,43 L47,47 L41,44 Z" fill="${c}"/>`;
  function hairFront(style, c) {
    const d = shade(c, -0.22);
    let s = (style === 'hime' || style === 'bob') ? BANGS_STRAIGHT(c) : BANGS_SWEPT(c);
    if (style !== 'short' && style !== 'bun') {
      const len = style === 'bob' ? 80 : 76;
      s += `<path d="M36,44 Q30,62 35,${len} Q41,64 40,46 Z" fill="${c}"/><path d="M84,44 Q90,62 85,${len} Q79,64 80,46 Z" fill="${c}"/>`;
    }
    if (style === 'bun') s += `<circle cx="39" cy="27" r="9" fill="${c}" stroke="${d}" stroke-width="1"/><circle cx="81" cy="27" r="9" fill="${c}" stroke="${d}" stroke-width="1"/>`;
    if (style === 'pony') s += `<circle cx="80" cy="33" r="3" fill="#ff8fb0"/>`;
    if (style === 'twin') s += `<circle cx="41" cy="36" r="3" fill="#ff8fb0"/><circle cx="79" cy="36" r="3" fill="#ff8fb0"/>`;
    if (style === 'side') s += `<circle cx="40" cy="52" r="3" fill="#ff8fb0"/>`;
    if (style === 'half') s += `<path d="M76,30 L86,24 L86,36 Z M76,30 L66,24 L68,36 Z" fill="#ff8fb0"/>`;
    s += `<path d="M44,30 Q52,26 58,28" stroke="${shade(c, 0.35)}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".7"/>`;
    return s;
  }
  const legs = (boot, leg = SKIN, top = 128) => `<line x1="53" y1="${top}" x2="53" y2="154" stroke="${leg}" stroke-width="6" stroke-linecap="round"/><line x1="67" y1="${top}" x2="67" y2="154" stroke="${leg}" stroke-width="6" stroke-linecap="round"/><path d="M48,148 L57,148 L58,160 L46,160 Z" fill="${boot}"/><path d="M63,148 L72,148 L74,160 L62,160 Z" fill="${boot}"/>`;
  const arms = (c = SKIN) => `<path d="M47,82 Q40,96 38,108" stroke="${c}" stroke-width="5.5" fill="none" stroke-linecap="round"/><path d="M73,82 Q82,94 86,106" stroke="${c}" stroke-width="5.5" fill="none" stroke-linecap="round"/>`;
  const hands = `<circle cx="38" cy="109" r="3.3" fill="${SKIN}"/><circle cx="86" cy="107" r="3.3" fill="${SKIN}"/>`;
  const BODY = {
    gown: ([m, s, a]) => ({
      body: `<path d="M46,98 Q30,128 18,160 Q60,168 102,160 Q90,128 74,98 Z" fill="${m}"/><path d="M52,100 Q46,132 42,162 L78,162 Q74,132 68,100 Z" fill="${s}" opacity=".45"/><path d="M20,158 Q60,167 100,158" fill="none" stroke="${a}" stroke-width="3"/><path d="M48,76 Q60,72 72,76 L74,100 L46,100 Z" fill="${m}"/><path d="M50,77 Q60,85 70,77" fill="none" stroke="${s}" stroke-width="2"/><rect x="45" y="96" width="30" height="5" rx="2" fill="${a}"/>`,
      top: arms() + `<circle cx="46" cy="80" r="6" fill="${s}"/><circle cx="74" cy="80" r="6" fill="${s}"/>`,
    }),
    short: ([m, s, a]) => ({
      body: legs(a) + `<path d="M46,98 Q36,116 32,134 Q60,140 88,134 Q84,116 74,98 Z" fill="${m}"/><path d="M33,133 Q60,139 87,133" stroke="${s}" stroke-width="3" fill="none"/><path d="M48,76 Q60,72 72,76 L74,100 L46,100 Z" fill="${m}"/><path d="M50,77 Q60,86 70,77" fill="none" stroke="${s}" stroke-width="2.5"/><rect x="45" y="96" width="30" height="5" rx="2" fill="${a}"/>`,
      top: arms() + `<circle cx="46" cy="80" r="5" fill="${m}"/><circle cx="74" cy="80" r="5" fill="${m}"/>`,
    }),
    armor: ([m, s, a]) => ({
      body: legs(m, s) + `<path d="M44,100 L76,100 L84,138 L36,138 Z" fill="${s}"/><path d="M52,100 L48,138 M60,100 L60,138 M68,100 L72,138" stroke="${m}" stroke-width="1.3"/><path d="M46,76 L74,76 L76,102 L44,102 Z" fill="${m}"/><path d="M50,80 Q60,92 70,80 L69,96 Q60,100 51,96 Z" fill="${s}" stroke="${a}" stroke-width="1.2"/><rect x="43" y="98" width="34" height="5" rx="2" fill="${a}"/>`,
      top: arms(s) + `<ellipse cx="45" cy="80" rx="8" ry="6" fill="${m}" stroke="${a}" stroke-width="1.2"/><ellipse cx="75" cy="80" rx="8" ry="6" fill="${m}" stroke="${a}" stroke-width="1.2"/>`,
    }),
    robe: ([m, s, a]) => ({
      body: `<path d="M46,76 Q60,72 74,76 L86,160 L34,160 Z" fill="${m}"/><path d="M56,80 L64,80 L70,160 L50,160 Z" fill="${s}"/><rect x="44" y="97" width="32" height="5" rx="2" fill="${a}"/>`,
      top: arms() + `<path d="M47,78 Q34,96 30,114 L44,116 Q46,98 52,86 Z" fill="${m}" stroke="${s}" stroke-width="1"/><path d="M73,78 Q86,96 90,114 L76,116 Q74,98 68,86 Z" fill="${m}" stroke="${s}" stroke-width="1"/>`,
    }),
    travel: ([m, s, a]) => ({
      cape: `<path d="M44,76 L26,146 Q60,156 94,146 L76,76 Z" fill="${m}"/>`,
      body: legs(shade(a, -0.3), shade(s, -0.35), 124) + `<path d="M48,76 L72,76 L78,126 L42,126 Z" fill="${s}"/><rect x="44" y="98" width="32" height="5" rx="2" fill="${a}"/><path d="M45,77 Q60,88 75,77" stroke="${m}" stroke-width="4" fill="none"/><circle cx="60" cy="82" r="2.6" fill="${a}"/>`,
      top: arms(s),
    }),
    winter: ([m, s, a]) => ({
      body: legs(s, shade(m, -0.3), 134) + `<path d="M46,76 L74,76 L84,142 L36,142 Z" fill="${m}"/><path d="M37,142 Q60,148 83,142" stroke="${s}" stroke-width="6" fill="none" stroke-linecap="round"/>` + [90, 102, 114, 126].map(y => `<circle cx="60" cy="${y}" r="1.8" fill="${a}"/>`).join(''),
      top: arms(m) + `<ellipse cx="60" cy="78" rx="16" ry="5" fill="${s}"/>`,
    }),
  };
  function weaponSVG(kind, rar) {
    const g = GLOW[rar] || GLOW.N;
    switch (kind) {
      case 'sword': return (rar !== 'N' ? `<line x1="84" y1="112" x2="102" y2="70" stroke="${g}" stroke-width="7" stroke-linecap="round" opacity=".35"/>` : '') +
        `<line x1="84" y1="112" x2="102" y2="70" stroke="#eef2f8" stroke-width="3.2" stroke-linecap="round"/><line x1="80" y1="104" x2="92" y2="110" stroke="${GOLD}" stroke-width="2.6" stroke-linecap="round"/><circle cx="83" cy="114" r="2" fill="${g}"/>`;
      case 'staff': return `<line x1="90" y1="148" x2="94" y2="66" stroke="#8a5a3a" stroke-width="3" stroke-linecap="round"/><circle cx="94" cy="62" r="9" fill="${g}" opacity=".3"/><circle cx="94" cy="62" r="5.5" fill="${g}"/><circle cx="92.5" cy="60.5" r="2" fill="#fff" opacity=".85"/>`;
      case 'wand': return `<line x1="84" y1="110" x2="96" y2="88" stroke="#f4ead0" stroke-width="2.4" stroke-linecap="round"/><path d="M96,77 L98.5,83 L105,84 L100,88 L101.5,94.5 L96,91 L90.5,94.5 L92,88 L87,84 L93.5,83 Z" fill="${g}"/>`;
      case 'bow': return `<path d="M92,68 Q110,106 92,144" fill="none" stroke="#8a5a3a" stroke-width="3" stroke-linecap="round"/><line x1="92" y1="68" x2="92" y2="144" stroke="#f0f0f0" stroke-width=".8"/><circle cx="101" cy="106" r="2" fill="${g}"/>`;
      case 'spear': return `<line x1="80" y1="150" x2="100" y2="60" stroke="#8a6a4a" stroke-width="2.6" stroke-linecap="round"/><path d="M102,48 L96,62 L104,64 Z" fill="${g}" stroke="#e8eef6" stroke-width="1"/>`;
      case 'hammer': return `<line x1="84" y1="114" x2="96" y2="80" stroke="#7a5a3a" stroke-width="3.2" stroke-linecap="round"/><rect x="86" y="70" width="22" height="13" rx="2" fill="#9aa4b0" stroke="${g}" stroke-width="1.5" transform="rotate(20 97 76)"/>`;
      case 'book': return `<rect x="80" y="97" width="15" height="19" rx="2" fill="${g}" stroke="#5a3a2a" stroke-width="1"/><line x1="84" y1="97" x2="84" y2="116" stroke="#5a3a2a" stroke-width="1"/>`;
      case 'harp': return `<path d="M84,114 Q80,86 98,78 Q106,96 96,114 Z" fill="none" stroke="${GOLD}" stroke-width="2.5"/>` + [88, 92, 96].map(x => `<line x1="${x}" y1="${88 + (x - 88) * -0.5}" x2="${x}" y2="112" stroke="${g}" stroke-width=".8"/>`).join('');
      case 'lantern': return `<circle cx="94" cy="104" r="18" fill="#ffd36b" opacity=".22"/><line x1="86" y1="104" x2="92" y2="94" stroke="#7a6a5a" stroke-width="1.5"/><rect x="88" y="95" width="12" height="16" rx="3" fill="#ffe08a" stroke="#8a6a3a" stroke-width="1.2"/>`;
      case 'shield': return `<path d="M24,96 L44,96 L44,110 Q44,122 34,128 Q24,122 24,110 Z" fill="${g}" stroke="${GOLD}" stroke-width="1.6"/><path d="M34,100 L34,122 M27,108 L41,108" stroke="#fff" stroke-width="1" opacity=".6"/>`;
      case 'charm': return `<path d="M52,77 Q60,88 68,77" fill="none" stroke="${GOLD}" stroke-width=".9"/><circle cx="60" cy="87" r="3.2" fill="${g}" stroke="${GOLD}" stroke-width=".8"/>`;
      case 'ring': return `<circle cx="38" cy="109" r="2.6" fill="none" stroke="${g}" stroke-width="1.5"/><path d="M33,103 L34,105 L36,106 L34,107 L33,109 L32,107 L30,106 L32,105 Z" fill="${g}"/>`;
    }
    return '';
  }
  function princessSVG(look, equip, opt = {}) {
    const o = opt.outfit || OF[look.outfit] || OF.o01;
    const B = BODY[o.style](o.colors);
    const hc = look.color, hd = shade(hc, -0.2);
    const w = equip && equip.weapon && EQ[equip.weapon], gd = equip && equip.guard && EQ[equip.guard];
    const face = opt.fierce
      ? `<path d="M56,62 L64,62" stroke="#b0505a" stroke-width="1.6" stroke-linecap="round"/>`
      : `<path d="M56,61 Q60,65 64,61" stroke="#b0505a" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
    return `<svg viewBox="${opt.vb || '0 0 120 170'}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      ${opt.vb ? '' : '<ellipse cx="60" cy="163" rx="30" ry="5" fill="rgba(0,0,0,.25)"/>'}
      ${B.cape || ''}
      ${(HAIR_BACK[look.hair] || HAIR_BACK.long)(hd)}
      ${B.body}
      <rect x="56" y="68" width="8" height="10" fill="${SKIN}"/>
      ${B.top}
      ${gd && gd.kind === 'charm' ? weaponSVG('charm', gd.rarity) : ''}
      <circle cx="60" cy="50" r="24" fill="${SKIN}"/>
      <ellipse cx="51" cy="52" rx="3" ry="4" fill="#3a2a4a"/><ellipse cx="69" cy="52" rx="3" ry="4" fill="#3a2a4a"/>
      <circle cx="52.2" cy="50.4" r="1.2" fill="#fff"/><circle cx="70.2" cy="50.4" r="1.2" fill="#fff"/>
      <ellipse cx="45.5" cy="59" rx="4" ry="2" fill="#ff9fb0" opacity=".55"/><ellipse cx="74.5" cy="59" rx="4" ry="2" fill="#ff9fb0" opacity=".55"/>
      ${face}
      ${hairFront(look.hair, hc)}
      <path d="M50,27 L53,18 L57,24 L60,14 L63,24 L67,18 L70,27 Z" fill="#ffd34d" stroke="#c9922b" stroke-width=".8"/><circle cx="60" cy="22" r="1.8" fill="#ef7fa6"/>
      ${w ? weaponSVG(w.kind, w.rarity) : ''}
      ${gd && gd.kind !== 'charm' ? weaponSVG(gd.kind, gd.rarity) : ''}
      ${hands}
    </svg>`;
  }
  function monsterSVG(F) {
    const c = F.color, d = shade(c, -0.35), l = shade(c, 0.3);
    let b = '';
    if (F.shape === 'slime') b = `<path d="M14,108 Q10,52 60,40 Q110,52 106,108 Q60,116 14,108 Z" fill="${c}"/><path d="M30,62 Q42,50 56,49" stroke="${l}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".7"/>`;
    else if (F.shape === 'beast') b = `<path d="M30,46 L36,18 L52,40 Z M90,46 L84,18 L68,40 Z" fill="${d}"/><ellipse cx="60" cy="70" rx="40" ry="34" fill="${c}"/><rect x="30" y="94" width="11" height="18" rx="4" fill="${d}"/><rect x="79" y="94" width="11" height="18" rx="4" fill="${d}"/><path d="M52,86 L56,92 L60,86 L64,92 L68,86" stroke="#fff" stroke-width="1.6" fill="none"/>`;
    else if (F.shape === 'ghost') b = `<path d="M22,110 L22,60 Q22,24 60,24 Q98,24 98,60 L98,110 L86,100 L74,110 L60,100 L46,110 L34,100 Z" fill="${c}" opacity=".92"/>`;
    else b = `<rect x="14" y="52" width="14" height="38" rx="5" fill="${d}"/><rect x="92" y="52" width="14" height="38" rx="5" fill="${d}"/><rect x="34" y="96" width="18" height="18" rx="3" fill="${d}"/><rect x="68" y="96" width="18" height="18" rx="3" fill="${d}"/><rect x="26" y="32" width="68" height="68" rx="9" fill="${c}"/><path d="M36,40 L44,52 L40,62" stroke="${d}" stroke-width="2" fill="none"/>`;
    const eyes = `<ellipse cx="46" cy="68" rx="6.5" ry="7" fill="#fff2bf"/><ellipse cx="74" cy="68" rx="6.5" ry="7" fill="#fff2bf"/><circle cx="47" cy="70" r="3" fill="#1a1020"/><circle cx="73" cy="70" r="3" fill="#1a1020"/><path d="M37,56 L54,62 M83,56 L66,62" stroke="#1a1020" stroke-width="3" stroke-linecap="round"/>`;
    const aura = F.elite ? `<ellipse cx="60" cy="72" rx="57" ry="50" fill="none" stroke="#ffcf5a" stroke-width="2" stroke-dasharray="4 6"/>` : '';
    return `<svg viewBox="0 0 120 120" aria-hidden="true"><ellipse cx="60" cy="114" rx="40" ry="5" fill="rgba(0,0,0,.3)"/>${aura}${b}${eyes}</svg>`;
  }
  function npcSVG(N) {
    const c = N.color;
    return `<svg viewBox="0 0 120 170" aria-hidden="true"><ellipse cx="60" cy="163" rx="26" ry="5" fill="rgba(0,0,0,.25)"/><path d="M36,160 L44,92 Q60,84 76,92 L84,160 Z" fill="${c}"/><circle cx="60" cy="72" r="18" fill="#f2d2bc"/><path d="M40,78 Q38,48 60,48 Q82,48 80,78 Q80,60 60,58 Q40,60 40,78 Z" fill="${shade(c, -0.25)}"/><circle cx="54" cy="74" r="1.8" fill="#333"/><circle cx="66" cy="74" r="1.8" fill="#333"/><path d="M56,81 Q60,${N.t >= 3 ? 85 : 80} 64,81" stroke="#8a4a4a" stroke-width="1.4" fill="none"/></svg>`;
  }

  /* ================= 世界の描画（Canvas） ================= */
  const cv = $('#world'), ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  let scrollX = 0, lastFrame = 0;
  const drops = Array.from({ length: 260 }, () => ({ x: Math.random() * W, y: Math.random() * H, l: 8 + Math.random() * 14, s: 0.6 + Math.random() * 0.7 }));
  const clouds = Array.from({ length: 10 }, (_, i) => ({ x: i * 110 + Math.random() * 60, y: 10 + Math.random() * 90, r: 50 + Math.random() * 55, s: 0.006 + Math.random() * 0.01 }));
  const motes = Array.from({ length: 40 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: 0.2 + Math.random() * 0.5, p: Math.random() * 6 }));
  const srand = seed => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  let gradeV = 0, gradeW = 0;
  const gcache = new Map();
  function G(hex) {
    let v = gcache.get(hex);
    if (v) return v;
    let [r, g, b] = hexRgb(hex);
    const gray = 0.3 * r + 0.59 * g + 0.11 * b;
    const s = (0.1 + 0.9 * gradeV) * (1 + 0.15 * gradeV);
    const k = 0.6 + 0.4 * gradeV;
    [r, g, b] = [r, g, b].map(c => (gray + (c - gray) * s) * k);
    [r, g, b] = [r, g, b].map(c => c + (255 - c) * gradeW);
    v = rgbHex([r, g, b]); gcache.set(hex, v);
    return v;
  }
  function repeat(spacing, off, fn) {
    const a = Math.floor(off / spacing) - 1, b = Math.floor((off + W) / spacing) + 1;
    for (let i = a; i <= b; i++) fn(i * spacing - off, srand(Math.abs(i * 7919 + 13) + 1));
  }
  function ridge(base, amp, freq, off, color) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W + 20; x += 16) {
      const X = x + off;
      ctx.lineTo(x, base - (Math.sin(X * freq) * amp + Math.sin(X * freq * 2.7 + 1.3) * amp * 0.4 + amp));
    }
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  }
  function castle(x, y) {
    const glow = ctx.createRadialGradient(x, y - 40, 10, x, y - 40, 190);
    glow.addColorStop(0, 'rgba(255,214,120,.75)'); glow.addColorStop(1, 'rgba(255,200,100,0)');
    ctx.fillStyle = glow; ctx.fillRect(x - 200, y - 240, 400, 360);
    const wall = '#f6dc9a', roof = '#e8743a', win = '#fff6c8';
    ctx.fillStyle = wall;
    ctx.fillRect(x - 60, y - 50, 120, 50);
    [[-62, 90, 18], [44, 90, 18], [-14, 120, 28]].forEach(([dx, h, w]) => {
      ctx.fillStyle = wall; ctx.fillRect(x + dx, y - h, w, h);
      ctx.fillStyle = roof; ctx.beginPath(); ctx.moveTo(x + dx - 4, y - h); ctx.lineTo(x + dx + w / 2, y - h - w * 1.3); ctx.lineTo(x + dx + w + 4, y - h); ctx.fill();
      ctx.fillStyle = win; ctx.fillRect(x + dx + w / 2 - 3, y - h + 16, 6, 10);
    });
    ctx.fillStyle = '#c9822b'; ctx.beginPath(); ctx.arc(x, y, 12, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#ffe9a8'; ctx.fillRect(x - 1, y - 160, 2, 24);
    ctx.fillStyle = '#ef7fa6'; ctx.fillRect(x + 1, y - 160, 14, 8);
  }
  function feature(R, off) {
    const f = R.feature, near = G(R.near), dark = G(shade(R.near, -0.35)), lite = G(shade(R.near, 0.25));
    switch (f) {
      case 'hills':
      case 'village':
        ridge(420, 26, 0.004, off, near);
        repeat(150, off, (x, r) => {
          if (f === 'village' && r() < 0.7) {
            const w = 40 + r() * 20, y = 405 - r() * 10;
            ctx.fillStyle = G('#c8b89a'); ctx.fillRect(x, y - 30, w, 30);
            ctx.fillStyle = G('#8a4a3a'); ctx.beginPath(); ctx.moveTo(x - 6, y - 30); ctx.lineTo(x + w / 2, y - 52); ctx.lineTo(x + w + 6, y - 30); ctx.fill();
            ctx.fillStyle = G('#ffe08a'); ctx.fillRect(x + w / 2 - 4, y - 22, 8, 9);
          } else {
            const y = 410 - r() * 20;
            ctx.fillStyle = G('#5a4a3a'); ctx.fillRect(x + 8, y - 10, 5, 20);
            ctx.fillStyle = dark; ctx.beginPath(); ctx.arc(x + 10, y - 18, 16 + r() * 8, 0, 7); ctx.fill();
          }
        });
        break;
      case 'sea': {
        ctx.fillStyle = near; ctx.fillRect(0, 330, W, 110);
        ctx.strokeStyle = lite; ctx.lineWidth = 2;
        for (let row = 0; row < 5; row++) {
          ctx.beginPath();
          for (let x = 0; x <= W; x += 12) ctx.lineTo(x, 345 + row * 20 + Math.sin((x + off * (1 + row * 0.2)) * 0.03 + row) * 3);
          ctx.stroke();
        }
        repeat(420, off * 0.6, (x, r) => {
          const y = 360 + r() * 30;
          ctx.fillStyle = G('#6a4a32'); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 60, y); ctx.lineTo(x + 50, y + 12); ctx.lineTo(x + 10, y + 12); ctx.fill();
          ctx.fillStyle = G('#e8e0c8'); ctx.beginPath(); ctx.moveTo(x + 30, y - 44); ctx.lineTo(x + 30, y - 2); ctx.lineTo(x + 54, y - 6); ctx.fill();
        });
        break;
      }
      case 'forest':
        for (let row = 0; row < 3; row++) {
          repeat(44 - row * 6, off * (0.6 + row * 0.2), (x, r) => {
            const h = 70 + r() * 50 - row * 10, y = 380 + row * 22;
            ctx.fillStyle = row === 2 ? near : row === 1 ? dark : G(shade(R.near, -0.55));
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 18, y - h); ctx.lineTo(x + 36, y); ctx.fill();
          });
        }
        break;
      case 'mine':
        ctx.fillStyle = near; ctx.beginPath(); ctx.moveTo(0, H);
        for (let x = 0; x <= W + 30; x += 30) ctx.lineTo(x, 350 - Math.abs(Math.sin((x + off) * 0.01)) * 90 - ((x + off) % 60 < 30 ? 10 : 0));
        ctx.lineTo(W, H); ctx.fill();
        repeat(320, off, (x, r) => {
          const y = 410;
          ctx.fillStyle = '#120e0c'; ctx.beginPath(); ctx.arc(x + 40, y, 26, Math.PI, 0); ctx.fill();
          ctx.strokeStyle = G('#8a6a42'); ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x + 40, y, 28, Math.PI, 0); ctx.stroke();
          if (r() < 0.6) { ctx.fillStyle = G('#ffd36b'); ctx.beginPath(); ctx.arc(x + 90, y - 14, 3, 0, 7); ctx.fill(); }
        });
        break;
      case 'snow':
        ridge(420, 22, 0.005, off, near);
        repeat(90, off, (x, r) => {
          const y = 412 - r() * 16, h = 40 + r() * 30;
          ctx.fillStyle = G('#3a5a4a'); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 14, y - h); ctx.lineTo(x + 28, y); ctx.fill();
          ctx.fillStyle = G('#f4f8fc'); ctx.beginPath(); ctx.moveTo(x + 6, y - h * 0.55); ctx.lineTo(x + 14, y - h); ctx.lineTo(x + 22, y - h * 0.55); ctx.fill();
        });
        break;
      case 'desert':
        ridge(425, 30, 0.003, off, near);
        repeat(460, off * 0.8, (x, r) => {
          const y = 400, s = 50 + r() * 40;
          ctx.fillStyle = G('#c89a5a'); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + s, y - s * 0.9); ctx.lineTo(x + s * 2, y); ctx.fill();
          ctx.fillStyle = G('#a87a42'); ctx.beginPath(); ctx.moveTo(x + s, y - s * 0.9); ctx.lineTo(x + s * 2, y); ctx.lineTo(x + s * 1.3, y); ctx.fill();
        });
        break;
      case 'canyon':
        repeat(240, off * 0.7, (x, r) => {
          const h = 160 + r() * 120, w = 70 + r() * 60;
          ctx.fillStyle = r() < 0.5 ? near : dark;
          ctx.beginPath(); ctx.moveTo(x, 440); ctx.lineTo(x + 8, 440 - h); ctx.lineTo(x + w - 10, 440 - h - 10); ctx.lineTo(x + w, 440); ctx.fill();
        });
        break;
      case 'cathedral':
        ridge(430, 14, 0.004, off, dark);
        repeat(260, off * 0.7, (x, r) => {
          const h = 140 + r() * 100;
          ctx.fillStyle = near; ctx.fillRect(x, 430 - h, 34, h);
          ctx.beginPath(); ctx.moveTo(x - 4, 430 - h); ctx.lineTo(x + 17, 430 - h - 60); ctx.lineTo(x + 38, 430 - h); ctx.fill();
          ctx.fillStyle = G('#ffe9a8'); ctx.globalAlpha = 0.5 + gradeV * 0.5;
          ctx.beginPath(); ctx.arc(x + 17, 430 - h + 30, 7, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
        });
        break;
      case 'clouds':
        repeat(110, off, (x, r) => {
          ctx.fillStyle = r() < 0.5 ? near : lite;
          ctx.beginPath(); ctx.arc(x + 40, 420 - r() * 30, 50 + r() * 30, 0, 7); ctx.fill();
        });
        break;
    }
  }
  function drawWorld(ts) {
    gcache.clear();
    const sunLeft = Math.max(0, sunUntil - performance.now());
    const sunK = Math.min(1, sunLeft / 1500) * (sunLeft > 0 ? 1 : 0);
    if (S.abyss) return drawAbyss(ts, sunK);
    const R = REGIONS[regionIdx()];
    const v = Math.max(0.06, vivid());
    gradeV = Math.min(1, v + sunK * 0.35);
    gradeW = S.cleared ? 0.14 : 0;
    // 空
    const sky = ctx.createLinearGradient(0, 0, 0, 380);
    if (S.cleared) { sky.addColorStop(0, '#a8d8ff'); sky.addColorStop(1, '#fff8ea'); }
    else { sky.addColorStop(0, G(R.sky[0])); sky.addColorStop(1, G(R.sky[1])); }
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    // 太陽
    const sunA = Math.min(1, v * 0.9 + sunK * 0.8);
    if (sunA > 0.05) {
      const sg = ctx.createRadialGradient(760, 110, 10, 760, 110, 160);
      sg.addColorStop(0, `rgba(255,240,190,${sunA})`); sg.addColorStop(0.25, `rgba(255,220,140,${sunA * 0.6})`); sg.addColorStop(1, 'rgba(255,220,140,0)');
      ctx.fillStyle = sg; ctx.fillRect(560, 0, 400, 300);
    }
    ridge(330, 40, 0.006, scrollX * 0.12, G(R.far));
    if (regionIdx() === 0 || S.cleared) castle(150, 318);
    feature(R, scrollX * 0.45);
    // 地面と道
    ctx.fillStyle = G(R.ground); ctx.fillRect(0, 436, W, H - 436);
    ctx.fillStyle = G(shade(R.ground, 0.2)); ctx.fillRect(0, 470, W, 34);
    repeat(64, scrollX, (x, r) => { ctx.fillStyle = G(shade(R.ground, -0.2)); ctx.fillRect(x + r() * 30, 478 + r() * 18, 6, 3); });
    // 雲
    const cloudA = (1 - v) * 0.85 * (1 - sunK * 0.7);
    if (cloudA > 0.02) {
      clouds.forEach(c => {
        c.x -= c.s * 16; if (c.x < -c.r * 2) c.x = W + c.r;
        ctx.fillStyle = `rgba(70,78,96,${cloudA})`;
        ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, 7); ctx.arc(c.x + c.r * 0.8, c.y + 10, c.r * 0.8, 0, 7); ctx.arc(c.x - c.r * 0.8, c.y + 14, c.r * 0.7, 0, 7); ctx.fill();
      });
    }
    // 光の筋
    if (sunK > 0 || S.cleared) {
      const a = S.cleared ? 0.08 : 0.16 * sunK;
      ctx.save(); ctx.translate(W * 0.72, -60); ctx.rotate(Math.sin(ts / 4000) * 0.05);
      for (let i = 0; i < 7; i++) {
        ctx.fillStyle = `rgba(255,236,170,${a})`;
        ctx.beginPath(); ctx.moveTo(0, 0); const ang = 1.75 + i * 0.13; ctx.lineTo(Math.cos(ang) * 900 - 30, Math.sin(ang) * 900); ctx.lineTo(Math.cos(ang) * 900 + 30, Math.sin(ang) * 900); ctx.fill();
      }
      ctx.restore();
    }
    // 雨
    const rainN = S.cleared ? 0 : Math.round(240 * (1 - v) * (1 - sunK));
    if (rainN > 0) {
      ctx.strokeStyle = 'rgba(200,212,232,.45)'; ctx.lineWidth = 1.2; ctx.beginPath();
      for (let i = 0; i < rainN; i++) {
        const d = drops[i];
        if (!reduceMotion) { d.y += d.s * 22; d.x -= d.s * 3; }
        if (d.y > H) { d.y = -20; d.x = Math.random() * (W + 60); }
        ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.l * 0.15, d.y + d.l);
      }
      ctx.stroke();
    }
    if (S.cleared) {
      ctx.fillStyle = 'rgba(255,255,250,.12)'; ctx.fillRect(0, 0, W, H);
      motes.forEach(m => { m.y -= m.s; if (m.y < 0) m.y = H; ctx.fillStyle = `rgba(255,248,220,${0.4 + Math.sin(ts / 600 + m.p) * 0.3})`; ctx.fillRect(m.x, m.y, 2, 2); });
    }
  }
  function drawAbyss(ts, sunK) {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0b0a16'); bg.addColorStop(1, '#1a1428');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    repeat(70, scrollX * 0.5, (x, r) => {
      ctx.fillStyle = '#231d34'; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 20 + r() * 20, 40 + r() * 90); ctx.lineTo(x + 60, 0); ctx.fill();
    });
    repeat(240, scrollX * 0.7, (x, r) => {
      const y = 430 - r() * 40, h = 30 + r() * 40;
      ctx.fillStyle = `rgba(150,110,230,${0.35 + Math.sin(ts / 900 + x) * 0.1})`;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 8, y - h); ctx.lineTo(x + 16, y); ctx.fill();
    });
    ctx.fillStyle = '#16121f'; ctx.fillRect(0, 440, W, H - 440);
    repeat(64, scrollX, (x, r) => { ctx.fillStyle = '#241d30'; ctx.fillRect(x + r() * 30, 470 + r() * 30, 8, 3); });
    // 灯り
    const P = power();
    const cx = W * 0.395, cy = H * 0.7;
    const Rl = 150 + Math.min(330, (P.atk + P.sup) * 0.8) + sunK * 180 + Math.sin(ts / 500) * 6;
    motes.forEach(m => { m.y -= m.s; if (m.y < 0) m.y = H; ctx.fillStyle = `rgba(255,210,120,${0.5 + Math.sin(ts / 500 + m.p) * 0.3})`; ctx.fillRect(m.x, m.y, 2, 2); });
    const dk = ctx.createRadialGradient(cx, cy, 40, cx, cy, Rl);
    dk.addColorStop(0, 'rgba(255,214,140,.10)'); dk.addColorStop(0.5, 'rgba(4,3,10,.35)'); dk.addColorStop(1, 'rgba(3,2,8,.96)');
    ctx.fillStyle = dk; ctx.fillRect(0, 0, W, H);
  }
  function frame(ts) {
    requestAnimationFrame(frame);
    if (document.hidden) return;
    const dt = Math.min(100, ts - (lastFrame || ts)); lastFrame = ts;
    if (heroState() === 'walking' && !reduceMotion) scrollX += dt * 0.05;
    drawWorld(ts);
  }

  /* ================= 画面描画 ================= */
  function heroState() {
    const T = S.timer;
    if (!T.running || T.mode !== 'work') return 'idle';
    return S.adv.phase === 'battle' ? 'attack' : S.adv.phase === 'cheer' ? 'idle' : 'walking';
  }
  let heroKey = '', foeKey = '', npcKey = '', lastHitT = -1;
  function renderStage() {
    const hs = heroState();
    const hero = $('#hero');
    const key = JSON.stringify([S.look, S.equip, hs === 'attack']);
    if (key !== heroKey) { hero.innerHTML = princessSVG(S.look, S.equip, { fierce: hs === 'attack' }); heroKey = key; }
    hero.className = 'actor ' + (hs === 'idle' ? '' : hs);
    const A = S.adv, foe = $('#foe'), npc = $('#npc');
    const working = S.timer.running && S.timer.mode === 'work';
    if (A.phase === 'battle' && A.foe) {
      const fk = A.foe.name + A.foe.elite;
      if (fk !== foeKey) { foe.innerHTML = monsterSVG(A.foe); foeKey = fk; foe.classList.remove('gone'); }
      foe.hidden = false; foe.style.aspectRatio = '1';
      if (working && A.foe.t !== lastHitT) { lastHitT = A.foe.t; foe.classList.remove('hit'); void foe.offsetWidth; foe.classList.add('hit'); }
    } else if (!foe.hidden && foeKey) {
      foe.classList.add('gone'); foeKey = '';
      setTimeout(() => { if (!foeKey) foe.hidden = true; }, 600);
    }
    if (A.phase === 'cheer' && A.npc) {
      const nk = A.npc.name + (A.npc.t >= 3);
      if (nk !== npcKey) { npc.innerHTML = npcSVG(A.npc); npcKey = nk; }
      npc.hidden = false;
    } else { npc.hidden = true; npcKey = ''; }
    $('#hudL').textContent = S.abyss ? `常闇の底 第${S.depth + 1}層` : REGIONS[regionIdx()].name;
    $('#hudR').textContent = S.abyss ? `最深 ${S.stats.maxDepth}層` : `世界の彩り ${Math.round(vivid() * 100)}%`;
    // 状況表示
    const fb = $('#foebar'), T = S.timer;
    if (!T.running) fb.innerHTML = `<span class="muted small">${T.mode === 'work' ? (T.sessMs ? '一時停止中。姫は道端で待っています。' : 'タイマーを始めると、姫の旅が進みます。') : '休憩の時間です。はじめるを押すと休憩タイマーが進みます。'}</span>`;
    else if (T.mode !== 'work') fb.innerHTML = '<span class="muted small">休憩中。姫も焚き火のそばでひと休みしています。</span>';
    else if (A.phase === 'battle' && A.foe) fb.innerHTML = `<span class="name">${A.foe.elite ? '<span class="rar rar-SSR">強敵</span> ' : ''}${esc(A.foe.name)}</span><span class="meter"><i style="width:${Math.max(0, A.foe.hp / A.foe.max * 100)}%"></i></span><span class="small muted">残り${15 - A.foe.t}秒</span>`;
    else if (A.phase === 'cheer' && A.npc) fb.innerHTML = `<span class="small">${esc(A.npc.name)}を応援しています…</span>`;
    else fb.innerHTML = `<span class="muted small">旅の途中。次の出会いまで およそ${Math.max(1, Math.ceil(A.next / 1000))}秒</span>`;
  }
  let logLen = -1, logLast = 0;
  function renderLog() {
    const last = S.log.length ? S.log[S.log.length - 1].t : 0;
    if (S.log.length === logLen && last === logLast) return;
    logLen = S.log.length; logLast = last;
    const ol = $('#log');
    ol.innerHTML = S.log.map(l => { const d = new Date(l.t); return `<li><time>${pad(d.getHours())}:${pad(d.getMinutes())}</time><span class="${l.c}">${esc(l.m)}</span></li>`; }).join('');
    ol.scrollTop = ol.scrollHeight;
  }
  function renderTimer() {
    const T = S.timer;
    const left = T.running ? T.endAt - Date.now() : T.remain;
    const total = dur(T.mode);
    $('#digits').textContent = clock(left);
    $('#dialLabel').textContent = MODE_LABEL[T.mode] + (T.running ? '' : (T.remain < total ? '・一時停止' : ''));
    const C = 2 * Math.PI * 52, ring = $('#ring');
    ring.style.strokeDasharray = C;
    ring.style.strokeDashoffset = C * (1 - Math.max(0, Math.min(1, 1 - left / total)));
    $('#dial').classList.toggle('break', T.mode !== 'work');
    $('#btnStart').textContent = T.running ? '一時停止' : (T.remain < total ? '再開' : 'はじめる');
    $$('#modes button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === T.mode)));
    const today = dkey();
    $('#todayMin').textContent = fmtMin(S.days[today] || 0);
    $('#todaySess').textContent = S.sessLog.filter(s => s.full && dkey(new Date(s.s)) === today).length;
    $('#curSess').textContent = fmtMin(T.sessMs);
    document.title = T.running ? `${clock(left)} ${MODE_LABEL[T.mode]}｜光の姫の旅路` : '光の姫の旅路';
  }
  function renderStatus() {
    const P = power();
    $('#atkLv').textContent = 'Lv' + S.lv.atk; $('#supLv').textContent = 'Lv' + S.lv.sup;
    $('#atkVal').textContent = P.atk; $('#supVal').textContent = P.sup;
    $('#atkXp').style.width = (S.lv.atkXp / xpNeed(S.lv.atk) * 100) + '%';
    $('#supXp').style.width = (S.lv.supXp / xpNeed(S.lv.sup) * 100) + '%';
    const w = talkWeights(), tot = w.N + w.R + w.SR + w.UR;
    $('#talkOdds').textContent = `SR以上 ${((w.SR + w.UR) / tot * 100).toFixed(1)}%`;
    const ab = $('#btnAbyss');
    ab.hidden = !S.cleared;
    ab.textContent = S.abyss ? '地上へ戻る' : '常闇の底へ降りる';
    const u = unlockedCount();
    $('#regionName').textContent = S.abyss ? `常闇の底 第${S.depth + 1}層` : REGIONS[regionIdx()].name;
    $('#chips').innerHTML = [
      ['攻撃', 'Lv' + S.lv.atk], ['応援', 'Lv' + S.lv.sup], ['総作業', fmtHM(S.stats.totalMs)],
      ['物語', `${u}/50`], ['彩り', Math.round(vivid() * 100) + '%'], ['感謝', S.stats.gratitude],
    ].map(([k, v]) => `<span class="chip"><span>${k}</span><b>${v}</b></span>`).join('');
    const unread = STORY.slice(0, u).some(c => !S.read[c.n]);
    const st = $('.tab[data-tab="story"]');
    if (unread && !st.querySelector('.dot')) st.insertAdjacentHTML('beforeend', '<i class="dot" aria-label="未読あり"></i>');
    if (!unread) st.querySelector('.dot')?.remove();
    document.body.classList.toggle('dawn', S.cleared);
    // タスク選択
    const sel = $('#curTask');
    const open = S.tasks.filter(t => !t.done);
    if (S.curTask && !open.some(t => t.id === S.curTask)) S.curTask = null;
    const opts = `<option value="">（タスクを選ばない）</option>` + open.map(t => `<option value="${t.id}">${esc(t.title)}</option>`).join('');
    if (sel.dataset.sig !== opts) { sel.innerHTML = opts; sel.dataset.sig = opts; }
    sel.value = S.curTask || '';
  }

  /* ---------- タスク ---------- */
  let taskFilter = 'open';
  function renderTasks() {
    const list = S.tasks.filter(t => taskFilter === 'all' || (taskFilter === 'done' ? t.done : !t.done));
    const today = dkey();
    $('#taskList').innerHTML = list.length ? list.map(t => {
      const pips = Array.from({ length: Math.max(t.est, t.pomo) }, (_, i) => `<i class="${i < t.pomo ? 'on' : ''}"></i>`).join('');
      const late = t.due && !t.done && t.due < today;
      return `<li class="task ${t.done ? 'done' : ''} ${S.curTask === t.id ? 'current' : ''}">
        <button class="check ${t.done ? 'on' : ''}" data-act="toggle" data-id="${t.id}" aria-label="${t.done ? '未完了に戻す' : '完了にする'}">${t.done ? '✓' : ''}</button>
        <div><div class="t">${esc(t.title)}</div><div class="meta"><span class="pips" title="作業回数 ${t.pomo} / 見積もり ${t.est}">${pips}</span><span>${t.pomo}/${t.est}回</span>${t.due ? `<span class="${late ? 'late' : ''}">期限 ${t.due.slice(5).replace('-', '/')}${late ? '（過ぎています）' : ''}</span>` : ''}</div></div>
        <div class="acts">${t.done ? '' : `<button class="btn" data-act="focus" data-id="${t.id}">${S.curTask === t.id ? '取り組み中' : '取り組む'}</button>`}<button class="btn ghost" data-act="del" data-id="${t.id}" aria-label="削除">削除</button></div>
      </li>`;
    }).join('') : `<li class="empty">${taskFilter === 'done' ? 'まだ完了したタスクはありません。' : 'タスクはありません。上の欄から追加しましょう。'}</li>`;
  }

  /* ---------- 日程 ---------- */
  let weekOffset = 0;
  function weekStart() { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + weekOffset * 7); return d; }
  function renderSchedule() {
    const s = weekStart(), today = dkey();
    const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(s); d.setDate(s.getDate() + i); return d; });
    $('#wkLabel').textContent = `${days[0].getMonth() + 1}/${days[0].getDate()} – ${days[6].getMonth() + 1}/${days[6].getDate()}`;
    $('#week').innerHTML = days.map(d => {
      const k = dkey(d);
      const ev = S.sched.filter(e => e.date === k).sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
      const tasks = S.tasks.filter(t => t.due === k);
      const work = S.days[k] || 0;
      return `<div class="day ${k === today ? 'today' : ''} ${d.getDay() === 0 ? 'sun' : d.getDay() === 6 ? 'sat' : ''}">
        <h4><span>${WD[d.getDay()]}</span><b>${d.getMonth() + 1}/${d.getDate()}</b></h4>
        ${ev.map(e => `<div class="ev ${e.done ? 'done' : ''}"><span><button data-sact="toggle" data-id="${e.id}" aria-label="完了切り替え" style="color:inherit;font-size:.78rem;text-align:left;text-decoration:inherit">${e.time ? `<span class="tm">${e.time}</span>` : ''}${esc(e.title)}</button></span><button data-sact="del" data-id="${e.id}" aria-label="削除">×</button></div>`).join('')}
        ${tasks.map(t => `<div class="ev task ${t.done ? 'done' : ''}"><span>期限：${esc(t.title)}</span></div>`).join('')}
        ${work >= 60000 ? `<div class="ev"><span class="work">作業 ${fmtMin(work)}分</span></div>` : ''}
      </div>`;
    }).join('');
  }

  /* ---------- 記録 ---------- */
  function chartSVG() {
    const cw = 560, ch = 210, pl = 34, pr = 8, pt = 16, pb = 34;
    const days = Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - 13 + i); return d; });
    const mins = days.map(d => (S.days[dkey(d)] || 0) / 60000);
    const max = Math.max(30, ...mins);
    const stepV = max <= 60 ? 15 : max <= 180 ? 30 : max <= 360 ? 60 : 120;
    const top = Math.ceil(max / stepV) * stepV;
    const ih = ch - pt - pb, bw = (cw - pl - pr) / 14;
    let g = '';
    for (let v = 0; v <= top; v += stepV) {
      const y = pt + ih - v / top * ih;
      g += `<line class="grid" x1="${pl}" x2="${cw - pr}" y1="${y}" y2="${y}"/><text x="${pl - 6}" y="${y + 3}" text-anchor="end">${v}</text>`;
    }
    days.forEach((d, i) => {
      const m = mins[i], h = m / top * ih, x = pl + i * bw + bw * 0.19, y = pt + ih - h;
      if (m > 0) g += `<rect class="bar ${i === 13 ? 'today' : ''}" x="${x}" y="${y}" width="${bw * 0.62}" height="${Math.max(1, h)}" rx="3"/><text x="${x + bw * 0.31}" y="${y - 4}" text-anchor="middle">${Math.round(m)}</text>`;
      g += `<text x="${x + bw * 0.31}" y="${ch - pb + 14}" text-anchor="middle">${d.getDate()}</text><text x="${x + bw * 0.31}" y="${ch - pb + 27}" text-anchor="middle">${WD[d.getDay()]}</text>`;
    });
    return `<svg viewBox="0 0 ${cw} ${ch}" role="img" aria-label="直近14日の作業時間">${g}</svg>`;
  }
  function renderRecords() {
    const st = S.stats, sk = streaks();
    const full = S.sessLog.filter(s => s.full);
    const avg = full.length ? full.reduce((a, s) => a + s.ms, 0) / full.length : 0;
    const tiles = [
      ['起動回数', st.launches, '回'], ['総作業時間', fmtHM(st.totalMs), ''], ['作業完了', st.sessions, '回'],
      ['1回の平均', fmtMin(avg), '分'], ['1回の最長', fmtMin(st.longestMs), '分'], ['今日の作業', fmtMin(S.days[dkey()] || 0), '分'],
      ['連続日数', sk.cur, '日'], ['最長連続', sk.best, '日'], ['討伐した魔物', st.kills, '体'],
      ['応援した人', st.cheers, '人'], ['集めた感謝', st.gratitude, ''], ['常闇の最深', st.maxDepth, '層'],
    ];
    $('#tiles').innerHTML = tiles.map(([k, v, u]) => `<div class="tile"><span>${k}</span><b>${v}${u ? `<small>${u}</small>` : ''}</b></div>`).join('');
    $('#chart').innerHTML = chartSVG();
    const rows = S.sessLog.slice(-60).reverse();
    $('#sessRows').innerHTML = rows.length ? rows.map(s => { const d = new Date(s.s); return `<tr><td>${d.getMonth() + 1}/${d.getDate()}（${WD[d.getDay()]}）</td><td class="num">${pad(d.getHours())}:${pad(d.getMinutes())}</td><td class="num">${fmtMin(s.ms)}分${s.full ? '' : '<span class="muted">（中断）</span>'}</td><td>${esc(s.task || '—')}</td></tr>`; }).join('') : '<tr><td colspan="4" class="muted">まだ記録はありません。最初の1回をはじめましょう。</td></tr>';
    const got = Object.keys(S.ach).length;
    $('#achHead').textContent = `実績 ${got} / ${ACHIEVEMENTS.length}`;
    $('#achGrid').innerHTML = ACHIEVEMENTS.map(a => `<div class="ach ${S.ach[a.id] ? 'got' : ''}"><span class="medal"></span><div><b>${a.name}</b><small>${a.desc}</small></div></div>`).join('');
  }

  /* ---------- 物語 ---------- */
  function renderStory() {
    const u = unlockedCount(), p = storyPoints();
    $('#storyPts').innerHTML = `物語ポイント <b style="font-family:var(--f-num);font-size:1.2rem;color:var(--ink)">${p}</b><br>作業30分＝1pt／実績1つ＝1pt`;
    if (u < 50) {
      const need = storyReq(u + 1), prev = u ? storyReq(u) : 0;
      $('#storyHint').textContent = `第${u + 1}話「${STORY[u].title}」まで あと ${need - p} pt`;
      $('#storyMeter').style.width = Math.max(0, Math.min(100, (p - prev) / (need - prev) * 100)) + '%';
    } else {
      $('#storyHint').textContent = S.cleared ? '全50話を読み終えました。常闇の底があなたを待っています。' : 'すべての物語が解放されました。第50話を読んでください。';
      $('#storyMeter').style.width = '100%';
    }
    let html = '';
    REGIONS.forEach((R, ri) => {
      html += `<div class="region"><h3><small>${pad(ri + 1)}</small>${R.name}</h3><div class="chapters">`;
      for (let n = ri * 5 + 1; n <= ri * 5 + 5; n++) {
        const c = STORY[n - 1], open = n <= u;
        html += open
          ? `<button class="chap ${S.read[n] ? '' : 'new'}" data-chap="${n}"><span class="no">第${n}話${S.read[n] ? '' : '・未読'}</span><span class="st">${esc(c.title)}</span></button>`
          : `<div class="chap locked"><span class="no">第${n}話</span><span class="st">？？？</span><span class="req">${storyReq(n)} pt で解放</span></div>`;
      }
      html += '</div></div>';
    });
    if (S.cleared) html += `<div class="region"><h3><small>EX</small>終わらない光</h3><div class="chapters"><button class="chap" data-chap="epi"><span class="no">エピローグ</span><span class="st">${EPILOGUE.title}</span></button></div></div>`;
    $('#storyList').innerHTML = html;
  }
  function openModal(html) { $('#sheet').innerHTML = html; $('#modal').hidden = false; $('#sheet').querySelector('button')?.focus(); }
  function closeModal() { $('#modal').hidden = true; }
  const paras = t => t.split('\n').map(p => `<p>${esc(p)}</p>`).join('');
  function openChapter(n) {
    if (n === 'epi') {
      openModal(`<div class="no">EPILOGUE</div><h3>${EPILOGUE.title}</h3>${paras(EPILOGUE.text)}<div class="acts"><button class="btn primary" data-m="close">閉じる</button></div>`);
      return;
    }
    const c = STORY[n - 1], u = unlockedCount();
    S.read[n] = true;
    let extra = '';
    if (n === 50 && !S.cleared) {
      S.cleared = true;
      addLog('sys', '世界は光に包まれた。常闇の底への道が開いた');
      toast('エンドコンテンツ解放', '常闇の底へ降りられるようになりました');
      checkProgress();
    }
    if (n === 50) extra = '<button class="btn" data-m="epi">エピローグへ</button>';
    openModal(`<div class="no">第${n}話 ・ ${REGIONS[c.region].name}</div><h3>${esc(c.title)}</h3>${paras(c.text)}
      <div class="acts">${n > 1 ? `<button class="btn" data-m="go" data-n="${n - 1}">前の話</button>` : ''}${n < u ? `<button class="btn" data-m="go" data-n="${n + 1}">次の話</button>` : ''}${extra}<button class="btn primary" data-m="close">閉じる</button></div>`);
    dirty = panelDirty = true; saveSoon();
  }

  /* ---------- 衣装室 ---------- */
  let wardTab = 'outfit';
  const LOCKED_OUTFIT = { style: 'gown', colors: ['#3a4458', '#465068', '#4a556c'] };
  function renderWardrobe() {
    $('#mirror').innerHTML = princessSVG(S.look, S.equip);
    const P = power(), o = OF[S.look.outfit];
    const w = S.equip.weapon && EQ[S.equip.weapon], g = S.equip.guard && EQ[S.equip.guard];
    $('#mirrorStats').innerHTML = `<dt>攻撃力</dt><dd>${P.atk}</dd><dt>応援力</dt><dd>${P.sup}</dd><dt>服装</dt><dd style="font-family:var(--f-body)">${esc(o.name)}</dd><dt>武器</dt><dd style="font-family:var(--f-body)">${w ? esc(w.name) + (S.inv[w.id] ? ` +${S.inv[w.id]}` : '') : 'なし'}</dd><dt>守り</dt><dd style="font-family:var(--f-body)">${g ? esc(g.name) + (S.inv[g.id] ? ` +${S.inv[g.id]}` : '') : 'なし'}</dd>`;
    $$('#wardSeg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.w === wardTab)));
    const body = $('#wardBody'), note = $('#wardNote');
    if (wardTab === 'outfit') {
      const have = OUTFITS.filter(x => isUnlocked(x.unlock, x.id)).length;
      note.textContent = `${have} / 30 着。服装は見た目と一緒に攻撃力・応援力も少し変わります。物語・実績・冒険で増えます。`;
      body.innerHTML = `<div class="items">${OUTFITS.map(x => {
        const ok = isUnlocked(x.unlock, x.id);
        return `<button class="item ${S.look.outfit === x.id ? 'on' : ''} ${ok ? '' : 'locked'}" data-outfit="${x.id}" ${ok ? '' : 'disabled'}>
          <span class="tag rar rar-${x.rarity}">${x.rarity}</span>
          <span class="sw" style="height:96px">${princessSVG({ ...S.look }, null, { outfit: ok ? x : LOCKED_OUTFIT })}</span>
          <b>${ok ? esc(x.name) : '？？？'}</b>
          ${ok ? `<span class="st">攻+${x.atk} 応+${x.sup}</span>` : `<span class="hint">${unlockText(x.unlock)}</span>`}
        </button>`;
      }).join('')}</div>`;
    } else if (wardTab === 'equip') {
      const have = Object.keys(S.inv).length;
      note.textContent = `${have} / 30 種。同じ装備を拾うと重なって強化されます（+1ごとに能力+10%、最大+10。常闇の底では上限なし）。`;
      body.innerHTML = `<div class="items">${EQUIPMENT.map(e => {
        const ok = e.id in S.inv, st = ok ? itemStat(e) : null, on = S.equip[e.slot] === e.id;
        const vb = e.slot === 'weapon' ? '64 44 54 112' : e.kind === 'shield' ? '18 90 32 42' : e.kind === 'charm' ? '48 74 24 18' : '28 99 14 14';
        return `<button class="item ${on ? 'on' : ''} ${ok ? '' : 'locked'}" data-equip="${e.id}" ${ok ? '' : 'disabled'}>
          <span class="tag rar rar-${e.rarity}">${e.rarity}</span>
          <span class="sw" style="background:var(--slate-2)">${ok ? `<svg viewBox="${vb}" aria-hidden="true">${weaponSVG(e.kind, e.rarity)}</svg>` : '<span class="muted">？</span>'}</span>
          <b>${ok ? esc(e.name) + (S.inv[e.id] ? ` +${S.inv[e.id]}` : '') : '？？？'}</b>
          ${ok ? `<span class="st">${KIND_LABEL[e.kind]}・攻+${st.atk} 応+${st.sup}${on ? '・装備中' : ''}</span><span class="hint">${esc(e.desc)}</span>` : `<span class="hint">${e.id === 'e30' ? '常闇の底で見つかる' : `${KIND_LABEL[e.kind]}・第${e.tier}地域ごろから`}</span>`}
        </button>`;
      }).join('')}</div>`;
    } else if (wardTab === 'hair') {
      note.textContent = '髪型は物語と実績で増えます。';
      body.innerHTML = `<div class="items">${HAIRSTYLES.map(h => {
        const ok = isUnlocked(h.unlock);
        return `<button class="item ${S.look.hair === h.id ? 'on' : ''} ${ok ? '' : 'locked'}" data-hair="${h.id}" ${ok ? '' : 'disabled'}>
          <span class="sw" style="height:84px">${princessSVG({ ...S.look, hair: h.id, color: ok ? S.look.color : '#4a556c' }, null, { vb: '8 6 104 124' })}</span>
          <b>${ok ? h.name : '？？？'}</b>${ok ? '' : `<span class="hint">${unlockText(h.unlock)}</span>`}
        </button>`;
      }).join('')}</div>`;
    } else {
      note.textContent = '髪色は物語と実績で増えます。';
      body.innerHTML = `<div class="swatches">${HAIRCOLORS.map(h => {
        const ok = isUnlocked(h.unlock);
        return `<button class="swatch ${S.look.color === h.hex ? 'on' : ''} ${ok ? '' : 'locked'}" data-color="${h.hex}" ${ok ? '' : 'disabled'} title="${ok ? h.name : unlockText(h.unlock)}"><i style="background:${ok ? h.hex : '#3a4458'}"></i>${ok ? h.name : '？？？'}</button>`;
      }).join('')}</div>`;
    }
  }

  /* ---------- 会話帳 ---------- */
  function renderTalk() {
    const w = talkWeights(), tot = w.N + w.R + w.SR + w.UR;
    $('#odds').innerHTML = LINE_RARS.map(k => `<div><span class="rar rar-${k}">${k}</span><b>${(w[k] / tot * 100).toFixed(1)}%</b></div>`).join('');
    $('#lineBook').innerHTML = LINE_RARS.slice().reverse().map(k => {
      const pool = LINES[k], heard = pool.filter((_, i) => S.lines[k + i]).length;
      return `<h3 class="sub" style="margin-top:18px"><span class="rar rar-${k}">${k}</span>　${heard} / ${pool.length}</h3><ul class="lines">${pool.map((l, i) => S.lines[k + i]
        ? `<li><span class="rar rar-${k}">${S.lines[k + i]}回</span><span>「${esc(l)}」</span></li>`
        : `<li class="unk"><span>—</span><span>？？？？？？</span></li>`).join('')}</ul>`;
    }).join('');
  }

  /* ---------- 設定 ---------- */
  function renderSettings() {
    const s = S.settings;
    $('#setWork').value = s.work; $('#setShort').value = s.short; $('#setLong').value = s.long; $('#setEvery').value = s.every;
    $('#setAuto').checked = s.auto; $('#setSound').checked = s.sound;
  }

  /* ---------- タブ ---------- */
  let tab = 'adventure';
  const PANELS = { tasks: renderTasks, schedule: renderSchedule, records: renderRecords, story: renderStory, wardrobe: renderWardrobe, talk: renderTalk, settings: renderSettings };
  function showTab(t) {
    if (!$(`#tab-${t}`)) t = 'adventure';
    tab = t;
    $$('.tab').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === t)));
    $$('.panel').forEach(p => { p.hidden = p.id !== `tab-${t}`; });
    try { localStorage.setItem(KEY + '-tab', t); } catch (e) { /* noop */ }
    panelDirty = true; render();
  }
  function render() {
    renderTimer();
    if (dirty) { renderStage(); renderLog(); renderStatus(); dirty = false; }
    const now = Date.now();
    if (PANELS[tab] && (panelDirty || (tab === 'records' && now - lastPanel > 5000))) {
      if (tab !== 'settings' || panelDirty) PANELS[tab]();
      panelDirty = false; lastPanel = now;
    }
  }

  /* ================= 操作 ================= */
  $$('.tab').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));
  $('#btnStart').addEventListener('click', () => { S.timer.running ? pause() : start(); render(); });
  $('#btnReset').addEventListener('click', () => { stopRun(); render(); });
  $('#btnSkip').addEventListener('click', () => { skip(); render(); });
  $('#modes').addEventListener('click', e => {
    const b = e.target.closest('button[data-mode]'); if (!b || b.dataset.mode === S.timer.mode) return;
    if (S.timer.running && S.timer.mode === 'work') { tick(); finishSession(false); }
    setMode(b.dataset.mode, false); checkProgress(); render();
  });
  $('#curTask').addEventListener('change', e => { S.curTask = e.target.value || null; panelDirty = true; saveSoon(); });
  $('#btnTalk').addEventListener('click', () => { ensureAudio(); talk(); render(); });
  $('#btnAbyss').addEventListener('click', () => {
    S.abyss = !S.abyss;
    S.adv = { phase: 'walk', next: 12000, acc: 0, foe: null, npc: null };
    addLog('sys', S.abyss ? `姫はランタンを掲げ、常闇の底 第${S.depth + 1}層へ降りていった` : '姫は光に満ちた地上へ戻ってきた');
    dirty = true; save(); render();
  });

  // タスク
  $('#taskForm').addEventListener('submit', e => {
    e.preventDefault();
    const title = $('#taskTitle').value.trim(); if (!title) return;
    S.tasks.unshift({ id: uid(), title, due: $('#taskDue').value, est: Math.max(1, Math.min(20, +$('#taskEst').value || 1)), pomo: 0, done: false, counted: false });
    $('#taskTitle').value = ''; $('#taskDue').value = '';
    dirty = panelDirty = true; save(); render();
  });
  $('#taskFilter').addEventListener('click', e => {
    const b = e.target.closest('button[data-f]'); if (!b) return;
    taskFilter = b.dataset.f;
    $$('#taskFilter button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    panelDirty = true; render();
  });
  $('#taskList').addEventListener('click', e => {
    const b = e.target.closest('button[data-act]'); if (!b) return;
    const t = taskById(b.dataset.id); if (!t) return;
    if (b.dataset.act === 'toggle') {
      t.done = !t.done;
      if (t.done && !t.counted) {
        t.counted = true; S.stats.tasksDone++;
        addLog('sys', `タスク「${t.title}」を完了した`);
        say(Math.random() < 0.25 ? 'R' : 'N');
        toast('タスク完了', t.title);
      }
      checkProgress();
    } else if (b.dataset.act === 'focus') { S.curTask = t.id; showTab('adventure'); }
    else if (b.dataset.act === 'del') { S.tasks = S.tasks.filter(x => x !== t); if (S.curTask === t.id) S.curTask = null; }
    dirty = panelDirty = true; save(); render();
  });

  // 日程
  $('#schedDate').value = dkey();
  $('#schedForm').addEventListener('submit', e => {
    e.preventDefault();
    const title = $('#schedTitle').value.trim(), date = $('#schedDate').value; if (!title || !date) return;
    S.sched.push({ id: uid(), date, time: $('#schedTime').value, title, done: false, counted: false });
    $('#schedTitle').value = '';
    const d = parseKey(date), ws = weekStart(), base = new Date(ws); base.setDate(ws.getDate() - weekOffset * 7);
    weekOffset = Math.floor(Math.round((d - base) / 864e5) / 7);
    panelDirty = true; save(); render();
  });
  $('#week').addEventListener('click', e => {
    const b = e.target.closest('button[data-sact]'); if (!b) return;
    const ev = S.sched.find(x => x.id === b.dataset.id); if (!ev) return;
    if (b.dataset.sact === 'toggle') {
      ev.done = !ev.done;
      if (ev.done && !ev.counted) { ev.counted = true; S.stats.schedDone++; checkProgress(); }
    } else S.sched = S.sched.filter(x => x !== ev);
    panelDirty = true; save(); render();
  });
  $('#wkPrev').addEventListener('click', () => { weekOffset--; panelDirty = true; render(); });
  $('#wkNext').addEventListener('click', () => { weekOffset++; panelDirty = true; render(); });
  $('#wkToday').addEventListener('click', () => { weekOffset = 0; panelDirty = true; render(); });

  // 物語
  $('#storyList').addEventListener('click', e => {
    const b = e.target.closest('button[data-chap]'); if (!b) return;
    openChapter(b.dataset.chap === 'epi' ? 'epi' : +b.dataset.chap);
  });
  $('#modal').addEventListener('click', e => {
    if (e.target.id === 'modal') return closeModal();
    const b = e.target.closest('button[data-m]'); if (!b) return;
    const m = b.dataset.m;
    if (m === 'close') { closeModal(); panelDirty = true; render(); }
    else if (m === 'go') openChapter(+b.dataset.n);
    else if (m === 'epi') openChapter('epi');
    else if (m === 'wipe') { try { localStorage.removeItem(KEY); } catch (err) { /* noop */ } S = fresh(); S.stats.launches = 1; closeModal(); heroKey = ''; logLen = -1; addLog('sys', 'あたらしい旅がはじまった'); dirty = panelDirty = true; save(); render(); }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#modal').hidden) closeModal(); });

  // 衣装室
  $('#wardSeg').addEventListener('click', e => { const b = e.target.closest('button[data-w]'); if (!b) return; wardTab = b.dataset.w; panelDirty = true; render(); });
  $('#wardBody').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    if (b.dataset.outfit) S.look.outfit = b.dataset.outfit;
    else if (b.dataset.hair) S.look.hair = b.dataset.hair;
    else if (b.dataset.color) S.look.color = b.dataset.color;
    else if (b.dataset.equip) {
      const it = EQ[b.dataset.equip];
      if (it.slot === 'guard' && S.equip.guard === it.id) S.equip.guard = null;
      else S.equip[it.slot] = it.id;
    }
    dirty = panelDirty = true; saveSoon(); render();
  });

  // 設定
  const bindNum = (id, key, lo, hi) => $(id).addEventListener('change', e => {
    S.settings[key] = Math.max(lo, Math.min(hi, Math.round(+e.target.value) || lo));
    e.target.value = S.settings[key];
    if (!S.timer.running && (key === S.timer.mode)) S.timer.remain = dur(S.timer.mode);
    save(); render();
  });
  bindNum('#setWork', 'work', 1, 180); bindNum('#setShort', 'short', 1, 60); bindNum('#setLong', 'long', 1, 90); bindNum('#setEvery', 'every', 2, 10);
  $('#setAuto').addEventListener('change', e => { S.settings.auto = e.target.checked; save(); });
  $('#setSound').addEventListener('change', e => { S.settings.sound = e.target.checked; if (e.target.checked) { ensureAudio(); chime(); } save(); });
  $('#btnExport').addEventListener('click', () => { $('#saveText').value = JSON.stringify(S); $('#saveMsg').textContent = '書き出しました。コピーして保管してください。'; });
  $('#btnCopy').addEventListener('click', () => {
    const ta = $('#saveText'); if (!ta.value) ta.value = JSON.stringify(S);
    const done = () => { $('#saveMsg').textContent = 'コピーしました。'; };
    try { navigator.clipboard.writeText(ta.value).then(done, () => { ta.select(); $('#saveMsg').textContent = '選択しました。Ctrl+C（⌘C）でコピーしてください。'; }); }
    catch (err) { ta.select(); $('#saveMsg').textContent = '選択しました。Ctrl+C（⌘C）でコピーしてください。'; }
  });
  $('#btnImport').addEventListener('click', () => {
    try {
      const d = JSON.parse($('#saveText').value);
      if (!d || d.v !== 1 || !d.stats) throw new Error('bad');
      S = merge(fresh(), d); heroKey = ''; logLen = -1;
      $('#saveMsg').textContent = '読み込みました。';
      dirty = panelDirty = true; save(); render();
    } catch (err) { $('#saveMsg').textContent = '読み込めませんでした。書き出した文字列をそのまま貼り付けてください。'; }
  });
  $('#btnWipe').addEventListener('click', () => openModal(`<div class="no">CONFIRM</div><h3>最初からやり直しますか？</h3><p>作業記録・物語・装備・タスク・日程がすべて消えます。この操作は取り消せません。</p><div class="acts"><button class="btn" data-m="close">やめる</button><button class="btn primary" data-m="wipe">すべて消して始める</button></div>`));

  document.addEventListener('visibilitychange', () => { tick(); save(); if (!document.hidden) { dirty = panelDirty = true; render(); } });
  window.addEventListener('pagehide', () => { tick(); save(); });

  /* ================= 起動 ================= */
  S.stats.launches++;
  if (!S.log.length) {
    addLog('sys', `${PRINCESS}姫「はじめまして。あなたが頑張っている間、私も世界を回って、みんなを応援してくるわね」`);
    addLog('', 'タイマーの「はじめる」を押すと旅が始まります。作業が長いほど世界に色が戻っていきます');
  } else {
    addLog('sys', `おかえりなさい。起動${S.stats.launches}回目の旅`);
  }
  if (S.seenUnlocked > unlockedCount()) S.seenUnlocked = unlockedCount();
  checkProgress();
  let initTab = 'adventure';
  try { initTab = (location.hash || '').slice(1) || localStorage.getItem(KEY + '-tab') || 'adventure'; } catch (e) { /* noop */ }
  showTab(initTab);
  save();
  setInterval(() => { tick(); render(); }, 250);
  requestAnimationFrame(frame);
})();
