// 保存（この端末のlocalStorageだけ）
M.store = (() => {
  const KEY = 'mion_room_v1';
  const defaults = () => ({
    settings: {
      name: '',
      voice: false,
      voiceName: '',
      rate: 95,
      pitch: 112,
      vvol: 80,
      calm: false,
      bigText: false,
      notify: false,
      time: 'auto',
      weather: 'clear',
      theme: 'aqua',
      outfit: 'hoodie',
      furniture: ['plant', 'lamp'],
      pomo: { work: 25, short: 5, long: 15, every: 4, auto: false, chime: true, talk: 1 },
      musicVol: 45,
      track: 0,
      amb: {},
    },
    bond: 0,
    focusByDay: {},   // { '2026-10-19': 分 }
    pomosByDay: {},
    worksByDay: {},   // { date: [workId...] }
    moods: [],        // [{ d, m }]
    todos: [],
    memo: '',
    talks: 0,
    storySeen: [],
    firstDay: M.today(),
  });

  let data;
  try {
    const raw = localStorage.getItem(KEY);
    data = raw ? JSON.parse(raw) : null;
  } catch (e) { data = null; }
  const base = defaults();
  if (!data) data = base;
  // 新しい項目が増えても壊れないように足りないものを補う
  data = Object.assign(base, data);
  data.settings = Object.assign(defaults().settings, data.settings);
  data.settings.pomo = Object.assign(defaults().settings.pomo, data.settings.pomo);

  let timer = null;
  const save = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* 保存できない環境でも動かす */ }
    }, 300);
  };

  return {
    get: () => data,
    save,
    replace(obj) { data = Object.assign(defaults(), obj); save(); },
    reset() { data = defaults(); try { localStorage.removeItem(KEY); } catch (e) {} },
  };
})();
