"""環境音とパッド音を合成する（録音素材なし、すべて計算で作るので権利の心配がない）。

急な大きい音は入れない。鳥の声もまばらに、遠くで鳴っている程度にする。
"""
import numpy as np
from scipy import signal

SR = 48000


def _sos(kind, f, order=2):
    return signal.butter(order, f, kind, fs=SR, output="sos")


def _noise(n, rng):
    return rng.standard_normal(n).astype(np.float32)


def _slow_env(n, rng, rate_hz, lo, hi):
    """ゆっくり揺れる 0〜1 の包絡（風の強弱など）。"""
    k = max(int(n / SR * rate_hz * 4), 4)
    pts = rng.random(k)
    env = signal.resample(pts, n) if n < 2_000_000 else np.interp(
        np.linspace(0, k - 1, n), np.arange(k), pts)
    env = signal.sosfiltfilt(_sos("lowpass", rate_hz), env) if n < 2_000_000 else env
    env = (env - env.min()) / (np.ptp(env) + 1e-9)
    return (lo + (hi - lo) * env).astype(np.float32)


def _smooth_interp(n, rng, rate_hz, lo, hi):
    k = max(int(n / SR * rate_hz), 4)
    pts = rng.random(k + 2)
    x = np.linspace(0, k, n)
    i = np.floor(x).astype(int)
    f = x - i
    f = f * f * (3 - 2 * f)  # なめらかにつなぐ
    env = pts[i] * (1 - f) + pts[i + 1] * f
    return (lo + (hi - lo) * env).astype(np.float32)


def _reverb(x, seconds, seed=1):
    rng = np.random.default_rng(seed)
    n = int(SR * seconds)
    t = np.arange(n) / SR
    ir = rng.standard_normal(n) * np.exp(-t * 6.9 / seconds)
    ir = signal.sosfilt(_sos("lowpass", 4000), ir)
    ir /= np.sqrt((ir ** 2).sum())
    return signal.oaconvolve(x, ir)[: len(x)].astype(np.float32)


def _pan(x, p):
    """p: -1（左）〜 1（右）"""
    a = (p + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)])


def _place(out, sound, at, pan):
    i = int(at * SR)
    j = min(i + sound.shape[-1], out.shape[-1])
    if j > i:
        out[:, i:j] += _pan(sound[: j - i], pan)


# ---- 部品 ---------------------------------------------------------------

def leaves(n, rng, lo=900, hi=6500, gust_rate=0.08):
    out = []
    env = _smooth_interp(n, rng, gust_rate, 0.25, 1.0)
    for ch in range(2):
        x = signal.sosfilt(_sos("bandpass", [lo, hi]), _noise(n, rng))
        # 葉が細かくこすれる感じ：速い揺らぎを少し
        flutter = _smooth_interp(n, rng, 9, 0.6, 1.0)
        out.append(x * env * flutter)
    return np.stack(out).astype(np.float32)


def wind_low(n, rng, cutoff=280, rate=0.05):
    env = _smooth_interp(n, rng, rate, 0.3, 1.0)
    x = [signal.sosfilt(_sos("lowpass", cutoff), _noise(n, rng)) * env for _ in range(2)]
    return np.stack(x).astype(np.float32)


def bird_call(rng, kind="songbird"):
    """短いさえずり1回分。"""
    parts = []
    if kind == "songbird":
        notes = rng.integers(3, 7)
        base = rng.uniform(2600, 3800)
        for _ in range(notes):
            d = rng.uniform(0.05, 0.12)
            t = np.arange(int(d * SR)) / SR
            f0 = base * rng.uniform(0.85, 1.25)
            f1 = f0 * rng.uniform(1.1, 1.5)
            f = np.linspace(f0, f1, len(t)) + 120 * np.sin(2 * np.pi * 38 * t)
            ph = 2 * np.pi * np.cumsum(f) / SR
            tone = np.sin(ph) + 0.15 * np.sin(2 * ph)
            parts += [tone * np.hanning(len(t)), np.zeros(int(rng.uniform(0.03, 0.09) * SR))]
    else:  # 遠くの口笛のような2音（神社）
        for f0, f1, d in [(1900, 2050, 0.55), (2500, 2150, 0.35)]:
            t = np.arange(int(d * SR)) / SR
            f = np.linspace(f0, f1, len(t)) + 15 * np.sin(2 * np.pi * 6 * t)
            tone = np.sin(2 * np.pi * np.cumsum(f) / SR)
            env = np.minimum(1, t / 0.08) * np.minimum(1, (d - t) / 0.15)
            parts += [tone * env, np.zeros(int(0.12 * SR))]
    x = np.concatenate(parts).astype(np.float32)
    return signal.sosfilt(_sos("lowpass", 7000), x).astype(np.float32)


def bubbles(n, rng, per_sec=380, fmin=350, fmax=2400):
    """せせらぎ：小さな泡の音（周波数が上がりながら消える正弦波）をたくさん重ねる。"""
    out = np.zeros((2, n + SR), np.float32)
    count = int(n / SR * per_sec)
    starts = rng.integers(0, n, count)
    f0s = np.exp(rng.uniform(np.log(fmin), np.log(fmax), count))
    taus = rng.uniform(0.004, 0.022, count)
    amps = rng.uniform(0.2, 1.0, count) ** 2
    pans = rng.uniform(-0.8, 0.8, count)
    L = int(0.08 * SR)
    t = np.arange(L) / SR
    for s, f0, tau, a, p in zip(starts, f0s, taus, amps, pans):
        f = f0 * (1 + 0.9 * t / (tau * 6))  # 上がっていく
        g = a * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / tau)
        out[0, s:s + L] += g * np.cos((p + 1) * np.pi / 4)
        out[1, s:s + L] += g * np.sin((p + 1) * np.pi / 4)
    return out[:, :n]


