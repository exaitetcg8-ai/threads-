// 共通ユーティリティ
window.M = window.M || {};

M.$ = (sel, root) => (root || document).querySelector(sel);
M.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

M.el = (tag, attrs, ...children) => {
  const e = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) e.setAttribute(k, v);
    }
  }
  for (const c of children) if (c != null) e.append(c);
  return e;
};

M.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// 直近に使ったものを避けて選ぶ（同じ言葉のくり返しを減らす）
M.pickFresh = (() => {
  const recent = new Map();
  return (key, arr, memory) => {
    const keep = Math.min(memory || 4, arr.length - 1);
    const used = recent.get(key) || [];
    const candidates = arr.map((_, i) => i).filter((i) => !used.includes(i));
    const idx = M.pick(candidates.length ? candidates : arr.map((_, i) => i));
    used.push(idx);
    while (used.length > keep) used.shift();
    recent.set(key, used);
    return arr[idx];
  };
})();

M.today = (d) => {
  const t = d || new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
};

M.daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return M.today(d);
};

M.fmtTime = (sec) => {
  sec = Math.max(0, Math.round(sec));
  return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
};

// 日付から決まる乱数（「今日のワーク」が1日のあいだ変わらないように）
M.seeded = (seedStr) => {
  let h = 2166136261;
  for (const c of seedStr) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
    return ((h >>> 0) % 100000) / 100000;
  };
};

M.timeOfDay = () => {
  const h = new Date().getHours();
  if (h >= 5 && h < 10) return 'morning';
  if (h >= 10 && h < 16) return 'day';
  if (h >= 16 && h < 19) return 'evening';
  return 'night';
};

M.toast = (text) => {
  const t = M.$('#toast');
  t.textContent = text;
  t.hidden = false;
  clearTimeout(M._toastTimer);
  M._toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
};

// 名前の差しこみ
M.fill = (text) => text.replace(/\{name\}/g, (M.store && M.store.get().settings.name) || 'あなた');
