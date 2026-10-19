// 澪音（みおん）：水色・音符・水の流れがモチーフの中性的なキャラクター
// SVGで描いた2Dモデル。まばたき、呼吸、髪ゆれ、表情、口パク、作業中ポーズに対応。
M.chara = (() => {
  const OUTFITS = {
    hoodie:  { label: 'みずいろパーカー', main: '#f4fbff', sub: '#8fd8ea', accent: '#3f9fbf', lv: 1 },
    sailor:  { label: 'なみまセーラー',   main: '#ffffff', sub: '#4d8fc4', accent: '#7fd3e6', lv: 3 },
    knit:    { label: 'ゆったりニット',   main: '#e9f1f7', sub: '#b9d3e3', accent: '#6fa8c8', lv: 5 },
    yukata:  { label: 'みなも浴衣',       main: '#e6f6fb', sub: '#5fb7d3', accent: '#2f7ea3', lv: 7 },
    pajama:  { label: 'くもパジャマ',     main: '#f1eefc', sub: '#cfc8f2', accent: '#8f86c9', lv: 9 },
    coat:    { label: 'しずくコート',     main: '#dff1f6', sub: '#7cbcd2', accent: '#2c6f8c', lv: 12 },
  };

  const svg = `
<svg viewBox="0 0 400 500" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="hairG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#bff0fa"/>
      <stop offset=".55" stop-color="#86d6ea"/>
      <stop offset="1" stop-color="#5fb8d6"/>
    </linearGradient>
    <linearGradient id="hairShade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#6cc3dd"/>
      <stop offset="1" stop-color="#4a9fc0"/>
    </linearGradient>
    <radialGradient id="irisG" cx=".5" cy=".35" r=".7">
      <stop offset="0" stop-color="#c9f6ff"/>
      <stop offset=".45" stop-color="#5cc7e3"/>
      <stop offset="1" stop-color="#2a7fa6"/>
    </radialGradient>
    <linearGradient id="skinG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff3ec"/>
      <stop offset="1" stop-color="#fde4d8"/>
    </linearGradient>
  </defs>

  <g class="c-body">
    <!-- うしろ髪 -->
    <path class="c-hair-back" fill="url(#hairShade)"
      d="M128 150 C118 200 116 250 124 296 C140 306 160 300 172 290 L228 290 C240 300 260 306 276 296 C284 250 282 200 272 150 Z"/>

    <!-- 首 -->
    <path fill="#f9dccf" d="M182 246 L218 246 L220 300 L180 300 Z"/>

    <!-- 服 -->
    <g class="c-clothes">
      <path class="c-main" d="M96 500 C96 380 128 318 182 300 L200 318 L218 300 C272 318 304 380 304 500 Z"/>
      <path class="c-sub" d="M150 312 C170 330 188 336 200 318 C212 336 230 330 250 312 C262 318 270 326 276 336 C250 352 226 350 200 340 C174 350 150 352 124 336 C130 326 138 318 150 312 Z"/>
      <path class="c-accent" d="M200 340 L200 500" stroke-width="3" fill="none"/>
      <!-- すそ：水の流れ模様 -->
      <path class="c-wave" fill="none" stroke-width="3" stroke-linecap="round"
        d="M110 460 C130 448 150 472 170 460 S210 448 230 460 S270 472 292 458"/>
      <path class="c-wave" fill="none" stroke-width="2" stroke-linecap="round" opacity=".6"
        d="M106 478 C126 466 146 490 166 478 S206 466 226 478 S266 490 296 476"/>
      <!-- 胸の音符ブローチ -->
      <g class="c-brooch" transform="translate(200 352)">
        <circle r="11" fill="#fff" class="c-accent-stroke" stroke-width="2"/>
        <path d="M-2 5 L-2 -6 L5 -8 L5 3" stroke="#3f9fbf" stroke-width="1.8" fill="none"/>
        <circle cx="-4" cy="5" r="2.6" fill="#3f9fbf"/><circle cx="3" cy="3" r="2.6" fill="#3f9fbf"/>
      </g>
    </g>

    <!-- 首にかけたヘッドホン -->
    <g class="c-phones">
      <path d="M150 300 C150 330 250 330 250 300" stroke="#e8f4f8" stroke-width="7" fill="none"/>
      <rect x="138" y="290" width="20" height="26" rx="8" fill="#fff" stroke="#8fd8ea" stroke-width="3"/>
      <rect x="242" y="290" width="20" height="26" rx="8" fill="#fff" stroke="#8fd8ea" stroke-width="3"/>
    </g>

    <!-- 頭 -->
    <g class="c-head">
      <path fill="url(#skinG)" d="M140 162 C140 104 260 104 260 162 C260 214 236 258 200 262 C164 258 140 214 140 162 Z"/>

      <!-- ほお -->
      <ellipse class="c-blush" cx="160" cy="214" rx="13" ry="6" fill="#ffb7c2" opacity=".45"/>
      <ellipse class="c-blush" cx="240" cy="214" rx="13" ry="6" fill="#ffb7c2" opacity=".45"/>

      <!-- 目（ひらき） -->
      <g class="c-eyes-open">
        <g class="c-eye" transform="translate(172 192)">
          <ellipse rx="13" ry="16" fill="#fff"/>
          <g class="c-iris"><ellipse rx="11" ry="14.5" fill="url(#irisG)"/>
            <ellipse rx="5" ry="6.5" fill="#1f5f80"/>
            <circle cx="-4" cy="-6" r="3.6" fill="#fff"/><circle cx="4" cy="5" r="1.6" fill="#fff" opacity=".85"/>
          </g>
          <path d="M-15 -12 C-8 -20 8 -20 15 -11" stroke="#2f5d72" stroke-width="3.2" fill="none" stroke-linecap="round"/>
        </g>
        <g class="c-eye" transform="translate(228 192)">
          <ellipse rx="13" ry="16" fill="#fff"/>
          <g class="c-iris"><ellipse rx="11" ry="14.5" fill="url(#irisG)"/>
            <ellipse rx="5" ry="6.5" fill="#1f5f80"/>
            <circle cx="-4" cy="-6" r="3.6" fill="#fff"/><circle cx="4" cy="5" r="1.6" fill="#fff" opacity=".85"/>
          </g>
          <path d="M-15 -11 C-8 -20 8 -20 15 -12" stroke="#2f5d72" stroke-width="3.2" fill="none" stroke-linecap="round"/>
        </g>
      </g>
      <!-- 目（にっこり・とじ） -->
      <g class="c-eyes-closed" style="display:none">
        <path d="M159 194 C165 184 179 184 185 194" stroke="#2f5d72" stroke-width="3.2" fill="none" stroke-linecap="round"/>
        <path d="M215 194 C221 184 235 184 241 194" stroke="#2f5d72" stroke-width="3.2" fill="none" stroke-linecap="round"/>
      </g>
      <g class="c-eyes-sleepy" style="display:none">
        <path d="M159 194 C165 199 179 199 185 194" stroke="#2f5d72" stroke-width="3.2" fill="none" stroke-linecap="round"/>
        <path d="M215 194 C221 199 235 199 241 194" stroke="#2f5d72" stroke-width="3.2" fill="none" stroke-linecap="round"/>
      </g>

      <!-- まゆ -->
      <path class="c-brow c-brow-l" d="M160 168 C166 164 176 164 182 166" stroke="#5aa9c6" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <path class="c-brow c-brow-r" d="M218 166 C224 164 234 164 240 168" stroke="#5aa9c6" stroke-width="2.4" fill="none" stroke-linecap="round"/>

      <!-- 口 -->
      <g class="c-mouth">
        <path data-m="normal" d="M193 232 C197 235 203 235 207 232" stroke="#c97a7a" stroke-width="2.2" fill="none" stroke-linecap="round"/>
        <path data-m="smile" d="M190 229 C195 237 205 237 210 229" stroke="#c97a7a" stroke-width="2.2" fill="none" stroke-linecap="round"/>
        <path data-m="happy" d="M189 228 C192 240 208 240 211 228 Z" fill="#e88f95"/>
        <path data-m="worry" d="M193 234 C197 231 203 231 207 234" stroke="#c97a7a" stroke-width="2.2" fill="none" stroke-linecap="round"/>
        <ellipse data-m="o" cx="200" cy="233" rx="4.5" ry="5.5" fill="#e88f95"/>
        <ellipse data-m="a" cx="200" cy="232" rx="6.5" ry="4" fill="#e88f95"/>
      </g>

      <!-- 前髪 -->
      <path class="c-hair-front" fill="url(#hairG)"
        d="M134 178 C126 106 168 78 200 80 C236 78 276 104 266 180 L256 150 L247 174 L236 130 L222 166 L208 122 L192 164 L178 126 L166 170 L152 138 L144 182 Z"/>
      <!-- サイドの髪（ゆれる） -->
      <path class="c-lock c-lock-l" fill="url(#hairG)" d="M138 150 C126 186 128 236 142 268 C148 250 150 226 152 196 Z"/>
      <path class="c-lock c-lock-r" fill="url(#hairG)" d="M262 150 C274 186 272 236 258 268 C252 250 250 226 248 196 Z"/>
      <!-- 髪のハイライト（水面の反射） -->
      <path d="M160 104 C178 94 200 92 218 96" stroke="#ffffff" stroke-width="3" fill="none" opacity=".7" stroke-linecap="round"/>
      <!-- アホ毛 -->
      <path class="c-ahoge" d="M200 82 C196 60 214 52 222 62 C212 60 206 68 204 82 Z" fill="#86d6ea"/>

      <!-- 音符のヘアピン -->
      <g class="c-pin" transform="translate(246 120) rotate(14)">
        <path d="M0 10 L0 -10 L12 -14 L12 6" stroke="#3f9fbf" stroke-width="3" fill="none" stroke-linejoin="round"/>
        <ellipse cx="-3.5" cy="10" rx="5" ry="4" fill="#3f9fbf" transform="rotate(-20 -3.5 10)"/>
        <ellipse cx="8.5" cy="6" rx="5" ry="4" fill="#3f9fbf" transform="rotate(-20 8.5 6)"/>
      </g>
      <!-- しずくのピン -->
      <path transform="translate(152 128)" d="M0 -9 C5 -2 7 2 7 5 A7 7 0 0 1 -7 5 C-7 2 -5 -2 0 -9 Z" fill="#c9f2fb" stroke="#5fb8d6" stroke-width="1.5"/>
    </g>
  </g>

  <!-- 机と小物 -->
  <g class="c-desk">
    <rect x="40" y="440" width="320" height="60" rx="10" fill="#f6efe6"/>
    <rect x="40" y="440" width="320" height="8" rx="4" fill="#e9dccb"/>
    <g class="c-mug" transform="translate(300 420)">
      <rect x="0" y="0" width="28" height="28" rx="6" fill="#fff" stroke="#8fd8ea" stroke-width="2"/>
      <path d="M28 8 C38 8 38 22 28 22" stroke="#8fd8ea" stroke-width="2" fill="none"/>
      <path class="c-steam" d="M8 -4 C4 -12 12 -16 8 -24 M18 -4 C14 -12 22 -16 18 -24" stroke="#cfe9f1" stroke-width="2" fill="none" stroke-linecap="round"/>
    </g>
    <g class="c-work" style="display:none">
      <path d="M120 446 L190 432 L260 446 L190 460 Z" fill="#ffffff" stroke="#cfe3ea" stroke-width="2"/>
      <path d="M190 432 L190 460" stroke="#cfe3ea" stroke-width="2"/>
      <path d="M140 444 L176 437 M140 450 L172 444 M206 438 L240 444 M206 444 L236 450" stroke="#cde4ec" stroke-width="2"/>
      <g class="c-pen"><ellipse cx="238" cy="440" rx="12" ry="9" fill="#fde4d8"/>
        <path d="M232 444 L262 410" stroke="#3f9fbf" stroke-width="4" stroke-linecap="round"/></g>
      <ellipse cx="150" cy="446" rx="12" ry="9" fill="#fde4d8"/>
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
      .chara .c-head { transform-origin: 200px 260px; animation: tilt 9s ease-in-out infinite; }
      .chara .c-lock-l { transform-origin: 140px 150px; animation: sway 6s ease-in-out infinite; }
      .chara .c-lock-r { transform-origin: 260px 150px; animation: sway 6s ease-in-out infinite reverse; }
      .chara .c-ahoge { transform-origin: 204px 82px; animation: sway 4s ease-in-out infinite; }
      .chara .c-steam { animation: steam 3s ease-in-out infinite; }
      .chara .c-eye { transition: transform .08s; }
      .chara.blink .c-eyes-open .c-eye { transform-box: fill-box; }
      .chara.working .c-head { animation: none; transform: rotate(3deg) translateY(4px); }
      .chara.working .c-iris { transform: translateY(5px); }
      .chara.working .c-pen { transform-origin: 238px 440px; animation: write 1.2s ease-in-out infinite; }
      .chara.hop .c-body { animation: hop .5s ease; }
      @keyframes breathe { 50% { transform: translateY(-3px) scaleY(1.004); } }
      @keyframes tilt { 0%,100% { transform: rotate(0); } 50% { transform: rotate(-1.6deg); } }
      @keyframes sway { 50% { transform: rotate(2.2deg); } }
      @keyframes steam { 0% { opacity: 0; transform: translateY(4px); } 50% { opacity: .9; } 100% { opacity: 0; transform: translateY(-6px); } }
      @keyframes write { 50% { transform: translate(-10px, 3px); } }
      @keyframes hop { 40% { transform: translateY(-10px); } }
    `;
    document.head.appendChild(style);
  }

  function scheduleBlink() {
    clearTimeout(blinkTimer);
    blinkTimer = setTimeout(() => {
      blink();
      scheduleBlink();
    }, 2500 + Math.random() * 3500);
  }

  function blink() {
    if (!root) return;
    const open = root.querySelector('.c-eyes-open');
    if (open.style.display === 'none') return;
    M.$$('.c-eye', root).forEach((e) => {
      const t = e.getAttribute('transform').replace(/ scale\([^)]*\)/, '');
      e.setAttribute('transform', t + ' scale(1 0.1)');
      setTimeout(() => e.setAttribute('transform', t), 120);
    });
  }

  // 表情：normal / smile / happy / worry / surprise / sleepy / calm
  function setExp(exp) {
    if (!root) return;
    state.exp = exp;
    const eyesMode = { happy: 'closed', calm: 'closed', sleepy: 'sleepy' }[exp] || 'open';
    root.querySelector('.c-eyes-open').style.display = eyesMode === 'open' ? '' : 'none';
    root.querySelector('.c-eyes-closed').style.display = eyesMode === 'closed' ? '' : 'none';
    root.querySelector('.c-eyes-sleepy').style.display = eyesMode === 'sleepy' ? '' : 'none';
    const browL = root.querySelector('.c-brow-l');
    const browR = root.querySelector('.c-brow-r');
    if (exp === 'worry') {
      browL.setAttribute('d', 'M160 164 C166 166 176 168 182 172');
      browR.setAttribute('d', 'M218 172 C224 168 234 166 240 164');
    } else if (exp === 'surprise') {
      browL.setAttribute('d', 'M160 162 C166 157 176 157 182 160');
      browR.setAttribute('d', 'M218 160 C224 157 234 157 240 162');
    } else {
      browL.setAttribute('d', 'M160 168 C166 164 176 164 182 166');
      browR.setAttribute('d', 'M218 166 C224 164 234 164 240 168');
    }
    root.querySelector('.c-blush').parentNode.querySelectorAll('.c-blush')
      .forEach((b) => b.setAttribute('opacity', exp === 'happy' ? '.7' : '.45'));
    if (!state.speaking) showMouth(baseMouth());
  }

  function baseMouth() {
    return { smile: 'smile', happy: 'happy', calm: 'smile', worry: 'worry', surprise: 'o', sleepy: 'normal' }[state.exp] || 'normal';
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
    const wrap = M.$('#chara');
    wrap.classList.toggle('working', on);
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
    const o = OUTFITS[id] || OUTFITS.hoodie;
    if (!root) return;
    M.$$('.c-main', root).forEach((p) => p.setAttribute('fill', o.main));
    M.$$('.c-sub', root).forEach((p) => p.setAttribute('fill', o.sub));
    M.$$('.c-accent', root).forEach((p) => p.setAttribute('stroke', o.accent));
    M.$$('.c-accent-stroke', root).forEach((p) => p.setAttribute('stroke', o.accent));
    M.$$('.c-wave', root).forEach((p) => p.setAttribute('stroke', o.sub));
  }

  return { mount, setExp, speak, setWorking, hop, setOutfit, OUTFITS, get state() { return state; } };
})();
