// りん：銀白の髪に水色・ラベンダーのグラデーション、青紫の瞳、白い花と水色リボンのヘアピン
// SVGで描いた2Dモデル。まばたき、呼吸、髪ゆれ、表情（ウインク含む）、口パク、作業中ポーズ、服ごとの小物に対応。
M.chara = (() => {
  // body: normal（ふつうの首まわり）/ off（オフショルダー）
  // acc: 表示する小物（catears, bunny, headphones, twintails, bigbow, hood）
  const OUTFITS = {
    knit:   { label: 'もこもこニット',       lv: 1,  main: '#fbfbff', sub: '#eef0fa', accent: '#8fb4f0', body: 'off',    acc: [] },
    parka:  { label: 'ねこみみパーカー',     lv: 3,  main: '#eaf3ff', sub: '#ffffff', accent: '#5b7fd6', body: 'normal', acc: ['hood', 'catears', 'bigbow'] },
    casual: { label: 'ヘッドホンとツインテ', lv: 5,  main: '#3a3f5c', sub: '#f4f6ff', accent: '#8fb4f0', body: 'normal', acc: ['twintails', 'headphones'] },
    bunny:  { label: 'うさみみルームウェア', lv: 7,  main: '#f3f1fb', sub: '#e4e0f5', accent: '#a99be0', body: 'normal', acc: ['hood', 'bunny'] },
    idol:   { label: 'ステージ衣装',         lv: 9,  main: '#ffffff', sub: '#2e3a78', accent: '#4f7fe6', body: 'normal', acc: ['bigbow'] },
    coat:   { label: 'ふわふわコート',       lv: 12, main: '#f6f8ff', sub: '#dfe7fb', accent: '#7f9ee0', body: 'normal', acc: ['bigbow'] },
  };

  const SKIN = '#fff0ea';

  const eye = (x, y, flip) => `
    <g class="c-eye c-eye-${flip ? 'r' : 'l'}" transform="translate(${x} ${y}) scale(1.12)">
      <g class="c-eye-open">
        <ellipse rx="15" ry="18.5" fill="#fff"/>
        <g class="c-iris">
          <ellipse rx="13" ry="17" fill="url(#irisG)"/>
          <ellipse rx="13" ry="17" fill="none" stroke="#3d3f8f" stroke-width="1.2" opacity=".6"/>
          <ellipse cy="2" rx="6" ry="8" fill="#2f3277"/>
          <ellipse cy="9" rx="9" ry="5" fill="#b9cbff" opacity=".55"/>
          <circle cx="-5" cy="-7" r="4.6" fill="#fff"/>
          <circle cx="5" cy="-9" r="1.8" fill="#fff"/>
          <circle cx="4" cy="7" r="2.2" fill="#fff" opacity=".9"/>
        </g>
        <path d="${flip ? 'M-17 -11 C-9 -22 9 -23 17 -14 L18 -9' : 'M17 -11 C9 -22 -9 -23 -17 -14 L-18 -9'}" stroke="#4a4f7a" stroke-width="3.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M-8 18 C-3 20 3 20 8 18" stroke="#c9b8c8" stroke-width="1.2" fill="none"/>
      </g>
      <path class="c-eye-closed" style="display:none" d="M-14 2 C-8 -9 8 -9 14 2" stroke="#4a4f7a" stroke-width="3.4" fill="none" stroke-linecap="round"/>
      <path class="c-eye-sleepy" style="display:none" d="M-14 2 C-8 8 8 8 14 2" stroke="#4a4f7a" stroke-width="3.4" fill="none" stroke-linecap="round"/>
    </g>`;

  const svg = `
<svg viewBox="0 0 400 500" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="hairG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset=".45" stop-color="#eef0fa"/>
      <stop offset=".8" stop-color="#d6dcf3"/>
      <stop offset="1" stop-color="#b9c6ee"/>
    </linearGradient>
    <linearGradient id="hairBack" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#dfe3f5"/>
      <stop offset=".6" stop-color="#c9d2f0"/>
      <stop offset="1" stop-color="#a9bdf0"/>
    </linearGradient>
    <radialGradient id="irisG" cx=".5" cy=".3" r=".8">
      <stop offset="0" stop-color="#dfe8ff"/>
      <stop offset=".35" stop-color="#8ea6f2"/>
      <stop offset=".75" stop-color="#5a62cf"/>
      <stop offset="1" stop-color="#3a3c94"/>
    </radialGradient>
    <linearGradient id="skinG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff6f2"/>
      <stop offset="1" stop-color="${SKIN}"/>
    </linearGradient>
    <pattern id="knit" width="10" height="12" patternUnits="userSpaceOnUse">
      <path d="M5 0 L5 12" stroke="#000" stroke-width="1" opacity=".035"/>
    </pattern>
  </defs>

  <g class="c-body">
   <g transform="translate(0 14)">
    <!-- ツインテール（服によって表示） -->
    <g class="acc acc-twintails">
      <path class="c-tail-l" fill="url(#hairBack)" d="M134 130 C80 150 62 240 76 330 C84 380 70 410 60 430 C96 420 112 380 110 330 C106 260 118 190 150 150 Z"/>
      <path class="c-tail-r" fill="url(#hairBack)" d="M266 130 C320 150 338 240 324 330 C316 380 330 410 340 430 C304 420 288 380 290 330 C294 260 282 190 250 150 Z"/>
    </g>

    <!-- フード（うしろ） -->
    <g class="acc acc-hood">
      <path class="c-sub-fill" d="M108 230 C92 120 150 66 200 66 C250 66 308 120 292 230 C300 270 280 300 250 306 L150 306 C120 300 100 270 108 230 Z"/>
      <path class="c-accent-stroke" fill="none" stroke-width="2" opacity=".4" d="M120 220 C112 130 160 84 200 84 C240 84 288 130 280 220"/>
    </g>

    <!-- うしろ髪（長め） -->
    <path class="c-hair-back" fill="url(#hairBack)" stroke="#c3cbea" stroke-width="1.5"
      d="M124 140 C98 220 94 330 102 462 C126 478 154 474 172 456 L228 456 C246 474 274 478 298 462 C306 330 302 220 276 140 Z"/>

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
      <!-- 胸元の水色リボン -->
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

    <!-- 大きなリボン -->
    <g class="acc acc-bigbow" transform="translate(200 334)">
      <path class="c-accent-fill" d="M0 0 C-10 -16 -34 -18 -34 -2 C-34 12 -12 10 0 0 Z M0 0 C10 -16 34 -18 34 -2 C34 12 12 10 0 0 Z"/>
      <path class="c-accent-fill" d="M-3 2 L-14 34 L-6 30 L0 4 Z M3 2 L14 34 L6 30 L0 4 Z" opacity=".85"/>
      <circle r="5" fill="#fff"/><circle r="3" class="c-accent-fill"/>
    </g>

    <!-- 頭 -->
   <g transform="translate(0 14)">
    <g class="c-head">
      <path fill="url(#skinG)" d="M142 164 C142 106 258 106 258 164 C258 214 234 252 200 256 C166 252 142 214 142 164 Z"/>

      <!-- ほお -->
      <g class="c-blush-g">
        <ellipse class="c-blush" cx="160" cy="216" rx="15" ry="7" fill="#ffadbd" opacity=".55"/>
        <ellipse class="c-blush" cx="240" cy="216" rx="15" ry="7" fill="#ffadbd" opacity=".55"/>
        <path d="M152 214 l4 -5 M159 215 l4 -5 M166 216 l4 -5 M234 214 l4 -5 M241 215 l4 -5 M248 216 l4 -5" stroke="#f497a8" stroke-width="1.2" opacity=".6"/>
      </g>

      ${eye(171, 192, false)}
      ${eye(229, 192, true)}

      <!-- まゆ -->
      <path class="c-brow c-brow-l" d="M158 165 C164 161 174 161 182 164" stroke="#b9bfdc" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <path class="c-brow c-brow-r" d="M218 164 C226 161 236 161 242 165" stroke="#b9bfdc" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <path d="M200 214 l-1.5 4" stroke="#f0c4b8" stroke-width="1.4" stroke-linecap="round"/>

      <!-- 口 -->
      <g class="c-mouth">
        <path data-m="normal" d="M194 232 C197 235 203 235 206 232" stroke="#c4707e" stroke-width="2.2" fill="none" stroke-linecap="round"/>
        <g data-m="smile"><path d="M190 228 C192 238 208 238 210 228 Z" fill="#e0727f"/><path d="M194 234 C198 238 202 238 206 234" fill="#ffa7b2"/></g>
        <g data-m="happy"><path d="M186 226 C188 244 212 244 214 226 Z" fill="#d9606f"/><path d="M191 236 C196 243 204 243 209 236 C205 233 195 233 191 236 Z" fill="#ff9fab"/><path d="M188 227 L212 227" stroke="#fff" stroke-width="2"/></g>
        <path data-m="worry" d="M193 234 C197 230 203 230 207 234" stroke="#c4707e" stroke-width="2.2" fill="none" stroke-linecap="round"/>
        <ellipse data-m="o" cx="200" cy="233" rx="5" ry="6" fill="#d9606f"/>
        <ellipse data-m="a" cx="200" cy="232" rx="8" ry="5.5" fill="#d9606f"/>
      </g>

      <!-- ヘッドホン（頭につける） -->
      <g class="acc acc-headphones">
        <path d="M134 176 C128 74 272 74 266 176" stroke="#2c2f45" stroke-width="9" fill="none" stroke-linecap="round"/>
      </g>

      <!-- 前髪 -->
      <path class="c-hair-front" fill="url(#hairG)" stroke="#cdd4ee" stroke-width="1.2" stroke-linejoin="round"
        d="M134 182 C122 104 166 76 200 78 C238 76 280 102 266 184 L258 150 L250 178 L240 128 L228 170 L214 118 L204 166 L192 120 L182 168 L170 126 L160 176 L152 140 L144 186 Z"/>
      <path d="M170 126 L166 160 M192 120 L190 150 M214 118 L218 150 M240 128 L244 158" stroke="#c6cfee" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".9"/>
      <!-- 横の長い髪（ゆれる） -->
      <path class="c-lock c-lock-l" fill="url(#hairG)" d="M140 150 C122 210 118 320 134 410 C150 380 156 300 156 200 Z"/>
      <path class="c-lock c-lock-r" fill="url(#hairG)" d="M260 150 C278 210 282 320 266 410 C250 380 244 300 244 200 Z"/>
      <path d="M140 220 C134 280 136 340 140 380 M260 220 C266 280 264 340 260 380" stroke="#c6cfee" stroke-width="1.4" fill="none" opacity=".8"/>
      <!-- 天使の輪 -->
      <path d="M156 106 C178 94 222 94 244 106" stroke="#ffffff" stroke-width="4" fill="none" opacity=".9" stroke-linecap="round"/>
      <path class="c-ahoge" d="M198 80 C192 58 210 50 218 60 C208 58 202 66 202 80 Z" fill="#eef0fa"/>

      <!-- ヘッドホンのイヤーカップ -->
      <g class="acc acc-headphones">
        <rect x="120" y="160" width="24" height="40" rx="10" fill="#2c2f45"/>
        <rect x="256" y="160" width="24" height="40" rx="10" fill="#2c2f45"/>
        <rect x="124" y="168" width="8" height="24" rx="4" fill="#8fb4f0"/>
        <rect x="268" y="168" width="8" height="24" rx="4" fill="#8fb4f0"/>
      </g>

      <!-- ねこみみ -->
      <g class="acc acc-catears">
        <path class="c-sub-fill c-accent-stroke" stroke-width="1.5" d="M136 118 L130 60 L178 92 Z"/>
        <path class="c-sub-fill c-accent-stroke" stroke-width="1.5" d="M264 118 L270 60 L222 92 Z"/>
        <path d="M140 108 L137 74 L166 94 Z M260 108 L263 74 L234 94 Z" fill="#ffd3dc"/>
      </g>
      <!-- うさみみ -->
      <g class="acc acc-bunny">
        <path class="c-sub-fill c-accent-stroke c-ear-l" stroke-width="1.5" d="M150 96 C110 70 82 110 96 170 C106 186 120 160 130 130 Z"/>
        <path class="c-sub-fill c-accent-stroke c-ear-r" stroke-width="1.5" d="M250 96 C290 70 318 110 304 170 C294 186 280 160 270 130 Z"/>
        <path d="M140 104 C116 92 102 116 106 150 Z M260 104 C284 92 298 116 294 150 Z" fill="#ffdbe3"/>
      </g>

      <!-- ヘアクリップ（2本） -->
      <g transform="translate(236 132)">
        <rect x="-3" y="-16" width="6" height="32" rx="3" fill="#ffffff" stroke="#8fb4f0" stroke-width="1.6" transform="rotate(35)"/>
        <rect x="-3" y="-16" width="6" height="32" rx="3" fill="#ffffff" stroke="#8fb4f0" stroke-width="1.6" transform="rotate(-25)"/>
      </g>
      <!-- 白い花と水色リボンのヘアピン -->
      <g class="c-flower" transform="translate(262 146)">
        <path d="M0 6 C-4 20 -8 34 -12 46 M2 6 C6 22 10 34 16 44" stroke="#7fa6ec" stroke-width="4" fill="none" stroke-linecap="round"/>
        <path d="M0 4 L-12 -2 L-10 10 Z M0 4 L12 -2 L10 10 Z" fill="#7fa6ec"/>
        ${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-10" rx="7" ry="11" fill="#ffffff" stroke="#c9d4f5" stroke-width="1.2" transform="rotate(${a})"/>`).join('')}
        <circle r="5" fill="#ffe9a8"/><circle r="2.4" fill="#9db7f2"/>
      </g>
      <!-- 小さな花（左） -->
      <g transform="translate(150 132) scale(.55)">
        ${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-10" rx="7" ry="11" fill="#ffffff" stroke="#c9d4f5" stroke-width="1.6" transform="rotate(${a})"/>`).join('')}
        <circle r="5" fill="#9db7f2"/>
      </g>
    </g>
   </g>
  </g>

  <!-- 机と小物 -->
  <g class="c-desk">
    <rect x="40" y="440" width="320" height="60" rx="10" fill="#f6f1ee"/>
    <rect x="40" y="440" width="320" height="8" rx="4" fill="#e7ddd8"/>
    <g class="c-mug" transform="translate(300 412)">
      <rect x="0" y="0" width="26" height="34" rx="5" fill="#ffffff" stroke="#c9d4f5" stroke-width="2" opacity=".95"/>
      <rect x="2" y="12" width="22" height="20" rx="4" fill="#d9e4ff"/>
      <path d="M16 -14 L12 12" stroke="#8fb4f0" stroke-width="3" stroke-linecap="round"/>
      <path class="c-steam" d="M6 -4 C2 -12 10 -16 6 -24" stroke="#dfe6f7" stroke-width="2" fill="none" stroke-linecap="round"/>
    </g>
    <g class="c-plush" transform="translate(70 404)">
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

  let root, state = { exp: 'smile', working: false, speaking: false };
  let blinkTimer, mouthTimer;

  function mount(container) {
    container.innerHTML = svg;
    root = container.querySelector('svg');
    injectAnim();
    setOutfit(M.store.get().settings.outfit);
    setExp('smile');
    scheduleBlink();
    root.addEventListener('click', () => { M.app && M.app.poke(); });
  }

  function injectAnim() {
    const style = document.createElement('style');
    style.textContent = `
      .chara .c-body { transform-origin: 200px 500px; animation: breathe 5s ease-in-out infinite; }
      .chara .c-head { transform-origin: 200px 256px; animation: tilt 9s ease-in-out infinite; }
      .chara .c-lock-l { transform-origin: 140px 150px; animation: sway 6s ease-in-out infinite; }
      .chara .c-lock-r { transform-origin: 260px 150px; animation: sway 6s ease-in-out infinite reverse; }
      .chara .c-tail-l { transform-origin: 140px 140px; animation: sway 5s ease-in-out infinite; }
      .chara .c-tail-r { transform-origin: 260px 140px; animation: sway 5s ease-in-out infinite reverse; }
      .chara .c-ear-l { transform-origin: 140px 110px; animation: sway 4s ease-in-out infinite; }
      .chara .c-ear-r { transform-origin: 260px 110px; animation: sway 4s ease-in-out infinite reverse; }
      .chara .c-ahoge { transform-origin: 202px 80px; animation: sway 4s ease-in-out infinite; }
      .chara .c-flower { animation: none; }
      .chara .c-steam { animation: steam 3s ease-in-out infinite; }
      .chara.working .c-head { animation: none; transform: rotate(3deg) translateY(4px); }
      .chara.working .c-iris { transform: translateY(5px); }
      .chara.working .c-pen { transform-origin: 238px 440px; animation: write 1.2s ease-in-out infinite; }
      .chara.hop .c-body { animation: hop .5s ease; }
      @keyframes breathe { 50% { transform: translateY(-3px) scaleY(1.004); } }
      @keyframes tilt { 0%,100% { transform: rotate(0); } 50% { transform: rotate(-1.8deg); } }
      @keyframes sway { 50% { transform: rotate(2.2deg); } }
      @keyframes steam { 0% { opacity: 0; transform: translateY(4px); } 50% { opacity: .9; } 100% { opacity: 0; transform: translateY(-6px); } }
      @keyframes write { 50% { transform: translate(-10px, 3px); } }
      @keyframes hop { 40% { transform: translateY(-10px); } }
    `;
    document.head.appendChild(style);
  }

  function scheduleBlink() {
    clearTimeout(blinkTimer);
    blinkTimer = setTimeout(() => { blink(); scheduleBlink(); }, 2500 + Math.random() * 3500);
  }

  function blink() {
    if (!root) return;
    M.$$('.c-eye', root).forEach((e) => {
      const open = e.querySelector('.c-eye-open');
      if (open.style.display === 'none') return;
      open.setAttribute('transform', 'scale(1 0.1)');
      setTimeout(() => open.removeAttribute('transform'), 120);
    });
  }

  function eyeMode(e, mode) {
    e.querySelector('.c-eye-open').style.display = mode === 'open' ? '' : 'none';
    e.querySelector('.c-eye-closed').style.display = mode === 'closed' ? '' : 'none';
    e.querySelector('.c-eye-sleepy').style.display = mode === 'sleepy' ? '' : 'none';
  }

  // 表情：normal / smile / happy / wink / worry / surprise / sleepy / calm
  function setExp(exp) {
    if (!root) return;
    state.exp = exp;
    const both = { happy: 'closed', calm: 'closed', sleepy: 'sleepy' }[exp] || 'open';
    eyeMode(root.querySelector('.c-eye-l'), both);
    eyeMode(root.querySelector('.c-eye-r'), exp === 'wink' ? 'closed' : both);
    const browL = root.querySelector('.c-brow-l');
    const browR = root.querySelector('.c-brow-r');
    if (exp === 'worry') {
      browL.setAttribute('d', 'M158 168 C164 166 174 162 182 158');
      browR.setAttribute('d', 'M218 158 C226 162 236 166 242 168');
    } else if (exp === 'surprise') {
      browL.setAttribute('d', 'M158 160 C164 155 174 155 182 158');
      browR.setAttribute('d', 'M218 158 C226 155 236 155 242 160');
    } else {
      browL.setAttribute('d', 'M158 165 C164 161 174 161 182 164');
      browR.setAttribute('d', 'M218 164 C226 161 236 161 242 165');
    }
    M.$$('.c-blush', root).forEach((b) => b.setAttribute('opacity', ['happy', 'wink'].includes(exp) ? '.75' : '.55'));
    if (!state.speaking) showMouth(baseMouth());
  }

  function baseMouth() {
    return { smile: 'smile', happy: 'happy', wink: 'happy', calm: 'smile', worry: 'worry', surprise: 'o', sleepy: 'normal' }[state.exp] || 'normal';
  }

  function showMouth(m) {
    M.$$('.c-mouth [data-m]', root).forEach((p) => { p.style.display = p.dataset.m === m ? '' : 'none'; });
  }

  // 口パク
  function speak(on) {
    state.speaking = on;
    clearInterval(mouthTimer);
    if (on) {
      const seq = ['a', 'o', 'smile', 'a', 'normal', 'o'];
      let i = 0;
      mouthTimer = setInterval(() => { showMouth(seq[i++ % seq.length]); }, 130);
    } else {
      showMouth(baseMouth());
    }
  }

  function setWorking(on) {
    state.working = on;
    M.$('#chara').classList.toggle('working', on);
    root.querySelector('.c-work').style.display = on ? '' : 'none';
    root.querySelector('.c-mug').style.display = on ? 'none' : '';
  }

  function hop() {
    const wrap = M.$('#chara');
    wrap.classList.remove('hop');
    void wrap.offsetWidth;
    wrap.classList.add('hop');
    for (let i = 0; i < 3; i++) setTimeout(() => M.room && M.room.floatNote(), i * 300);
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

  return { mount, setExp, speak, setWorking, hop, setOutfit, OUTFITS, get state() { return state; } };
})();
