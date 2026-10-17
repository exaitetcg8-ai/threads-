"""台本（forest.md など）を読み、中性ボイスのナレーション音声とタイミングを作る。

台本の書き方のルール
・【0:40　導入】のように時刻が1つの見出し → ナレーションのパート
・【0:00〜0:40　環境音だけ】のように範囲の見出し → その長さだけ環境音のみ
・行末の（間N秒）→ 読み終えてからN秒あける
"""
import re
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
import pyopenjtalk
from pyopenjtalk.htsengine import HTSEngine
from scipy import signal

SR = 48000
HERE = Path(__file__).parent
VOICE = HERE / "assets/m001/nitech_jp_atr503_m001.htsvoice"

# 声の設定：男性音声を4半音上げて、性別がはっきりしない中音域（約175Hz）にする
SPEED = 0.82
HALF_TONE = 4.0

# 読み間違いの修正（表示は台本のまま、読みだけ差し替える）
READING_FIX = {
    "風にこすれる": "かぜにこすれる",
}

# 句読点で行が終わった時の自然な間（秒）
GAP_COMMA = 0.45
GAP_PERIOD = 0.9


@dataclass
class Line:
    text: str
    pause: float  # 読み終えてからの間（秒）


@dataclass
class Section:
    label: str
    silence: float = 0.0  # 範囲見出しの時の長さ
    lines: list = field(default_factory=list)


def _to_sec(t):
    m, s = t.split(":")
    return int(m) * 60 + int(s)


def parse_script(md_path, heading="## 台本（10分版）"):
    body = Path(md_path).read_text(encoding="utf-8").split(heading)[1]
    body = body.split("\n## ")[0]
    sections = []
    for raw in body.splitlines():
        s = raw.strip()
        h = re.match(r"^【(.+?)】$", s)
        if h:
            inner = h.group(1)
            rng = re.match(r"^(\d+:\d+)〜(\d+:\d+)[\s　]+(.+)$", inner)
            if rng:
                sec = Section(rng.group(3), silence=_to_sec(rng.group(2)) - _to_sec(rng.group(1)))
            else:
                sec = Section(re.sub(r"^\d+:\d+[\s　]+", "", inner))
            sections.append(sec)
            continue
        if not s or not sections or sections[-1].silence:
            continue
        m = re.search(r"（間(\d+)秒）$", s)
        if m:
            sections[-1].lines.append(Line(s[: m.start()], float(m.group(1))))
        else:
            sections[-1].lines.append(Line(s, GAP_COMMA if s.endswith("、") else GAP_PERIOD))
    return sections


_engine = None


def tts(text):
    global _engine
    if _engine is None:
        _engine = HTSEngine(str(VOICE).encode())
        _engine.set_speed(SPEED)
        _engine.add_half_tone(HALF_TONE)
    for k, v in READING_FIX.items():
        text = text.replace(k, v)
    labels = pyopenjtalk.extract_fullcontext(text)
    x = _engine.synthesize(labels).astype(np.float32) / 32768.0
    # 前後の無音を詰める
    idx = np.where(np.abs(x) > 0.01)[0]
    if len(idx):
        x = x[max(idx[0] - 960, 0): idx[-1] + 2400]
    return x


def _soften(x):
    """機械っぽさを和らげる：低域カット、高域を少し丸める、ごく薄い残響。"""
    sos = signal.butter(2, 90, "highpass", fs=SR, output="sos")
    x = signal.sosfilt(sos, x)
    sos = signal.butter(2, 6500, "lowpass", fs=SR, output="sos")
    x = 0.65 * signal.sosfilt(sos, x) + 0.35 * x
    # 合成した残響（1.1秒で減衰するノイズ）
    rng = np.random.default_rng(7)
    n = int(SR * 1.1)
    t = np.arange(n) / SR
    ir = rng.standard_normal(n) * np.exp(-t * 6.3)
    ir = signal.sosfilt(signal.butter(2, 3500, "lowpass", fs=SR, output="sos"), ir)
    ir /= np.sqrt((ir ** 2).sum())
    wet = signal.oaconvolve(x, ir)[: len(x)]
    return (x + 0.18 * wet).astype(np.float32)


def build(md_path, heading="## 台本（10分版）"):
    """ナレーション音声（mono, float32）と、各行・各パートの時刻を返す。"""
    sections = parse_script(md_path, heading)
    pieces, t = [], 0.0
    events, chapters = [], []
    for sec in sections:
        chapters.append((t, sec.label))
        if sec.silence:
            pieces.append(np.zeros(int(sec.silence * SR), np.float32))
            t += sec.silence
            continue
        for ln in sec.lines:
            v = tts(ln.text)
            dur = len(v) / SR
            events.append({"start": t, "end": t + dur, "pause": ln.pause,
                           "text": ln.text, "section": sec.label})
            pieces += [v, np.zeros(int(ln.pause * SR), np.float32)]
            t += dur + int(ln.pause * SR) / SR
    voice = _soften(np.concatenate(pieces))
    # 話している部分のRMSを揃える（目安 -18dBFS）
    speech = np.concatenate([voice[int(e["start"] * SR): int(e["end"] * SR)] for e in events])
    voice *= 10 ** (-18 / 20) / (np.sqrt((speech ** 2).mean()) + 1e-9)
    return voice, events, chapters
