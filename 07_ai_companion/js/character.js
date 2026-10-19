// りんのモデル（Live2Dのような「パーツ分け＋パラメータ」で動く2Dモデル）
// ・頭の向き（左右・上下・かたむき）をパーツごとの奥行きずらしで立体的に見せる
// ・目の開閉、目線、まゆ、口の開き・形、ほお、呼吸、体の向き
// ・髪やツインテール、うさみみは揺れもの（ばね）で、頭の動きに少し遅れてついてくる
// 入力は3つ：表情プリセット、ふだんの動き（まばたき・マウスを見る・ゆらゆら）、外部入力（Webカメラの顔トラッキング・マイク）
M.chara = (() => {
  const OUTFITS = {
    knit:   { label: 'もこもこニット',       lv: 1,  main: '#fbfbff', sub: '#eef0fa', accent: '#8fb4f0', body: 'off',    acc: [] },
    parka:  { label: 'ねこみみパーカー',     lv: 3,  main: '#eaf3ff', sub: '#ffffff', accent: '#5b7fd6', body: 'normal', acc: ['hood', 'catears', 'bigbow'] },
    casual: { label: 'ヘッドホンとツインテ', lv: 5,  main: '#3a3f5c', sub: '#f4f6ff', accent: '#8fb4f0', body: 'normal', acc: ['twintails', 'headphones'] },
    bunny:  { label: 'うさみみルームウェア', lv: 7,  main: '#f3f1fb', sub: '#e4e0f5', accent: '#a99be0', body: 'normal', acc: ['hood', 'bunny'] },
    idol:   { label: 'ステージ衣装',         lv: 9,  main: '#ffffff', sub: '#2e3a78', accent: '#4f7fe6', body: 'normal', acc: ['bigbow'] },
    coat:   { label: 'ふわふわコート',       lv: 12, main: '#f6f8ff', sub: '#dfe7fb', accent: '#7f9ee0', body: 'normal', acc: ['bigbow'] },
  };

  // 表情プリセット（Live2Dの「表情ファイル」にあたる）
  const EXPRESSIONS = {
    normal:   { eye: 1, smile: 0, mouthForm: 0.2, mouthOpen: 0, brow: 0, worry: 0, cheek: 0.55 },
    smile:    { eye: 1, smile: 0, mouthForm: 1, mouthOpen: 0.25, brow: 0.2, worry: 0, cheek: 0.6 },
    happy:    { eye: 0, smile: 1, mouthForm: 1, mouthOpen: 0.7, brow: 0.4, worry: 0, cheek: 0.8 },
    wink:     { eye: 1, winkR: true, smile: 0, mouthForm: 1, mouthOpen: 0.6, brow: 0.3, worry: 0, cheek: 0.8 },
    calm:     { eye: 0, smile: 1, mouthForm: 0.8, mouthOpen: 0.1, brow: 0, worry: 0, cheek: 0.6 },
    worry:    { eye: 0.9, smile: 0, mouthForm: -0.7, mouthOpen: 0, brow: 0, worry: 1, cheek: 0.4 },
    surprise: { eye: 1.15, smile: 0, mouthForm: 0, mouthOpen: 0.55, brow: 0.9, worry: 0, cheek: 0.5 },
    sleepy:   { eye: 0.38, smile: 0, mouthForm: 0, mouthOpen: 0, brow: -0.3, worry: 0.3, cheek: 0.5 },
    shy:      { eye: 0.8, smile: 0, mouthForm: 0.4, mouthOpen: 0, brow: 0, worry: 0.6, cheek: 1 },
  };

  const SKIN = '#fff0ea';
  const PETALS = (stroke) => [0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-10" rx="7" ry="11" fill="#ffffff" stroke="#c9d4f5" stroke-width="${stroke}" transform="rotate(${a})"/>`).join('');

  const eye = (side, x, y) => `
    <g class="eye eye-${side}" transform="translate(${x} ${y}) scale(1.12)">
      <g class="eye-open">
        <ellipse rx="15" ry="18.5" fill="#fff"/>
        <g clip-path="url(#eyeClip)">
          <g class="iris">
            <ellipse rx="13" ry="17" fill="url(#irisG)"/>
            <ellipse rx="13" ry="17" fill="none" stroke="#3d3f8f" stroke-width="1.2" opacity=".6"/>
            <ellipse cy="2" rx="6" ry="8" fill="#2f3277"/>
            <ellipse cy="9" rx="9" ry="5" fill="#b9cbff" opacity=".55"/>
            <circle cx="-5" cy="-7" r="4.6" fill="#fff"/>
            <circle cx="5" cy="-9" r="1.8" fill="#fff"/>
            <circle cx="4" cy="7" r="2.2" fill="#fff" opacity=".9"/>
          </g>
        </g>
        <path d="M-8 18 C-3 20 3 20 8 18" stroke="#c9b8c8" stroke-width="1.2" fill="none"/>
      </g>
      <path class="eye-lash" d="${side === 'r' ? 'M-17 -11 C-9 -22 9 -23 17 -14 L18 -9' : 'M17 -11 C9 -22 -9 -23 -17 -14 L-18 -9'}" stroke="#4a4f7a" stroke-width="3.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path class="eye-shut" d="M-15 4 C-8 9 8 9 15 4" stroke="#4a4f7a" stroke-width="3.4" fill="none" stroke-linecap="round" style="display:none"/>
      <path class="eye-smile" d="M-14 2 C-8 -9 8 -9 14 2" stroke="#4a4f7a" stroke-width="3.4" fill="none" stroke-linecap="round" style="display:none"/>
    </g>`;

  // data-d：奥行き。大きいほど顔の向きに合わせて大きく動く（マイナスは反対へ）
  const svg = `
<svg viewBox="0 0 400 500" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="hairG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#eef0fa"/>
      <stop offset=".8" stop-color="#d6dcf3"/><stop offset="1" stop-color="#b9c6ee"/>
    </linearGradient>
    <linearGradient id="hairBack" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#dfe3f5"/><stop offset=".6" stop-color="#c9d2f0"/><stop offset="1" stop-color="#a9bdf0"/>
    </linearGradient>
    <radialGradient id="irisG" cx=".5" cy=".3" r=".8">
      <stop offset="0" stop-color="#dfe8ff"/><stop offset=".35" stop-color="#8ea6f2"/>
      <stop offset=".75" stop-color="#5a62cf"/><stop offset="1" stop-color="#3a3c94"/>
    </radialGradient>
    <linearGradient id="skinG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff6f2"/><stop offset="1" stop-color="${SKIN}"/>
    </linearGradient>
    <pattern id="knit" width="10" height="12" patternUnits="userSpaceOnUse">
      <path d="M5 0 L5 12" stroke="#000" stroke-width="1" opacity=".035"/>
    </pattern>
    <clipPath id="eyeClip"><ellipse rx="15" ry="18.5"/></clipPath>
    <clipPath id="mouthClip"><path class="mouth-clip"/></clipPath>
  </defs>

  <g class="rig-all">
  <g class="rig-body">
    <!-- 頭のうしろ側（体より奥） -->
    <g class="rig-head-back">
      <g data-d="-0.2">
        <g class="acc acc-twintails">
          <path class="phys-tail-l" fill="url(#hairBack)" stroke="#c3cbea" stroke-width="1.2" d="M134 130 C80 150 62 240 76 330 C84 380 70 410 60 430 C96 420 112 380 110 330 C106 260 118 190 150 150 Z"/>
          <path class="phys-tail-r" fill="url(#hairBack)" stroke="#c3cbea" stroke-width="1.2" d="M266 130 C320 150 338 240 324 330 C316 380 330 410 340 430 C304 420 288 380 290 330 C294 260 282 190 250 150 Z"/>
        </g>
        <g class="acc acc-hood">
          <path class="c-sub-fill" d="M108 230 C92 120 150 66 200 66 C250 66 308 120 292 230 C300 270 280 300 250 306 L150 306 C120 300 100 270 108 230 Z"/>
          <path class="c-accent-stroke" fill="none" stroke-width="2" opacity=".4" d="M120 220 C112 130 160 84 200 84 C240 84 288 130 280 220"/>
        </g>
      </g>
      <g data-d="-0.35">
        <path class="phys-back" fill="url(#hairBack)" stroke="#c3cbea" stroke-width="1.5"
          d="M124 140 C98 220 94 330 102 462 C126 478 154 474 172 456 L228 456 C246 474 274 478 298 462 C306 330 302 220 276 140 Z"/>
      </g>
    </g>

    <!-- 首 -->
    <path fill="#fbe2d8" d="M184 258 L216 258 L218 306 L182 306 Z"/>

    <!-- 服：オフショルダー -->
    <g class="body body-off">
      <path fill="${SKIN}" d="M206 298 C240 300 282 314 306 348 L296 360 L230 340 Z"/>
      <path d="M252 314 L262 350" stroke="#9cc0f2" stroke-width="3.5" stroke-linecap="round"/>
      <path class="c-main" d="M66 500 C66 392 104 318 166 300 C176 312 186 318 198 320 C232 330 266 340 300 352 C326 390 334 440 334 500 Z"/>
      <path fill="url(#knit)" d="M66 500 C66 392 104 318 166 300 C176 312 186 318 198 320 C232 330 266 340 300 352 C326 390 334 440 334 500 Z"/>
      <path class="c-sub-stroke" fill="none" stroke-width="9" stroke-linecap="round" d="M164 302 C176 318 190 322 200 323 C236 332 268 342 302 352"/>
      <path fill="none" stroke="#e0e4f2" stroke-width="1.2" stroke-dasharray="2 3" d="M164 302 C176 318 190 322 200 323 C236 332 268 342 302 352"/>
      <g transform="translate(198 346)">
        <path class="c-accent-fill" d="M0 0 L-14 -7 L-14 7 Z M0 0 L14 -7 L14 7 Z"/>
        <circle r="3.5" class="c-accent-fill"/>
        <path class="c-accent-stroke" stroke-width="2.5" fill="none" d="M-2 2 L-7 18 M2 2 L7 18"/>
      </g>
    </g>
    <!-- 服：ふつう -->
    <g class="body body-normal">
      <path class="c-main" d="M66 500 C66 390 106 318 168 300 L200 318 L232 300 C294 318 334 390 334 500 Z"/>
      <path class="c-sub-fill" d="M150 308 C170 330 188 336 200 318 C212 336 230 330 250 308 C262 314 272 324 278 336 C252 352 226 350 200 340 C174 350 148 352 122 336 C128 324 138 314 150 308 Z"/>
      <path class="c-accent-stroke" d="M200 340 L200 500" stroke-width="2.5" fill="none"/>
    </g>
    <g class="acc acc-bigbow" transform="translate(200 334)">
      <path class="c-accent-fill" d="M0 0 C-10 -16 -34 -18 -34 -2 C-34 12 -12 10 0 0 Z M0 0 C10 -16 34 -18 34 -2 C34 12 12 10 0 0 Z"/>
      <path class="c-accent-fill" d="M-3 2 L-14 34 L-6 30 L0 4 Z M3 2 L14 34 L6 30 L0 4 Z" opacity=".85"/>
      <circle r="5" fill="#fff"/><circle r="3" class="c-accent-fill"/>
    </g>

    <!-- 頭の前側 -->
    <g class="rig-head">
      <g data-d="0.1">
        <g class="acc acc-headphones">
          <path d="M134 176 C128 74 272 74 266 176" stroke="#2c2f45" stroke-width="9" fill="none" stroke-linecap="round"/>
        </g>
      </g>
      <g data-d="0.22">
        <path fill="url(#skinG)" d="M142 164 C142 106 258 106 258 164 C258 214 234 252 200 256 C166 252 142 214 142 164 Z"/>
      </g>
      <g data-d="0.45" class="cheek">
        <ellipse cx="160" cy="216" rx="15" ry="7" fill="#ffadbd"/>
        <ellipse cx="240" cy="216" rx="15" ry="7" fill="#ffadbd"/>
        <path d="M152 214 l4 -5 M159 215 l4 -5 M166 216 l4 -5 M234 214 l4 -5 M241 215 l4 -5 M248 216 l4 -5" stroke="#f497a8" stroke-width="1.2"/>
      </g>
      <g data-d="0.45">
        ${eye('l', 171, 192)}
        ${eye('r', 229, 192)}
      </g>
      <g data-d="0.5">
        <path class="brow-l" stroke="#b9bfdc" stroke-width="2.4" fill="none" stroke-linecap="round"/>
        <path class="brow-r" stroke="#b9bfdc" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      </g>
      <g data-d="0.6">
        <path d="M200 214 l-1.5 4" stroke="#f0c4b8" stroke-width="1.4" stroke-linecap="round"/>
      </g>
      <g data-d="0.5" class="mouth">
        <path class="mouth-line" stroke="#c4707e" stroke-width="2.2" fill="none" stroke-linecap="round"/>
        <g class="mouth-open">
          <path class="mouth-fill" fill="#d9606f"/>
          <g clip-path="url(#mouthClip)">
            <ellipse class="tongue" cx="200" rx="9" ry="6" fill="#ff9fab"/>
            <rect class="teeth" x="186" width="28" height="3" fill="#fff"/>
          </g>
        </g>
      </g>

      <g data-d="0.5">
        <path class="phys-side-l" fill="url(#hairG)" stroke="#cdd4ee" stroke-width="1" d="M140 150 C122 210 118 320 134 410 C150 380 156 300 156 200 Z"/>
        <path class="phys-side-r" fill="url(#hairG)" stroke="#cdd4ee" stroke-width="1" d="M260 150 C278 210 282 320 266 410 C250 380 244 300 244 200 Z"/>
        <path class="phys-side-l" d="M140 220 C134 280 136 340 140 380" stroke="#c6cfee" stroke-width="1.4" fill="none" opacity=".8"/>
        <path class="phys-side-r" d="M260 220 C266 280 264 340 260 380" stroke="#c6cfee" stroke-width="1.4" fill="none" opacity=".8"/>
      </g>
      <g data-d="0.6" class="phys-front">
        <path fill="url(#hairG)" stroke="#cdd4ee" stroke-width="1.2" stroke-linejoin="round"
          d="M134 182 C122 104 166 76 200 78 C238 76 280 102 266 184 L258 150 L250 178 L240 128 L228 170 L214 118 L204 166 L192 120 L182 168 L170 126 L160 176 L152 140 L144 186 Z"/>
        <path d="M170 126 L166 160 M192 120 L190 150 M214 118 L218 150 M240 128 L244 158" stroke="#c6cfee" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".9"/>
        <path d="M156 106 C178 94 222 94 244 106" stroke="#ffffff" stroke-width="4" fill="none" opacity=".9" stroke-linecap="round"/>
        <path class="phys-ahoge" d="M198 80 C192 58 210 50 218 60 C208 58 202 66 202 80 Z" fill="#eef0fa"/>
      </g>

      <g data-d="0.15">
        <g class="acc acc-headphones">
          <rect x="120" y="160" width="24" height="40" rx="10" fill="#2c2f45"/>
          <rect x="256" y="160" width="24" height="40" rx="10" fill="#2c2f45"/>
          <rect x="124" y="168" width="8" height="24" rx="4" fill="#8fb4f0"/>
          <rect x="268" y="168" width="8" height="24" rx="4" fill="#8fb4f0"/>
        </g>
        <g class="acc acc-catears">
          <path class="c-sub-fill c-accent-stroke" stroke-width="1.5" d="M136 118 L130 60 L178 92 Z"/>
          <path class="c-sub-fill c-accent-stroke" stroke-width="1.5" d="M264 118 L270 60 L222 92 Z"/>
          <path d="M140 108 L137 74 L166 94 Z M260 108 L263 74 L234 94 Z" fill="#ffd3dc"/>
        </g>
        <g class="acc acc-bunny">
          <g class="phys-ear-l">
            <path class="c-sub-fill c-accent-stroke" stroke-width="1.5" d="M150 96 C110 70 82 110 96 170 C106 186 120 160 130 130 Z"/>
            <path d="M140 104 C116 92 102 116 106 150 Z" fill="#ffdbe3"/>
          </g>
          <g class="phys-ear-r">
            <path class="c-sub-fill c-accent-stroke" stroke-width="1.5" d="M250 96 C290 70 318 110 304 170 C294 186 280 160 270 130 Z"/>
            <path d="M260 104 C284 92 298 116 294 150 Z" fill="#ffdbe3"/>
          </g>
        </g>
      </g>

      <g data-d="0.62">
        <g transform="translate(236 132)">
          <rect x="-3" y="-16" width="6" height="32" rx="3" fill="#ffffff" stroke="#8fb4f0" stroke-width="1.6" transform="rotate(35)"/>
          <rect x="-3" y="-16" width="6" height="32" rx="3" fill="#ffffff" stroke="#8fb4f0" stroke-width="1.6" transform="rotate(-25)"/>
        </g>
        <g transform="translate(262 146)">
          <path class="phys-ribbon" d="M0 6 C-4 20 -8 34 -12 46 M2 6 C6 22 10 34 16 44" stroke="#7fa6ec" stroke-width="4" fill="none" stroke-linecap="round"/>
          <path d="M0 4 L-12 -2 L-10 10 Z M0 4 L12 -2 L10 10 Z" fill="#7fa6ec"/>
          ${PETALS(1.2)}
          <circle r="5" fill="#ffe9a8"/><circle r="2.4" fill="#9db7f2"/>
        </g>
        <g transform="translate(150 132) scale(.55)">${PETALS(1.6)}<circle r="5" fill="#9db7f2"/></g>
      </g>
    </g>
  </g>
  </g>

  <!-- 机と小物（モデルとは別。配信用スタジオでは隠せる） -->
  <g class="c-desk">
    <rect x="40" y="440" width="320" height="60" rx="10" fill="#f6f1ee"/>
    <rect x="40" y="440" width="320" height="8" rx="4" fill="#e7ddd8"/>
    <g class="c-mug" transform="translate(300 412)">
      <rect x="0" y="0" width="26" height="34" rx="5" fill="#ffffff" stroke="#c9d4f5" stroke-width="2" opacity=".95"/>
      <rect x="2" y="12" width="22" height="20" rx="4" fill="#d9e4ff"/>
      <path d="M16 -14 L12 12" stroke="#8fb4f0" stroke-width="3" stroke-linecap="round"/>
      <path class="c-steam" d="M6 -4 C2 -12 10 -16 6 -24" stroke="#dfe6f7" stroke-width="2" fill="none" stroke-linecap="round"/>
    </g>
    <g transform="translate(70 404)">
      <ellipse cx="22" cy="28" rx="24" ry="16" fill="#ffffff" stroke="#e3e7f3" stroke-width="1.5"/>
      <circle cx="22" cy="12" r="14" fill="#ffffff" stroke="#e3e7f3" stroke-width="1.5"/>
      <path d="M10 4 C6 -4 12 -6 14 0 M34 4 C38 -4 32 -6 30 0" fill="#ffffff" stroke="#e3e7f3"/>
      <path d="M15 12 q2 -2 4 0 M25 12 q2 -2 4 0 M19 17 q3 3 6 0" stroke="#7a7f99" stroke-width="1.4" fill="none"/>
      <ellipse cx="13" cy="16" rx="3" ry="1.6" fill="#ffc2cc"/><ellipse cx="31" cy="16" rx="3" ry="1.6" fill="#ffc2cc"/>
    </g>
    <g class="c-work" style="display:none">
      <path d="M120 446 L190 432 L260 446 L190 460 Z" fill="#ffffff" stroke="#dfe3f2" stroke-width="2"/>
      <path d="M190 432 L190 460" stroke="#dfe3f2" stroke-width="2"/>
      <path d="M140 444 L176 437 M140 450 L172 444 M206 438 L240 444 M206 444 L236 450" stroke="#dde3f4" stroke-width="2"/>
      <g class="c-pen"><ellipse cx="238" cy="440" rx="13" ry="10" class="c-main" stroke="#e3e7f3"/>
        <path d="M232 444 L262 410" stroke="#8fb4f0" stroke-width="4" stroke-linecap="round"/></g>
      <ellipse cx="150" cy="446" rx="13" ry="10" class="c-main" stroke="#e3e7f3"/>
    </g>
  </g>
</svg>`;

  // ---------- パラメータ ----------
  // Live2Dの標準パラメータに近い名前と範囲
  const P = {
    angleX: 0, angleY: 0, angleZ: 0,  // -30〜30
    bodyX: 0,                          // -10〜10
    eyeL: 1, eyeR: 1,                  // 0〜1.2
    eyeSmile: 0,                       // 0〜1
    ballX: 0, ballY: 0,                // -1〜1
    brow: 0, worry: 0,                 // -1〜1, 0〜1
    mouthOpen: 0, mouthForm: 0,        // 0〜1, -1〜1
    cheek: 0.55, breath: 0, bounce: 0,
  };
  // 外部入力（スタジオから書きこむ）
  const input = { track: null, trackAt: 0, mic: 0, mirror: true, mouseFollow: true, idle: true };

  let root, nodes = {}, state = { exp: 'smile', working: false, speaking: false };
  let exp = EXPRESSIONS.smile;
  const pointer = { x: 0, y: 0, at: 0 };
  const blinkS = { next: 0, t: -1 };
  const speakS = { next: 0, target: 0 };
  const phys = {};
  let hopV = 0;
  let last = 0;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  function mount(container) {
    container.innerHTML = svg;
    root = container.querySelector('svg');
    nodes = {
      all: root.querySelector('.rig-all'),
      body: root.querySelector('.rig-body'),
      headBack: root.querySelector('.rig-head-back'),
      head: root.querySelector('.rig-head'),
      layers: M.$$('[data-d]', root).map((g) => ({ g, d: Number(g.dataset.d) })),
      eyes: ['l', 'r'].map((s) => {
        const e = root.querySelector('.eye-' + s);
        return { e, open: e.querySelector('.eye-open'), iris: e.querySelector('.iris'), lash: e.querySelector('.eye-lash'), shut: e.querySelector('.eye-shut'), smile: e.querySelector('.eye-smile') };
      }),
      browL: root.querySelector('.brow-l'), browR: root.querySelector('.brow-r'),
      mLine: root.querySelector('.mouth-line'), mOpen: root.querySelector('.mouth-open'), mFill: root.querySelector('.mouth-fill'),
      mClip: root.querySelector('.mouth-clip'), tongue: root.querySelector('.tongue'), teeth: root.querySelector('.teeth'),
      cheek: root.querySelector('.cheek'),
      phys: {},
    };
    ['side-l', 'side-r', 'tail-l', 'tail-r', 'ear-l', 'ear-r', 'ahoge', 'ribbon', 'back', 'front'].forEach((k) => {
      nodes.phys[k] = M.$$('.phys-' + k, root);
    });
    injectStyle();
    setOutfit(M.store.get().settings.outfit);
    setExp('smile');
    root.addEventListener('click', () => { M.app && M.app.poke && M.app.poke(); });
    window.addEventListener('pointermove', (e) => {
      const r = container.getBoundingClientRect();
      pointer.x = clamp((e.clientX - (r.left + r.width / 2)) / (r.width * 0.9), -1, 1);
      pointer.y = clamp((e.clientY - (r.top + r.height * 0.36)) / (r.height * 0.9), -1, 1);
      pointer.at = performance.now();
    }, { passive: true });
    requestAnimationFrame(frame);
  }

  function injectStyle() {
    const style = document.createElement('style');
    style.textContent = `
      .chara .c-steam { animation: steam 3s ease-in-out infinite; }
      .chara.working .c-pen { transform-origin: 238px 440px; animation: write 1.2s ease-in-out infinite; }
      .chara.no-desk .c-desk { display: none; }
      @keyframes steam { 0% { opacity: 0; transform: translateY(4px); } 50% { opacity: .9; } 100% { opacity: 0; transform: translateY(-6px); } }
      @keyframes write { 50% { transform: translate(-10px, 3px); } }
    `;
    document.head.appendChild(style);
  }

  // ---------- 1フレームごとの計算 ----------
  function frame(now) {
    requestAnimationFrame(frame);
    if (!root || document.hidden) return;
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    const calm = M.store.get().settings.calm;
    const amp = calm ? 0.35 : 1;
    const t = now / 1000;
    const tracking = input.track && now - input.trackAt < 600;
    const T = {}; // この瞬間の目標値

    if (tracking) {
      const k = input.track;
      Object.assign(T, {
        angleX: k.angleX, angleY: k.angleY, angleZ: k.angleZ, bodyX: k.angleX / 3,
        ballX: k.ballX, ballY: k.ballY,
        eyeL: k.eyeL * exp.eye, eyeR: (exp.winkR ? 0 : k.eyeR) * exp.eye,
        mouthOpen: Math.max(k.mouthOpen, exp.mouthOpen * 0.3),
        mouthForm: clamp(exp.mouthForm * 0.6 + k.mouthForm, -1, 1),
        brow: clamp(exp.brow + k.brow, -1, 1),
      });
    } else {
      // ふだんの動き：マウスを見る、ゆらゆら、まばたき
      const look = input.mouseFollow && now - pointer.at < 4000;
      const sway = input.idle ? amp : 0;
      T.angleX = (look ? pointer.x * 22 : 0) + Math.sin(t * 0.5) * 5 * sway + Math.sin(t * 0.23) * 3 * sway;
      T.angleY = (look ? -pointer.y * 14 : 0) + Math.sin(t * 0.37 + 1) * 3 * sway;
      T.angleZ = Math.sin(t * 0.29 + 2) * 4 * sway;
      T.bodyX = T.angleX / 3;
      T.ballX = look ? pointer.x : Math.sin(t * 0.4) * 0.25 * sway;
      T.ballY = look ? pointer.y * 0.8 : 0;
      if (state.working) { T.angleY = -9; T.angleX = 4 + Math.sin(t * 0.6) * 3; T.ballY = 0.75; T.ballX = 0.2; T.angleZ = 4; }
      // まばたき
      if (now > blinkS.next && blinkS.t < 0) { blinkS.t = 0; }
      let blink = 1;
      if (blinkS.t >= 0) {
        blinkS.t += dt;
        blink = blinkS.t < 0.07 ? 1 - blinkS.t / 0.07 : blinkS.t < 0.16 ? (blinkS.t - 0.07) / 0.09 : 1;
        if (blinkS.t >= 0.16) { blinkS.t = -1; blinkS.next = now + 2200 + Math.random() * 3800; blink = 1; }
      }
      T.eyeL = exp.eye * blink;
      T.eyeR = (exp.winkR ? 0 : exp.eye) * blink;
      // しゃべる口
      let mo = exp.mouthOpen;
      if (state.speaking) {
        if (now > speakS.next) { speakS.target = 0.15 + Math.random() * 0.8; speakS.next = now + 70 + Math.random() * 90; }
        mo = speakS.target;
      }
      T.mouthOpen = mo;
      T.mouthForm = exp.mouthForm;
      T.brow = exp.brow;
    }
    if (input.mic > 0.02) T.mouthOpen = Math.max(T.mouthOpen, clamp(input.mic, 0, 1));
    T.eyeSmile = exp.smile;
    T.worry = exp.worry;
    T.cheek = exp.cheek;

    // なめらかに近づける（トラッキング時は速め）
    const f = tracking ? 0.45 : 0.12;
    for (const key of ['angleX', 'angleY', 'angleZ', 'bodyX', 'ballX', 'ballY', 'brow', 'worry', 'mouthForm', 'cheek', 'eyeSmile']) P[key] = lerp(P[key], T[key], f);
    P.eyeL = lerp(P.eyeL, T.eyeL, tracking ? 0.6 : 0.6);
    P.eyeR = lerp(P.eyeR, T.eyeR, tracking ? 0.6 : 0.6);
    P.mouthOpen = lerp(P.mouthOpen, T.mouthOpen, 0.45);
    P.breath = (Math.sin(t * 1.25) + 1) / 2;

    // ぴょん
    hopV -= P.bounce * 0.35;
    hopV *= 0.78;
    P.bounce += hopV;

    physics(t, amp);
    render();
  }

  // 揺れもの：ばねで頭の動きに遅れてついてくる
  function spring(key, target, k, damp) {
    const s = phys[key] || (phys[key] = { x: target, v: 0 });
    s.v += (target - s.x) * k;
    s.v *= damp;
    s.x += s.v;
    return s.x - target;
  }
  const physOut = {};
  // 頭は rotate(angleZ * 0.5) でかたむくので、髪には同じぶん逆回転をかけて下にたれるようにする
  function physics(t, amp) {
    const drive = P.angleX + P.angleZ * 1.2;
    physOut.side = spring('side', drive, 0.06, 0.86) * 0.9 + P.angleZ * 0.45 + Math.sin(t * 1.1) * 0.8 * amp;
    physOut.tail = spring('tail', drive, 0.04, 0.9) * 1.2 + P.angleZ * 0.5 + Math.sin(t * 0.9 + 1) * 1.5 * amp;
    physOut.ear = spring('ear', drive + P.angleY * 0.5, 0.05, 0.88) * 1.1 + Math.sin(t * 1.4) * 2 * amp;
    physOut.front = spring('front', P.angleX, 0.1, 0.8) * 0.35;
    physOut.back = spring('back', P.angleX, 0.05, 0.88) * 0.5;
    physOut.ahoge = spring('ahoge', P.angleX + P.bounce * 3, 0.08, 0.82) * 2 + Math.sin(t * 2) * 3 * amp;
    physOut.ribbon = spring('ribbon', drive, 0.05, 0.86) * 1.4 + Math.sin(t * 1.3) * 2 * amp;
  }

  const r1 = (v) => Math.round(v * 100) / 100;
  const DX = 11, DY = 8; // 奥行きずらしの強さ（左右・上下）

  function render() {
    const ax = P.angleX / 30, ay = P.angleY / 30;
    // 体：呼吸、体の向き、ぴょん
    nodes.all.setAttribute('transform', `translate(0 ${r1(P.bounce)})`);
    nodes.body.setAttribute('transform', `translate(${r1(P.bodyX * 0.6)} ${r1(-P.breath * 2.2)}) rotate(${r1(P.bodyX * 0.25)} 200 500)`);
    // 頭：かたむき＋全体のずれ
    const headT = `translate(${r1(ax * 5)} ${r1(14 - ay * 4)}) rotate(${r1(P.angleZ * 0.5)} 200 256)`;
    nodes.head.setAttribute('transform', headT);
    nodes.headBack.setAttribute('transform', headT);
    // パーツごとの奥行きずらし（これで顔が立体的に向きを変えて見える）
    for (const { g, d } of nodes.layers) g.setAttribute('transform', `translate(${r1(ax * d * DX)} ${r1(-ay * d * DY)})`);

    // 目
    nodes.eyes.forEach((E, i) => {
      const o = clamp(i === 0 ? P.eyeL : P.eyeR, 0, 1.2);
      const smiling = (P.eyeSmile > 0.5 && o < 0.6) || (exp.winkR && i === 1 && o < 0.15);
      const shut = o < 0.15;
      E.open.style.display = shut || smiling ? 'none' : '';
      E.lash.style.display = shut || smiling ? 'none' : '';
      E.shut.style.display = shut && !smiling ? '' : 'none';
      E.smile.style.display = smiling ? '' : 'none';
      if (!shut && !smiling) {
        E.open.setAttribute('transform', `translate(0 ${r1((1 - o) * 9)}) scale(1 ${r1(o)})`);
        E.lash.setAttribute('transform', `translate(0 ${r1((1 - Math.min(o, 1)) * 16)})`);
        E.iris.setAttribute('transform', `translate(${r1(P.ballX * 4.5)} ${r1(P.ballY * 4)})`);
      }
    });

    // まゆ
    const by = -P.brow * 4;
    const w = P.worry;
    nodes.browL.setAttribute('d', `M158 ${r1(165 + by + w * 3)} Q170 ${r1(160 + by - w)} 182 ${r1(164 + by - w * 6)}`);
    nodes.browR.setAttribute('d', `M218 ${r1(164 + by - w * 6)} Q230 ${r1(160 + by - w)} 242 ${r1(165 + by + w * 3)}`);
    nodes.cheek.setAttribute('opacity', r1(P.cheek));

    // 口
    const open = clamp(P.mouthOpen, 0, 1), form = clamp(P.mouthForm, -1, 1);
    const cx = 200, cy = 231;
    const hw = 9 + form * 3 + open * 3;
    const cornerY = cy - form * 3.5;
    if (open < 0.07) {
      nodes.mLine.style.display = '';
      nodes.mOpen.style.display = 'none';
      nodes.mLine.setAttribute('d', `M${r1(cx - hw * 0.7)} ${r1(cornerY + 1)} Q${cx} ${r1(cy + 1 + form * 4)} ${r1(cx + hw * 0.7)} ${r1(cornerY + 1)}`);
    } else {
      nodes.mLine.style.display = 'none';
      nodes.mOpen.style.display = '';
      const upperY = cy - 1 - open * 1.5 + Math.max(0, -form) * 2;
      const lowerY = cy + 2 + open * 19 + Math.max(0, form) * 2;
      const d = `M${r1(cx - hw)} ${r1(cornerY)} Q${cx} ${r1(upperY)} ${r1(cx + hw)} ${r1(cornerY)} Q${cx} ${r1(lowerY)} ${r1(cx - hw)} ${r1(cornerY)} Z`;
      nodes.mFill.setAttribute('d', d);
      nodes.mClip.setAttribute('d', d);
      nodes.tongue.setAttribute('cy', r1((cornerY + lowerY) / 2 + open * 5));
      nodes.teeth.setAttribute('y', r1(upperY - 1));
      nodes.teeth.style.display = form > 0.3 && open > 0.35 ? '' : 'none';
    }

    // 揺れもの
    const rot = (list, deg, cx2, cy2) => list.forEach((n) => n.setAttribute('transform', `rotate(${r1(deg)} ${cx2} ${cy2})`));
    rot(nodes.phys['side-l'], -physOut.side, 146, 150);
    rot(nodes.phys['side-r'], -physOut.side, 254, 150);
    rot(nodes.phys['tail-l'], -physOut.tail, 140, 140);
    rot(nodes.phys['tail-r'], -physOut.tail, 260, 140);
    rot(nodes.phys['ear-l'], -physOut.ear, 135, 110);
    rot(nodes.phys['ear-r'], -physOut.ear, 265, 110);
    rot(nodes.phys.ahoge, -physOut.ahoge, 200, 80);
    rot(nodes.phys.ribbon, -physOut.ribbon, 0, 6);
    nodes.phys.back.forEach((n) => n.setAttribute('transform', `translate(${r1(-physOut.back * 0.6)} 0)`));
    // 前髪は奥行きずらし（d=0.6）に、少しの遅れを足す
    nodes.phys.front.forEach((n) => n.setAttribute('transform', `translate(${r1(ax * 0.6 * DX - physOut.front * 0.4)} ${r1(-ay * 0.6 * DY)})`));
  }

  // ---------- 外から使う操作 ----------
  function setExp(name) {
    state.exp = name;
    exp = EXPRESSIONS[name] || EXPRESSIONS.normal;
  }
  function speak(on) { state.speaking = on; }
  function setWorking(on) {
    state.working = on;
    if (!root) return;
    M.$('#chara').classList.toggle('working', on);
    root.querySelector('.c-work').style.display = on ? '' : 'none';
    root.querySelector('.c-mug').style.display = on ? 'none' : '';
  }
  function hop() {
    hopV = -6;
    for (let i = 0; i < 3; i++) setTimeout(() => M.room && M.room.floatNote && M.room.floatNote(), i * 300);
  }
  function setOutfit(id) {
    const o = OUTFITS[id] || OUTFITS.knit;
    if (!root) return;
    M.$$('.c-main', root).forEach((p) => p.setAttribute('fill', o.main));
    M.$$('.c-sub-fill', root).forEach((p) => p.setAttribute('fill', o.sub));
    M.$$('.c-sub-stroke', root).forEach((p) => p.setAttribute('stroke', o.sub === '#ffffff' ? '#eef0fa' : o.sub));
    M.$$('.c-accent-fill', root).forEach((p) => p.setAttribute('fill', o.accent));
    M.$$('.c-accent-stroke', root).forEach((p) => p.setAttribute('stroke', o.accent));
    root.querySelector('.body-off').style.display = o.body === 'off' ? '' : 'none';
    root.querySelector('.body-normal').style.display = o.body === 'off' ? 'none' : '';
    M.$$('.acc', root).forEach((g) => {
      const name = [...g.classList].find((c) => c.startsWith('acc-')).slice(4);
      g.style.display = o.acc.includes(name) ? '' : 'none';
    });
  }
  function setTrack(params) { input.track = params; input.trackAt = performance.now(); }

  return {
    mount, setExp, speak, setWorking, hop, setOutfit, setTrack,
    OUTFITS, EXPRESSIONS, P, input,
    get state() { return state; },
  };
})();
