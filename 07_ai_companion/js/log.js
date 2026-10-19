// きろく：数字は「ふりかえりの材料」。連続日数で追いこむ表示はしない。
M.log = (() => {
  const sum = (o) => Object.values(o).reduce((a, b) => a + (Array.isArray(b) ? b.length : b), 0);

  function render() {
    const s = M.store.get();
    const d = M.today();
    const days = new Set([...Object.keys(s.focusByDay), ...Object.keys(s.worksByDay), ...s.moods.map((m) => m.d)]);
    const lv = M.story.level(s.bond);
    const stats = [
      [`${s.focusByDay[d] || 0}分`, '今日の集中'],
      [`${(sum(s.focusByDay) / 60).toFixed(1)}時間`, 'これまでの集中'],
      [`${sum(s.pomosByDay)}回`, 'ポモドーロ'],
      [`${sum(s.worksByDay)}回`, '5分ワーク'],
      [`${days.size}日`, 'いっしょにすごした日'],
      [`Lv.${lv}`, 'なかよし度'],
    ];
    const box = M.$('#stats');
    box.innerHTML = '';
    stats.forEach(([v, l]) => box.append(M.el('div', { class: 'stat' }, M.el('b', { text: v }), M.el('span', { text: l }))));

    // 7日間のグラフ
    const vals = Array.from({ length: 7 }, (_, i) => { const k = M.daysAgo(6 - i); return { k, v: s.focusByDay[k] || 0 }; });
    const max = Math.max(30, ...vals.map((x) => x.v));
    const W = 280, H = 110, bw = 28;
    let svg = `<svg viewBox="0 0 ${W} ${H + 24}" width="100%" role="img" aria-label="7日間の集中時間">`;
    vals.forEach((x, i) => {
      const h = Math.round(x.v / max * H);
      const xPos = 12 + i * 38;
      const wd = ['日', '月', '火', '水', '木', '金', '土'][new Date(x.k).getDay()];
      svg += `<rect x="${xPos}" y="${H - h}" width="${bw}" height="${Math.max(h, 2)}" rx="6" fill="${x.k === d ? '#3f9fbf' : '#a6e3f0'}"><title>${x.k}：${x.v}分</title></rect>`;
      if (x.v) svg += `<text x="${xPos + bw / 2}" y="${H - h - 4}" font-size="10" text-anchor="middle" fill="#5f7a86">${x.v}</text>`;
      svg += `<text x="${xPos + bw / 2}" y="${H + 16}" font-size="11" text-anchor="middle" fill="#8aa1ab">${wd}</text>`;
    });
    M.$('#weekChart').innerHTML = svg + '</svg>';

    // スタンプ（4週間）
    const cal = M.$('#stampCal');
    cal.innerHTML = '';
    ['日', '月', '火', '水', '木', '金', '土'].forEach((w) => cal.append(M.el('div', { class: 'h', text: w })));
    const start = new Date(); start.setDate(start.getDate() - 27 - start.getDay());
    for (let i = 0; i < 28 + new Date().getDay() + 1; i++) {
      const dt = new Date(start); dt.setDate(start.getDate() + i);
      const k = M.today(dt);
      const on = (s.worksByDay[k] || []).length > 0;
      cal.append(M.el('div', { class: 'd' + (on ? ' on' : ''), title: k, text: on ? '' : String(dt.getDate()) }));
    }

    // ものがたり
    const list = M.$('#storyList');
    list.innerHTML = '';
    M.story.EP.forEach((ep, i) => {
      const locked = lv < ep.lv;
      const isNew = !locked && !s.storySeen.includes(i);
      list.append(M.el('button', { type: 'button', class: 'story-item' + (locked ? ' locked' : ''), onclick: () => { if (!locked) openStory(i); } },
        locked ? `🔒 第${i + 1}話（なかよし度 Lv.${ep.lv}）` : `第${i + 1}話　${ep.title}${isNew ? '　✦new' : ''}`));
    });

    // 心の天気
    const ml = M.$('#moodLog');
    ml.innerHTML = '';
    const recent = s.moods.slice(-30);
    if (!recent.length) ml.append(M.el('span', { class: 'tiny muted', text: '会話モードや5分ワークのあとで、気分を記録できるよ。' }));
    recent.forEach((m) => {
      const mood = M.talk.MOODS.find((x) => x.value === m.m);
      ml.append(M.el('span', { title: m.d, text: mood ? mood.emoji : '・' }));
    });
  }

  function openStory(i) {
    const ep = M.story.EP[i];
    const s = M.store.get();
    if (!s.storySeen.includes(i)) { s.storySeen.push(i); M.store.save(); }
    M.$('#storyTitle').textContent = `第${i + 1}話　${ep.title}`;
    const body = M.$('#storyBody');
    body.innerHTML = '';
    ep.body.forEach((p) => body.append(M.el('p', { text: M.fill(p) })));
    M.$('#storyView').hidden = false;
    M.voice.say(ep.body[0], 'smile');
    render();
  }

  return { render, openStory };
})();
