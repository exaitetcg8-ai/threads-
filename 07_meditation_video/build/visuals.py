"""映像を計算で描く（イラスト調）。実写やAI生成の素材に差し替える前の、そのまま公開できる版。

1つの場所につき3つの構図（カット）を作り、約1分ごとにゆっくりディゾルブで切り替える。
動きは「光のゆらぎ」「水の流れ」「霧」「浮かぶ光の粒」だけ。カメラは固定。
"""
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

W, H = 1920, 1080
FPS = 24


# ---- 道具 ---------------------------------------------------------------

def fbm(h, w, rng, base=4, octaves=5, persist=0.5, aspect=None):
    aspect = aspect or (w / h)
    out = np.zeros((h, w), np.float32)
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        gh = int(base * 2 ** o) + 2
        gw = int(gh * aspect) + 2
        g = rng.random((gh, gw)).astype(np.float32)
        out += amp * np.asarray(Image.fromarray(g, "F").resize((w, h), Image.BICUBIC))
        tot += amp
        amp *= persist
    out /= tot
    return (out - out.min()) / (np.ptp(out) + 1e-9)


def blur(a, s):
    if s <= 0:
        return a
    if a.ndim == 3:
        return np.stack([blur(a[..., c], s) for c in range(a.shape[2])], -1)
    if s > 6:  # 大きなぼかしは縮小してから
        f = int(s // 3)
        small = np.asarray(Image.fromarray(a, "F").resize((a.shape[1] // f, a.shape[0] // f), Image.BILINEAR))
        small = ndimage.gaussian_filter(small, s / f)
        return np.asarray(Image.fromarray(small.astype(np.float32), "F").resize((a.shape[1], a.shape[0]), Image.BICUBIC))
    return ndimage.gaussian_filter(a, s).astype(np.float32)


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def lerp(a, b, t):
    if np.ndim(t) == 2:
        t = t[..., None]
    return a * (1 - t) + b * t


def vgrad(colors, stops):
    """縦方向のグラデーション。"""
    y = np.linspace(0, 1, H, dtype=np.float32)
    ch = [np.interp(y, stops, [c[i] for c in colors]) for i in range(3)]
    col = np.stack(ch, -1).astype(np.float32)
    return np.repeat(col[:, None, :], W, axis=1)


YY, XX = np.mgrid[0:H, 0:W].astype(np.float32)


def vignette(strength=0.35):
    d = np.sqrt(((XX - W / 2) / (W / 2)) ** 2 + ((YY - H / 2) / (H / 2)) ** 2) / np.sqrt(2)
    return (1 - strength * smooth(0.35, 1.0, d)).astype(np.float32)


def rays(rng, sx, sy, n_layers=4, density=60, sharp=5.0, spread=None):
    """光の筋。sx, sy は光源（画面の外でもいい）。層ごとに別の筋を返す。"""
    ang = np.arctan2(XX - sx, YY - sy)
    dist = np.sqrt((XX - sx) ** 2 + (YY - sy) ** 2)
    a0, a1 = float(ang.min()), float(ang.max())
    layers = []
    for _ in range(n_layers):
        g = rng.random(density).astype(np.float32)
        p = np.interp(ang, np.linspace(a0, a1, density), g)
        p = np.clip((p - 0.55) * sharp, 0, 1)
        layers.append(p * np.exp(-dist / (1.3 * H)))
    return [blur(l.astype(np.float32), 3) for l in layers]


def trunk_mask(xc, w_top, w_bot, lean, y0=0, y1=H, soft=1.5, flare=0.0):
    """y1 が根元。flare で根元を少し広げる。"""
    x_center = xc + lean * (YY - H / 2)
    w = w_top + (w_bot - w_top) * (YY / H)
    if flare:
        w = w * (1 + flare * np.exp(-np.clip(y1 - YY, 0, None) / (w_bot * 1.2 + 1)))
    d = np.abs(XX - x_center) - w / 2
    m = 1 - smooth(-soft, soft, d)
    m *= (YY >= y0) * (1 - smooth(y1 - 1.5, y1 + 1.5, YY))
    # 円柱の陰影用：中心からの位置（-1〜1）
    u = np.clip((XX - x_center) / (w / 2 + 1e-6), -1, 1)
    return m.astype(np.float32), u.astype(np.float32)


def soft_sprite(r):
    k = int(r * 4) | 1
    y, x = np.mgrid[0:k, 0:k] - k // 2
    return np.exp(-(x * x + y * y) / (2 * r * r)).astype(np.float32)


class Motes:
    """浮かんでいる光の粒。"""

    def __init__(self, rng, n, region, weight_map=None, speed=8, size=(1.2, 3.0), bright=0.35):
        x0, y0, x1, y1 = region
        self.p = np.stack([rng.uniform(x0, x1, n), rng.uniform(y0, y1, n)], 1)
        self.v = np.stack([rng.uniform(-1, 1, n) * speed, -rng.uniform(0.2, 1, n) * speed * 0.6], 1)
        self.ph = rng.uniform(0, 2 * np.pi, n)
        self.fr = rng.uniform(0.05, 0.25, n)
        self.r = rng.uniform(*size, n)
        self.sprites = [soft_sprite(r) for r in self.r]
        self.region = region
        self.wmap = weight_map
        self.bright = bright

    def draw(self, L, t):
        x0, y0, x1, y1 = self.region
        pos = self.p + self.v * t
        pos[:, 0] += 12 * np.sin(2 * np.pi * self.fr * t + self.ph)
        pos[:, 0] = x0 + np.mod(pos[:, 0] - x0, x1 - x0)
        pos[:, 1] = y0 + np.mod(pos[:, 1] - y0, y1 - y0)
        tw = 0.55 + 0.45 * np.sin(2 * np.pi * self.fr * 2.3 * t + self.ph * 1.7)
        for (x, y), s, a in zip(pos, self.sprites, tw):
            k = s.shape[0] // 2
            xi, yi = int(x), int(y)
            if xi - k < 0 or yi - k < 0 or xi + k + 1 > W or yi + k + 1 > H:
                continue
            g = 1.0 if self.wmap is None else 0.25 + 0.75 * float(self.wmap[yi, xi])
            L[yi - k:yi + k + 1, xi - k:xi + k + 1] += s * (a * g * self.bright)


def wave(t, period, phase, lo=0.0, hi=1.0):
    # float() にしておかないと float32 の層が float64 に昇格して遅くなる
    return float(lo + (hi - lo) * (0.5 + 0.5 * np.sin(2 * np.pi * t / period + phase)))


class Composition:
    """1カット分：動かない絵（base）と、時間で強さが変わる光の層。"""

    def __init__(self):
        self.base = None
        self.light_layers = []  # (layer, period, phase, lo, hi)
        self.light_color = np.array([1.0, 0.93, 0.75], np.float32)
        self.motes = []
        self.extra = []  # frame を直接いじる関数 f(frame, t)

    def frame(self, t):
        L = np.zeros((H, W), np.float32)
        for layer, per, ph, lo, hi in self.light_layers:
            L += layer * wave(t, per, ph, lo, hi)
        for m in self.motes:
            m.draw(L, t)
        f = self.base.copy()
        for fn in self.extra:
            fn(f, t)
        # スクリーン合成（明るいところが白飛びしにくい）
        f = 1 - (1 - f) * (1 - L[..., None] * self.light_color)
        return f.astype(np.float32, copy=False)


# ---- 森林 ---------------------------------------------------------------

def forest(variant, seed=0):
    rng = np.random.default_rng(100 + variant * 7 + seed)
    light_left = variant != 1
    sx = W * (0.22 if light_left else 0.8)
    sy = -H * 0.45
    fog = np.array([0.60, 0.68, 0.55], np.float32)
    glow = np.array([0.93, 0.93, 0.78], np.float32)
    img = vgrad([glow, (0.74, 0.79, 0.64), fog, (0.36, 0.45, 0.30), (0.17, 0.24, 0.12)],
                [0.0, 0.28, 0.55, 0.72, 1.0])
    # 光源側を少し明るく
    img = lerp(img, glow, 0.35 * np.exp(-((XX - sx) ** 2 + (YY - H * 0.1) ** 2) / (2 * (W * 0.3) ** 2)))

    horizon = H * (0.62 if variant != 2 else 0.68)
    # 地面（苔）
    gtex = fbm(H, W, rng, base=6, octaves=6)
    ground = smooth(horizon - 20, horizon + 60, YY)
    moss = lerp(np.array([0.30, 0.40, 0.22], np.float32), np.array([0.12, 0.20, 0.08], np.float32),
                gtex * 0.7 + smooth(horizon, H, YY) * 0.5)
    img = lerp(img, lerp(moss, fog, 0.55 * (1 - smooth(horizon, H, YY))), ground)

    near_alpha = np.zeros((H, W), np.float32)
    n_layers = 5
    for li in range(n_layers):
        d = li / (n_layers - 1)  # 0:遠い 1:近い
        count = [16, 12, 8, 5, 3][li] + (3 if variant == 1 else 0)
        col_dark = np.array([0.11, 0.10, 0.08], np.float32)
        col = lerp(fog, col_dark, 0.2 + 0.8 * d ** 1.2)
        bark = fbm(H, W, rng, base=3, octaves=4, aspect=0.05)
        for _ in range(count):
            xc = rng.uniform(-0.05, 1.05) * W
            wb = rng.uniform(8, 18) * (1 + d * 7) * (1.3 if variant == 2 else 1.0)
            ybot = horizon + 8 + (H - horizon) * d ** 1.4 * rng.uniform(0.75, 1.3)
            m, u = trunk_mask(xc, wb * 0.75, wb, rng.uniform(-0.02, 0.02), y1=ybot,
                              soft=1 + (1 - d) * 3, flare=0.6)
            shadow = np.exp(-(((XX - xc) / (wb * 1.6)) ** 2 + ((YY - ybot) / (wb * 0.25 + 3)) ** 2))
            img = img * (1 - 0.35 * d * shadow)[..., None]
            lit = (u if light_left else -u)
            shade = 1.0 - 0.35 * (lit * 0.5 + 0.5) * d
            tex = 0.85 + 0.3 * (bark - 0.5) * d
            c = col[None, None, :] * (shade * tex)[..., None]
            c = lerp(c, np.array([0.55, 0.50, 0.32], np.float32), 0.25 * smooth(0.4, 1, -lit) * d)
            img = lerp(img, c, m)
            if li >= 3:
                near_alpha = np.maximum(near_alpha, m)
        if li == 2:  # 遠い木の間にうっすら霧
            img = lerp(img, fog, 0.12)

    # 林冠（上の葉）
    leaf_tex = fbm(H, W, rng, base=10, octaves=5)
    prof = 1 - smooth(H * 0.05, H * (0.38 if variant != 2 else 0.25), YY)
    canopy = smooth(0.42, 0.6, leaf_tex * 0.6 + prof * 0.7 - 0.1) * prof
    canopy = blur(canopy, 2)
    leaf_col = lerp(np.array([0.08, 0.15, 0.07], np.float32), np.array([0.25, 0.34, 0.12], np.float32),
                    fbm(H, W, rng, base=20, octaves=3) * 0.6)
    img = lerp(img, leaf_col, canopy * 0.92)
    near_alpha = np.maximum(near_alpha, canopy)

    # 下草
    under = smooth(0.6, 0.68, fbm(H, W, rng, base=40, octaves=3) * 0.7 + smooth(H * 0.8, H, YY) * 0.45)
    under *= smooth(horizon + 60, horizon + 200, YY)
    under = blur(under, 1.5)
    ucol = lerp(np.array([0.10, 0.17, 0.07], np.float32), np.array([0.22, 0.32, 0.12], np.float32),
                fbm(H, W, rng, base=60, octaves=2))
    img = lerp(img, ucol, under * 0.75)

    vig = vignette(0.4)
    c = Composition()
    c.base = (img * vig[..., None] * 0.95).astype(np.float32)
    occl = (1 - near_alpha * 0.9) * vig
    for k, r in enumerate(rays(rng, sx, sy, 4, density=70)):
        c.light_layers.append((r * occl * 0.33, rng.uniform(9, 17), rng.uniform(0, 6.3), 0.15, 1.0))
    # 地面の木漏れ日
    for k in range(3):
        spots = np.zeros((H, W), np.float32)
        for _ in range(26):
            x, y = rng.uniform(0, W), rng.uniform(horizon + 30, H)
            rx = rng.uniform(15, 60) * (0.6 + (y - horizon) / (H - horizon))
            spots += np.exp(-(((XX - x) / rx) ** 2 + ((YY - y) / (rx * 0.35)) ** 2))
        c.light_layers.append((np.clip(spots, 0, 1) * 0.22 * vig * (1 - under * 0.5),
                               rng.uniform(5, 9), rng.uniform(0, 6.3), 0.0, 1.0))
    raysum = sum(l[0] for l in c.light_layers[:4])
    raysum = raysum / (raysum.max() + 1e-6)
    c.motes.append(Motes(rng, 70, (0, H * 0.15, W, H * 0.9), raysum, speed=7, bright=0.4))
    return c


# ---- 川辺 ---------------------------------------------------------------

def leaf_sprite(size, rng):
    s = int(size * 2.2)
    im = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx, cy = s / 2, s / 2
    pts = []
    for a in np.linspace(0, 2 * np.pi, 40):
        r = size * (0.5 + 0.5 * abs(np.sin(a))) ** 0.8
        pts.append((cx + np.cos(a) * size, cy + np.sin(a) * size * 0.42 * (1 - 0.3 * np.cos(a))))
    d.polygon(pts, fill=(176, 120, 52, 235))
    d.line([(cx - size, cy), (cx + size * 1.1, cy)], fill=(120, 80, 30, 220), width=2)
    im = im.rotate(rng.uniform(-25, 25), resample=Image.BICUBIC)
    a = np.asarray(im).astype(np.float32) / 255
    return a[..., :3], a[..., 3]


def riverside(variant, seed=0, leaf_times=()):
    rng = np.random.default_rng(200 + variant * 7 + seed)
    evening = variant == 1
    if evening:
        sky = [(0.95, 0.82, 0.70), (0.86, 0.80, 0.78), (0.62, 0.70, 0.80)]
    else:
        sky = [(0.92, 0.93, 0.86), (0.80, 0.87, 0.88), (0.66, 0.78, 0.84)]
    far_bank = H * (0.30 if variant != 2 else 0.18)
    water_top = far_bank + H * 0.07
    near_bank = H * (0.86 if variant != 2 else 0.93)
    img = vgrad(sky, [0.0, 0.18, 0.32])

    # 遠くの木々（向こう岸）
    ridge = far_bank - H * 0.10 * fbm(1, W, rng, base=5, octaves=3, aspect=W)[0][None, :] - H * 0.03
    trees = smooth(-2, 2, YY - ridge)
    for _ in range(70):  # 丸い木のかたまり
        x = rng.uniform(-50, W + 50)
        r = rng.uniform(25, 70)
        yb = far_bank - rng.uniform(0.02, 0.09) * H
        trees = np.maximum(trees, 1 - smooth(r - 2, r + 2, np.sqrt((XX - x) ** 2 + ((YY - yb) * 1.25) ** 2)))
    trees = trees * (YY < water_top)
    tree_col = lerp(np.array([0.30, 0.42, 0.32], np.float32), np.array([0.55, 0.62, 0.55], np.float32),
                    0.4 + 0.3 * fbm(H, W, rng, base=16, octaves=4))
    if evening:
        tree_col = tree_col * np.array([0.9, 0.85, 0.85], np.float32)
    img = lerp(img, tree_col, trees)
    bank_col = np.array([0.38, 0.45, 0.30], np.float32)
    img = lerp(img, bank_col, smooth(far_bank + H * 0.03, water_top, YY) * (YY < water_top + 3))

    # 水面：空と木の映り込み＋水の色
    wy = (YY - water_top) / (near_bank - water_top)
    water = smooth(-1, 1, YY - water_top) * (1 - smooth(near_bank - 6, near_bank + 6, YY))
    refl_y = np.clip(2 * water_top - YY, 0, H - 1).astype(int)
    refl = img[refl_y, XX.astype(int)]
    refl = blur(refl, 4)
    deep = np.array([0.20, 0.36, 0.38], np.float32) if not evening else np.array([0.28, 0.33, 0.42], np.float32)
    wcol = lerp(refl * 0.85, deep, np.clip(0.25 + 0.5 * wy, 0, 0.75))
    # 手前の浅瀬に小石が透ける
    peb = fbm(H, W, rng, base=24, octaves=3)
    peb = smooth(0.55, 0.62, peb) * smooth(0.45, 1.0, wy)
    wcol = lerp(wcol, np.array([0.48, 0.46, 0.38], np.float32), peb * 0.35)
    img = lerp(img, wcol, water)

    # 手前の岸（草と石）
    gt = fbm(H, W, rng, base=10, octaves=5)
    edge = near_bank + 25 * (fbm(1, W, rng, base=8, octaves=4, aspect=W)[0][None, :] - 0.5)
    bank = smooth(-3, 3, YY - edge)
    img = lerp(img, lerp(np.array([0.30, 0.38, 0.20], np.float32), np.array([0.13, 0.20, 0.10], np.float32), gt), bank)
    blades = Image.new("F", (W, H), 0.0)
    dr = ImageDraw.Draw(blades)
    for _ in range(1400):
        x = rng.uniform(0, W)
        y = float(edge[0, min(int(x), W - 1)]) + rng.uniform(0, H - near_bank + 20)
        hgt = rng.uniform(20, 70)
        dr.line([(x, y), (x + rng.uniform(-14, 14), y - hgt)], fill=float(rng.uniform(0.4, 1.0)), width=2)
    blades = blur(np.asarray(blades, np.float32), 0.7)
    img = lerp(img, np.array([0.16, 0.24, 0.11], np.float32), np.clip(blades, 0, 1) * 0.9)

    vig = vignette(0.35)
    c = Composition()
    c.light_color = np.array([1.0, 0.95, 0.85], np.float32) if not evening else np.array([1.0, 0.86, 0.70], np.float32)
    c.base = (img * vig[..., None]).astype(np.float32)

    # 流れ：横に伸びた模様を、奥はゆっくり手前は速く流す
    pad = 400
    streak = fbm(H, W + pad, rng, base=40, octaves=3, aspect=(W + pad) / H / 12)
    streak = (streak - 0.5) * water[:, :1].repeat(1, 1)
    bands = np.linspace(water_top, near_bank, 6).astype(int)
    amp = (0.06 * water)[..., None]
    shade = np.array([1.0, 1.0, 1.0], np.float32)

    def flow(f, t):
        for i in range(len(bands) - 1):
            y0, y1 = bands[i], bands[i + 1]
            speed = 10 + 40 * (i / (len(bands) - 2))  # px/秒
            off = int(t * speed) % pad
            s = streak[y0:y1, pad - off: pad - off + W]
            f[y0:y1] += s[..., None] * amp[y0:y1] * shade
    c.extra.append(flow)

    # きらめき
    bright = refl.mean(-1) * water * (1 - 0.5 * wy)
    for k in range(4):
        sp = np.zeros((H, W), np.float32)
        n = 260
        ys = rng.uniform(water_top, near_bank, n * 3)
        xs = rng.uniform(0, W, n * 3)
        keep = rng.random(n * 3) < bright[ys.astype(int), xs.astype(int)] ** 4
        for x, y in zip(xs[keep][:n], ys[keep][:n]):
            r = 1 + 2.5 * (y - water_top) / (near_bank - water_top)
            xi, yi = int(x), int(y)
            sp[yi, max(xi - int(r * 2), 0):xi + int(r * 2)] += 1  # 横長の光
        sp = blur(sp, 1.2)
        sp = np.clip(sp * 1.5, 0, 1) * water * vig
        c.light_layers.append((sp * 0.75, rng.uniform(0.9, 2.2), rng.uniform(0, 6.3), 0.0, 1.0))

    # 流れていく葉っぱ（台本の「葉っぱが一枚」に合わせる）
    sprites = [leaf_sprite(rng.uniform(14, 20), rng) for _ in range(3)]
    ly = water_top + (near_bank - water_top) * 0.55

    def leaf(f, t):
        for k, t0 in enumerate(leaf_times):
            dt = t - t0
            speed = 38.0
            x = -60 + dt * speed
            if dt < 0 or x > W + 60:
                continue
            rgb, a = sprites[k % len(sprites)]
            y = ly + 6 * np.sin(dt * 0.9) + (k % 3 - 1) * 40
            xi, yi = int(x - rgb.shape[1] / 2), int(y - rgb.shape[0] / 2)
            x0, y0 = max(xi, 0), max(yi, 0)
            x1, y1 = min(xi + rgb.shape[1], W), min(yi + rgb.shape[0], H)
            if x1 <= x0 or y1 <= y0:
                continue
            sa = a[y0 - yi:y1 - yi, x0 - xi:x1 - xi, None]
            f[y0:y1, x0:x1] = f[y0:y1, x0:x1] * (1 - sa) + rgb[y0 - yi:y1 - yi, x0 - xi:x1 - xi] * sa * 0.85
    c.extra.append(leaf)
    c.motes.append(Motes(rng, 25, (0, H * 0.1, W, water_top + 80), None, speed=5, size=(1.0, 2.2), bright=0.25))
    return c


# ---- 神社 ---------------------------------------------------------------

def torii(img, cx, base_y, h, col, alpha=1.0):
    """遠くに小さく見える鳥居。"""
    w = h * 1.15
    m = np.zeros((H, W), np.float32)
    pw = max(h * 0.07, 2)
    for px in (cx - w * 0.36, cx + w * 0.36):
        mm, _ = trunk_mask(px, pw * 0.9, pw, 0, y0=base_y - h * 0.92, y1=base_y, soft=0.8)
        m = np.maximum(m, mm)
    # 笠木（少し反った上の横木）
    curve = (h * 0.06) * ((XX - cx) / (w * 0.62)) ** 2
    top = base_y - h - curve
    kasagi = (np.abs(XX - cx) < w * 0.62) * smooth(-1, 1, YY - top) * (1 - smooth(-1, 1, YY - (top + h * 0.09)))
    nuki_y = base_y - h * 0.7
    nuki = (np.abs(XX - cx) < w * 0.48) * smooth(-1, 1, YY - nuki_y) * (1 - smooth(-1, 1, YY - (nuki_y + h * 0.06)))
    m = np.maximum(m, np.maximum(kasagi, nuki).astype(np.float32))
    return lerp(img, col, m * alpha)


def lantern(img, cx, base_y, h, col, moss, rng):
    """石灯籠のシルエット。"""
    parts = [  # (下からの高さ比, 上端, 幅比)
        (0.00, 0.10, 0.55), (0.10, 0.45, 0.16), (0.45, 0.52, 0.42),
        (0.52, 0.72, 0.30), (0.72, 0.86, 0.62), (0.86, 1.00, 0.10),
    ]
    m = np.zeros((H, W), np.float32)
    for y0r, y1r, wr in parts:
        y0, y1 = base_y - h * y1r, base_y - h * y0r
        ww = h * wr / 2
        if wr == 0.62:  # 屋根は台形
            ww = ww * (0.3 + 0.7 * np.clip((YY - y0) / (y1 - y0 + 1e-6), 0, 1))
        m = np.maximum(m, (np.abs(XX - cx) < ww) * smooth(-1, 1, YY - y0) * (1 - smooth(-1, 1, YY - y1)))
    window = (np.abs(XX - cx) < h * 0.07) * (YY > base_y - h * 0.68) * (YY < base_y - h * 0.57)
    m = np.clip(m - window * 0.7, 0, 1).astype(np.float32)
    tex = fbm(H, W, rng, base=40, octaves=3)
    c = lerp(col[None, None, :] * (0.85 + 0.3 * tex)[..., None], moss, smooth(0.6, 0.8, tex) * 0.6)
    return lerp(img, c, blur(m, 0.8))


def shrine(variant, seed=0):
    rng = np.random.default_rng(300 + variant * 7 + seed)
    mist = np.array([0.80, 0.82, 0.78], np.float32)
    img = vgrad([(0.95, 0.93, 0.85), (0.84, 0.85, 0.80), mist, (0.55, 0.56, 0.50), (0.40, 0.40, 0.35)],
                [0.0, 0.25, 0.5, 0.75, 1.0])
    vp_x = W * (0.56 if variant == 0 else 0.42)
    vp_y = H * 0.55
    # 参道（遠近のある石畳）と玉砂利
    t = np.clip((YY - vp_y) / (H - vp_y), 0, 1)
    half = 18 + t * W * 0.33
    path = (np.abs(XX - vp_x - (W * 0.08 if variant == 2 else 0) * t) < half) * (YY > vp_y)
    gravel = (YY > vp_y) * 1.0
    gtex = fbm(H, W, rng, base=60, octaves=2)
    gcol = lerp(np.array([0.70, 0.69, 0.64], np.float32), np.array([0.52, 0.51, 0.47], np.float32), gtex)
    img = lerp(img, lerp(gcol, mist, 0.6 * (1 - t)), smooth(vp_y - 5, vp_y + 30, YY) * gravel)
    # 石畳の継ぎ目
    rows = np.sin(1.0 / (t + 0.04) * 3.0) > 0.96
    stone = lerp(np.array([0.62, 0.60, 0.55], np.float32), np.array([0.48, 0.47, 0.43], np.float32),
                 fbm(H, W, rng, base=12, octaves=4))
    stone = lerp(stone, stone * 0.7, rows.astype(np.float32))
    img = lerp(img, lerp(stone, mist, 0.65 * (1 - t)), path.astype(np.float32) * smooth(vp_y, vp_y + 30, YY))

    if variant == 0:
        img = torii(img, vp_x, vp_y + 4, H * 0.13, np.array([0.70, 0.42, 0.33], np.float32), alpha=0.55)

    # 杉の木立（まっすぐ、高い）
    near_alpha = np.zeros((H, W), np.float32)
    for li in range(5):
        d = li / 4
        col = lerp(mist, np.array([0.22, 0.15, 0.11], np.float32), 0.15 + 0.85 * d ** 1.3)
        bark = fbm(H, W, rng, base=3, octaves=4, aspect=0.04)
        for _ in range([18, 12, 8, 5, 3][li]):
            side = rng.choice([-1, 1])
            gap = W * (0.10 + 0.06 * (1 - d))
            xc = vp_x + side * (gap + rng.uniform(0, 1) ** 1.3 * W * 0.55) * (0.4 + d)
            wb = rng.uniform(10, 16) * (1 + d * 8)
            ybot = vp_y + 6 + (H - vp_y) * d ** 1.3 * rng.uniform(0.8, 1.3)
            m, u = trunk_mask(xc, wb * 0.9, wb, 0, y1=ybot, soft=1 + (1 - d) * 3, flare=0.5)
            shadow = np.exp(-(((XX - xc) / (wb * 1.8)) ** 2 + ((YY - ybot) / (wb * 0.2 + 3)) ** 2))
            img = img * (1 - 0.3 * d * shadow)[..., None]
            shade = 1 - 0.4 * (u * 0.5 + 0.5) * d
            c = col[None, None, :] * (shade * (0.85 + 0.3 * (bark - 0.5) * d))[..., None]
            img = lerp(img, c, m)
            if li >= 3:
                near_alpha = np.maximum(near_alpha, m)
        img = lerp(img, mist, 0.08)

    if variant == 1:
        img = lantern(img, W * 0.68, H * 0.93, H * 0.48, np.array([0.50, 0.50, 0.46], np.float32),
                      np.array([0.30, 0.38, 0.22], np.float32), rng)

    # 上の暗い杉の葉
    canopy = smooth(0.45, 0.62, fbm(H, W, rng, base=9, octaves=5) * 0.6 + (1 - smooth(0, H * 0.22, YY)) * 0.7 - 0.1)
    canopy *= 1 - smooth(H * 0.05, H * 0.3, YY)
    img = lerp(img, np.array([0.12, 0.18, 0.13], np.float32), blur(canopy, 2) * 0.9)
    near_alpha = np.maximum(near_alpha, canopy)

    vig = vignette(0.38)
    c = Composition()
    c.light_color = np.array([1.0, 0.95, 0.82], np.float32)
    c.base = (img * vig[..., None]).astype(np.float32)
    sx = W * (0.85 if variant != 1 else 0.25)
    for r in rays(rng, sx, -H * 0.5, 4, density=55, sharp=4.0):
        c.light_layers.append((r * (1 - near_alpha * 0.9) * vig * (0.30 if variant == 2 else 0.22),
                               rng.uniform(11, 19), rng.uniform(0, 6.3), 0.2, 1.0))

    # 流れる朝もや
    pad = 600
    fog_tex = fbm(H, W + pad, rng, base=3, octaves=4, aspect=(W + pad) / H / 1.5)
    fog_mask = (smooth(H * 0.25, H * 0.5, YY) * (1 - smooth(H * 0.62, H * 0.95, YY)) * 0.32)[..., None]

    def drift(f, t):
        off = int(t * 6) % pad
        a = fog_tex[:, off:off + W, None] * fog_mask
        f *= 1 - a
        f += a * mist
    c.extra.append(drift)
    c.motes.append(Motes(rng, 40, (0, H * 0.15, W, H * 0.85), None, speed=4, size=(1.0, 2.4), bright=0.28))
    return c


SCENES = {"forest": forest, "riverside": riverside, "shrine": shrine}


def to_u8(f):
    return (np.clip(f, 0, 1) * 255 + 0.5).astype(np.uint8)
