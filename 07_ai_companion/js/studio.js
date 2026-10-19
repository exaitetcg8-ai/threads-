// VTuberスタジオ：Webカメラの顔トラッキング（MediaPipe Face Landmarker）とマイクで、りんのモデルを動かす
M.studio = (() => {
  const MP_VER = '0.10.14';
  const MP_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VER}`;
  const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
  const KEY = 'rin_studio_v1';

  const EXP_LIST = [
    ['smile', 'にこっ'], ['happy', 'にっこり'], ['wink', 'ウインク'], ['normal', 'ふつう'], ['calm', 'おだやか'],
    ['shy', 'てれ'], ['surprise', 'びっくり'], ['worry', 'しょんぼり'], ['sleepy', 'ねむい'],
  ];

  const S = Object.assign({
    bg: 'green', scale: 100, posX: 0, posY: 0, desk: false, idle: true, mouse: true, mirror: true,
    sensHead: 100, sensFace: 100, smooth: 45, micGain: 120, showCam: false, exp: 'smile', outfit: 'knit',
  }, load());

  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  // URLで初期状態を指定できる（OBS用）
  const q = new URLSearchParams(location.search);
  if (q.get('bg')) S.bg = q.get('bg');
  if (q.get('outfit')) S.outfit = q.get('outfit');

  // ---------- 見た目 ----------
  function applyView() {
    document.body.className = 'bg-' + S.bg;
    const m = M.$('#model');
    m.style.transform = `translateX(calc(-50% + ${S.posX}vw)) translateY(${S.posY}vh) scale(${S.scale / 100})`;
    M.$('#chara').classList.toggle('no-desk', !S.desk);
    M.chara.input.idle = S.idle;
    M.chara.input.mouseFollow = S.mouse;
    M.chara.input.mirror = S.mirror;
    M.$('#cam').style.display = S.showCam && stream ? 'block' : 'none';
  }

  function setExp(name) {
    S.exp = name; save();
    M.chara.setExp(name);
    M.$$('#expGrid .chip').forEach((c) => c.classList.toggle('on', c.dataset.exp === name));
  }

  // ---------- 顔トラッキング ----------
  let landmarker = null, stream = null, video = null, running = false, lastVideoTime = -1;
  const calib = { yaw: 0, pitch: 0.0, n: 0, auto: true };
  const sm = {}; // なめらかにした値
  const last = {}; // 最後に読んだ顔の向き（正面リセット用）
  let lost = false;

  function status(id, text, cls) {
    const e = M.$(id);
    e.textContent = text;
    e.className = 'status' + (cls ? ' ' + cls : '');
  }

  async function startCam() {
    if (running) return stopCam();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return status('#camStatus', 'このブラウザではカメラが使えません。ChromeかEdgeで開いてください。', 'err');
    }
    status('#camStatus', '顔トラッキングを準備しています…（はじめは少し時間がかかります）');
    try {
      if (!landmarker) {
        const vision = await import(`${MP_URL}/vision_bundle.mjs`);
        const files = await vision.FilesetResolver.forVisionTasks(`${MP_URL}/wasm`);
        const opts = (delegate) => ({
          baseOptions: { modelAssetPath: MODEL_URL, delegate },
          runningMode: 'VIDEO', numFaces: 1, outputFaceBlendshapes: true,
        });
        try { landmarker = await vision.FaceLandmarker.createFromOptions(files, opts('GPU')); }
        catch (e) { landmarker = await vision.FaceLandmarker.createFromOptions(files, opts('CPU')); }
      }
      stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' }, audio: false });
      video = M.$('#cam');
      video.srcObject = stream;
      await video.play();
      running = true;
      calib.n = 0; calib.auto = true;
      M.$('#camBtn').textContent = 'カメラを止める';
      status('#camStatus', 'トラッキング中。正面を向いて「正面にリセット」を押すと、より自然になります。', 'ok');
      applyView();
      requestAnimationFrame(trackLoop);
    } catch (e) {
      console.error(e);
      const msg = e && e.name === 'NotAllowedError' ? 'カメラの使用が許可されませんでした。アドレスバーの設定から許可してください。'
        : 'カメラか顔トラッキングを開始できませんでした。ネット接続と、https または localhost で開いているかを確認してください。';
      status('#camStatus', msg, 'err');
    }
  }

  function stopCam() {
    running = false;
    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = null;
    M.chara.input.track = null;
    M.$('#camBtn').textContent = 'カメラで動かす';
    status('#camStatus', 'カメラはオフ（マウスの方向を見ます）');
    applyView();
  }

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function trackLoop() {
    if (!running) return;
    requestAnimationFrame(trackLoop);
    if (!video || video.readyState < 2 || video.currentTime === lastVideoTime) return;
    lastVideoTime = video.currentTime;
    let res;
    try { res = landmarker.detectForVideo(video, performance.now()); } catch (e) { return; }
    if (!res.faceLandmarks || !res.faceLandmarks.length) {
      if (!lost) status('#camStatus', '顔が見つかりません。カメラの正面に来てね。');
      lost = true;
      return;
    }
    if (lost) { lost = false; status('#camStatus', 'トラッキング中', 'ok'); }
    const L = res.faceLandmarks[0];
    const vw = video.videoWidth || 640, vh = video.videoHeight || 480;
    const mir = S.mirror;
    const pt = (i) => ({ x: (mir ? 1 - L[i].x : L[i].x) * vw, y: L[i].y * vh });

    // 頭の向き：目尻2点と鼻先の位置関係から求める
    let a = pt(33), b = pt(263);
    if (a.x > b.x) [a, b] = [b, a];
    const nose = pt(1);
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const eyeDist = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const yawRaw = (nose.x - mid.x) / eyeDist;
    const pitchRaw = (nose.y - mid.y) / eyeDist;
    const roll = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
    // はじめの数フレームで正面を自動で覚える
    if (calib.auto && calib.n < 20) {
      calib.yaw = (calib.yaw * calib.n + yawRaw) / (calib.n + 1);
      calib.pitch = (calib.pitch * calib.n + pitchRaw) / (calib.n + 1);
      calib.n++;
    }
    last.yawRaw = yawRaw; last.pitchRaw = pitchRaw;

    const hs = S.sensHead / 100, fs = S.sensFace / 100;
    const bs = {};
    (res.faceBlendshapes && res.faceBlendshapes[0] ? res.faceBlendshapes[0].categories : []).forEach((c) => { bs[c.categoryName] = c.score; });
    const g = (k) => bs[k] || 0;

    // 鏡のとき、ユーザーの右目は画面の左（りんの eye-l）
    const blinkScreenL = mir ? g('eyeBlinkRight') : g('eyeBlinkLeft');
    const blinkScreenR = mir ? g('eyeBlinkLeft') : g('eyeBlinkRight');
    const wideAvg = (g('eyeWideLeft') + g('eyeWideRight')) / 2;
    const eyeOpen = (blink) => clamp(1 - (blink - 0.12) / 0.45 * fs, 0, 1) + wideAvg * 0.25;
    const lookUserLeft = (g('eyeLookOutLeft') + g('eyeLookInRight')) / 2;
    const lookUserRight = (g('eyeLookOutRight') + g('eyeLookInLeft')) / 2;
    const lookDown = (g('eyeLookDownLeft') + g('eyeLookDownRight')) / 2;
    const lookUp = (g('eyeLookUpLeft') + g('eyeLookUpRight')) / 2;

    const raw = {
      angleX: clamp((yawRaw - calib.yaw) * 85 * hs, -30, 30),
      angleY: clamp(-(pitchRaw - calib.pitch) * 110 * hs, -30, 30),
      angleZ: clamp(roll * hs, -30, 30),
      eyeL: eyeOpen(blinkScreenL),
      eyeR: eyeOpen(blinkScreenR),
      ballX: clamp((mir ? lookUserLeft - lookUserRight : lookUserRight - lookUserLeft) * 1.8 * fs, -1, 1),
      ballY: clamp((lookDown - lookUp) * 1.6 * fs, -1, 1),
      mouthOpen: clamp(g('jawOpen') * 2.2 * fs, 0, 1),
      mouthForm: clamp(((g('mouthSmileLeft') + g('mouthSmileRight')) / 2 * 1.6 - (g('mouthFrownLeft') + g('mouthFrownRight')) / 2 * 1.4) * fs, -1, 1),
      brow: clamp((g('browInnerUp') * 1.2 + (g('browOuterUpLeft') + g('browOuterUpRight')) / 2 - (g('browDownLeft') + g('browDownRight')) / 2 * 1.2) * fs, -1, 1),
    };
    // 頭の向きだけ「なめらかさ」をかける（目と口は速く反応させる）
    const k = 1 - S.smooth / 100;
    for (const key of Object.keys(raw)) {
      const kk = key.startsWith('angle') ? k : Math.min(1, k + 0.35);
      sm[key] = sm[key] == null ? raw[key] : sm[key] + (raw[key] - sm[key]) * kk;
    }
    // まばたきは左右がそろいやすいように、近い時は平均する
    if (Math.abs(sm.eyeL - sm.eyeR) < 0.25) { const avg = (sm.eyeL + sm.eyeR) / 2; sm.eyeL = sm.eyeR = avg; }
    M.chara.setTrack(Object.assign({}, sm));
  }

  function calibrate() {
    if (!running || last.yawRaw == null) return M.toast('カメラをオンにしてから押してね');
    calib.yaw = last.yawRaw; calib.pitch = last.pitchRaw; calib.auto = false;
    M.toast('いまの向きを「正面」にしたよ');
  }

  // ---------- マイク ----------
  let micCtx = null, micStream = null, analyser = null, micBuf = null, micOn = false, noise = 0.01;
  async function toggleMic() {
    if (micOn) {
      micOn = false;
      micStream.getTracks().forEach((t) => t.stop());
      micCtx.close(); micCtx = null;
      M.chara.input.mic = 0;
      M.$('#micBtn').textContent = 'マイクをオン';
      M.$('#micMeter').style.width = '0';
      return;
    }
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      micCtx = new (window.AudioContext || window.webkitAudioContext)();
      const src = micCtx.createMediaStreamSource(micStream);
      analyser = micCtx.createAnalyser();
      analyser.fftSize = 1024;
      src.connect(analyser);
      micBuf = new Float32Array(analyser.fftSize);
      micOn = true;
      M.$('#micBtn').textContent = 'マイクをオフ';
      status('#micStatus', '話すと口が動きます。静かな時に口が開くなら感度を下げてね。', 'ok');
      micLoop();
    } catch (e) {
      status('#micStatus', 'マイクを使えませんでした。ブラウザの許可を確認してください。', 'err');
    }
  }
  function micLoop() {
    if (!micOn) return;
    requestAnimationFrame(micLoop);
    analyser.getFloatTimeDomainData(micBuf);
    let sum = 0;
    for (let i = 0; i < micBuf.length; i++) sum += micBuf[i] * micBuf[i];
    const rms = Math.sqrt(sum / micBuf.length);
    noise = rms < noise ? noise * 0.95 + rms * 0.05 : noise * 1.0005; // 背景ノイズの大きさをゆっくり学ぶ
    const level = clamp((rms - noise * 1.5) * S.micGain / 4, 0, 1);
    M.chara.input.mic = level;
    M.$('#micMeter').style.width = Math.round(level * 100) + '%';
  }

  // ---------- パネル ----------
  function setPanel(show) {
    M.$('#ctrl').hidden = !show;
    M.$('#openCtrl').hidden = show;
    if (!show) M.toast('Hキーか右上の⚙でパネルを戻せます');
  }

  function bind() {
    const grid = M.$('#expGrid');
    EXP_LIST.forEach(([id, label], i) => grid.append(M.el('button', { class: 'chip', type: 'button', 'data-exp': id, text: `${i + 1} ${label}`, onclick: () => setExp(id) })));
    const sel = M.$('#outfit');
    for (const [id, o] of Object.entries(M.chara.OUTFITS)) sel.append(M.el('option', { value: id, text: o.label }));
    sel.value = S.outfit;
    sel.addEventListener('change', () => { S.outfit = sel.value; save(); M.chara.setOutfit(S.outfit); });

    const num = (id, key) => {
      const e = M.$(id); e.value = S[key];
      e.addEventListener('input', () => { S[key] = Number(e.value); save(); applyView(); });
    };
    const chk = (id, key) => {
      const e = M.$(id); e.checked = !!S[key];
      e.addEventListener('change', () => { S[key] = e.checked; save(); applyView(); });
    };
    ['scale', 'posX', 'posY', 'sensHead', 'sensFace', 'smooth', 'micGain'].forEach((k) => num('#' + k, k));
    ['desk', 'idle', 'mouse', 'mirror', 'showCam'].forEach((k) => chk('#' + k, k));
    const bg = M.$('#bg'); bg.value = S.bg;
    bg.addEventListener('change', () => { S.bg = bg.value; save(); applyView(); });

    M.$('#camBtn').addEventListener('click', startCam);
    M.$('#calibBtn').addEventListener('click', calibrate);
    M.$('#micBtn').addEventListener('click', toggleMic);
    M.$('#hideCtrl').addEventListener('click', () => setPanel(false));
    M.$('#openCtrl').addEventListener('click', () => setPanel(true));

    window.addEventListener('keydown', (e) => {
      if (e.target.matches('input, select, textarea')) return;
      if (e.key === 'h' || e.key === 'H') setPanel(M.$('#ctrl').hidden);
      const n = Number(e.key);
      if (n >= 1 && n <= EXP_LIST.length) setExp(EXP_LIST[n - 1][0]);
      if (e.key === '0') setExp('smile');
      if (e.key === ' ') { e.preventDefault(); M.chara.hop(); }
    });
  }

  function init() {
    M.chara.mount(M.$('#chara'));
    M.chara.setOutfit(S.outfit);
    bind();
    setExp(S.exp);
    applyView();
    if (q.get('panel') === '0') setPanel(false);
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', M.studio.init);