def drip(rng):
    """手水に落ちるしずく1滴。"""
    L = int(0.25 * SR)
    t = np.arange(L) / SR
    f0 = rng.uniform(900, 1400)
    f = f0 * (1 + 2.5 * t)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.04)).astype(np.float32)


def gravel_step(rng):
    """玉砂利を踏む1歩：細かいクリックの粒をまとめる。"""
    L = int(0.22 * SR)
    x = np.zeros(L, np.float32)
    for _ in range(rng.integers(60, 110)):
        i = int(abs(rng.normal(0.05, 0.04)) * SR) % (L - 200)
        x[i:i + 200] += rng.standard_normal(200) * np.exp(-np.arange(200) / 30) * rng.uniform(0.2, 1)
    x = signal.sosfilt(_sos("bandpass", [1500, 6000]), x)
    return (x * np.hanning(L) ** 0.3).astype(np.float32)


def pad(n, rng, freqs, level=1.0):
    """テンポのない和音。ゆっくり息をするように強弱がつく。"""
    t = np.arange(n, dtype=np.float32) / SR
    out = np.zeros((2, n), np.float32)
    for k, f in enumerate(freqs):
        for ch, det in enumerate((-0.6, 0.6)):
            ph = rng.uniform(0, 2 * np.pi)
            lfo = 0.6 + 0.4 * np.sin(2 * np.pi * t / rng.uniform(17, 29) + ph)
            out[ch] += np.sin(2 * np.pi * (f + det) * t + ph) * lfo / (1 + 0.4 * k)
    out = signal.sosfilt(_sos("lowpass", 1800), out)
    return (out * level).astype(np.float32)


# ---- 場所ごとの組み合わせ --------------------------------------------------

def _rms(x):
    return float(np.sqrt((x ** 2).mean()) + 1e-12)


def _db(x, target_db):
    return x * (10 ** (target_db / 20) / _rms(x))


def forest(seconds, seed=11):
    rng = np.random.default_rng(seed)
    n = int(seconds * SR)
    mix = _db(leaves(n, rng), -33) + _db(wind_low(n, rng), -42)
    birds = np.zeros((2, n), np.float32)
    t = rng.uniform(3, 8)
    while t < seconds - 3:
        call = bird_call(rng) * rng.uniform(0.3, 1.0)
        _place(birds, call, t, rng.uniform(-0.9, 0.9))
        if rng.random() < 0.4:  # 少しあとで同じ鳥がもう一度
            _place(birds, call * 0.7, t + rng.uniform(1.2, 2.5), rng.uniform(-0.9, 0.9))
        t += rng.uniform(6, 16)
    birds = np.stack([_reverb(b, 1.6, 3) * 0.6 + b * 0.4 for b in birds])
    mix += _db(birds, -44) if _rms(birds) > 0 else 0
    mix += _db(pad(n, rng, [174.6, 220.0, 261.6, 392.0]), -40)  # F A C G
    return mix


def riverside(seconds, seed=22):
    rng = np.random.default_rng(seed)
    n = int(seconds * SR)
    water = bubbles(n, rng)
    water = signal.sosfilt(_sos("lowpass", 5000), water)  # 高い音をやわらげる
    body = np.stack([signal.sosfilt(_sos("bandpass", [180, 1800]), _noise(n, rng)) for _ in range(2)])
    body *= _smooth_interp(n, rng, 0.1, 0.7, 1.0)
    mix = _db(water, -32) + _db(body, -38) + _db(leaves(n, rng, 1200, 5000, 0.05), -46)
    birds = np.zeros((2, n), np.float32)
    t = rng.uniform(10, 20)
    while t < seconds - 3:
        _place(birds, bird_call(rng) * rng.uniform(0.3, 0.8), t, rng.uniform(-0.9, 0.9))
        t += rng.uniform(15, 35)
    birds = np.stack([_reverb(b, 1.8, 4) * 0.7 + b * 0.3 for b in birds])
    mix += _db(birds, -50)
    mix += _db(pad(n, rng, [146.8, 220.0, 329.6, 370.0]), -41)  # D A E F#
    return mix


def shrine(seconds, seed=33):
    rng = np.random.default_rng(seed)
    n = int(seconds * SR)
    mix = _db(leaves(n, rng, 400, 3000, 0.04), -35) + _db(wind_low(n, rng, 220, 0.03), -40)
    fx = np.zeros((2, n), np.float32)
    t = rng.uniform(12, 20)
    while t < seconds - 4:
        _place(fx, bird_call(rng, "whistle") * rng.uniform(0.4, 0.8), t, rng.uniform(-0.8, 0.8))
        t += rng.uniform(25, 50)
    t = rng.uniform(5, 12)
    while t < seconds - 2:
        _place(fx, drip(rng) * rng.uniform(0.25, 0.5), t, rng.uniform(-0.3, 0.3))
        t += rng.uniform(9, 22)
    # 遠くで玉砂利を踏む音を、数回だけ（台本「ひとつ、ふたつ」のあたりにも1回）
    for at in (95.0, 150.0, 470.0):
        p = rng.uniform(-0.7, 0.7)
        for k in range(rng.integers(4, 7)):
            _place(fx, gravel_step(rng) * 0.35 * (1 - 0.1 * k), at + k * 0.62, p)
    fx = np.stack([_reverb(c, 2.2, 5) * 0.65 + c * 0.35 for c in fx])
    mix += _db(fx, -45)
    mix += _db(pad(n, rng, [110.0, 164.8, 246.9, 293.7]), -41)  # A E B D
    return mix


SCENES = {"forest": forest, "riverside": riverside, "shrine": shrine}
