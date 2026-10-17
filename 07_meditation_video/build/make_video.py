"""台本から瞑想動画を1本作る。

使い方
  python3 make_video.py forest              # 10分版
  python3 make_video.py riverside --short   # 3分版
  python3 make_video.py shrine --start 180 --duration 40   # 一部だけ試し書き出し

できるもの（../output/）
  <場所>.mp4 / <場所>_3min.mp4 … 動画（1920×1080、24fps）
  <場所>_thumbnail.jpg         … サムネイル（1280×720）
  <場所>_chapters.txt          … 概要欄に貼る目次（実際の時刻）
"""
import argparse
import json
import re
import subprocess
import time
import wave
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

import ambience
import narration
import visuals as V

HERE = Path(__file__).parent
OUT = HERE.parent / "output"
FONT_DIR = HERE / "assets/fonts"
FONT = FONT_DIR / "ZenMaruGothic-Regular.ttf"
SR = narration.SR

TITLE = {
    "forest": "森の音と、やさしい言葉",
    "riverside": "川のせせらぎと、やさしい言葉",
    "shrine": "朝の森の静けさと、やさしい言葉",
}
ENTER = {"forest": "森の中へ", "riverside": "川辺へ", "shrine": "朝の森へ"}
CHAPTER_NAME = {"環境音だけ": "環境音", "導入": "はじまり", "呼吸": "呼吸", "アファメーション": "アファメーション",
                "戻る": "おわり"}

CUT = 55.0       # 1カットの長さ（秒）
DISSOLVE = 4.0   # 切り替えのディゾルブ（秒）


# ---- 音 ----------------------------------------------------------------

def write_wav(path, stereo):
    pcm = (np.clip(stereo, -1, 1) * 32767).astype("<i2").T.copy()
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def mix(voice, amb):
    n = len(voice)
    amb = amb[:, :n]
    out = amb + voice[None, :]
    fade_in = np.minimum(1, np.arange(n) / (4 * SR))
    fade_out = np.minimum(1, (n - np.arange(n)) / (8 * SR))
    out *= (fade_in * fade_out)[None, :]
    peak = np.abs(out).max()
    if peak > 0.89:
        out *= 0.89 / peak
    return out.astype(np.float32)


def loudnorm(src, dst, target=-16):
    """EBU R128 の2パスで -16 LUFS にそろえる（YouTubeでも小さすぎず大きすぎない）。"""
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(src), "-af",
                        f"loudnorm=I={target}:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"],
                       capture_output=True, text=True)
    m = json.loads(r.stderr[r.stderr.rindex("{"):])
    af = (f"loudnorm=I={target}:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
          f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(src), "-af", af,
                    "-ar", str(SR), str(dst)], check=True)


# ---- 字幕 ---------------------------------------------------------------

def ass_time(t):
    t = max(t, 0)
    return f"{int(t // 3600)}:{int(t % 3600 // 60):02d}:{t % 60:05.2f}"


def write_ass(path, events, title, offset=0.0, end_note=None, total=0.0):
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {V.W}
PlayResY: {V.H}
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Aff,Zen Maru Gothic,54,&H08FFFFFF,&H00FFFFFF,&H90303030,&H90000000,1,0,0,0,100,100,3,0,1,1.2,2.5,2,80,80,96,1
Style: Title,Zen Maru Gothic,58,&H10FFFFFF,&H00FFFFFF,&H50000000,&H78000000,0,0,0,0,100,100,6,0,1,0,2,5,80,80,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    rows = []
    if offset < 11:
        rows.append(f"Dialogue: 0,{ass_time(3 - offset)},{ass_time(11 - offset)},Title,,0,0,0,,{{\\fad(1500,1800)\\blur2}}{title}")
    if end_note:
        rows.append(f"Dialogue: 0,{ass_time(total - 12 - offset)},{ass_time(total - 3 - offset)},Aff,,0,0,0,,{{\\fad(1200,1500)\\blur1.5\\fs40}}{end_note}")
    prev = None
    for e in events:
        if e["section"] != "アファメーション" or "言葉を置いて" in e["text"] or "しっくりこない" in e["text"]:
            continue
        if prev and prev["text"] == e["text"]:  # 同じ言葉の2回目は1つの表示にまとめる
            prev["end_show"] = e["end"] + min(4.0, e["pause"] - 1.0)
            continue
        prev = {"text": e["text"], "start": e["start"] - 0.2, "end_show": e["end"] + min(4.0, e["pause"] - 1.0)}
        rows.append(prev)
    lines = [r if isinstance(r, str) else
             f"Dialogue: 0,{ass_time(r['start'] - offset)},{ass_time(r['end_show'] - offset)},Aff,,0,0,0,,{{\\fad(700,1000)\\blur2}}{r['text']}"
             for r in rows]
    Path(path).write_text(head + "\n".join(lines) + "\n", encoding="utf-8")


# ---- 目次、サムネイル ------------------------------------------------------

def write_chapters(path, chapters, scene):
    out = []
    for t, label in chapters:
        if "フェードアウト" in label:
            continue
        name = ENTER[scene] if label == "場所に入る" else CHAPTER_NAME.get(label, label.split("（")[0])
        out.append(f"{int(t // 60)}:{int(t % 60):02d} {name}")
    Path(path).write_text("\n".join(out) + "\n", encoding="utf-8")
    return out


def thumb_text(md):
    body = Path(md).read_text(encoding="utf-8").split("サムネイル文字")[1].split("\n## ")[0]
    items = [l[1:].strip() for l in body.splitlines() if l.startswith("・")]
    main = items[0]
    sub = re.sub(r"^（小さく）", "", items[1]) if len(items) > 1 else ""
    return main, sub


def thumbnail(comp, md, path):
    img = Image.fromarray(V.to_u8(comp.frame(30.0))).resize((1280, 720), Image.LANCZOS)
    main, sub = thumb_text(md)
    big = ImageFont.truetype(str(FONT), 92)
    small = ImageFont.truetype(str(FONT), 40)
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    wb = d.textlength(main, font=big)
    ws = d.textlength(sub, font=small)
    y = 720 * 0.40
    shadow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ds = ImageDraw.Draw(shadow)
    ds.text(((1280 - wb) / 2, y), main, font=big, fill=(0, 0, 0, 170))
    ds.text(((1280 - ws) / 2, y + 128), sub, font=small, fill=(0, 0, 0, 170))
    shadow = shadow.filter(ImageFilter.GaussianBlur(10))
    d.text(((1280 - wb) / 2, y), main, font=big, fill=(255, 255, 252, 255))
    d.text(((1280 - ws) / 2, y + 128), sub, font=small, fill=(255, 255, 252, 235))
    out = Image.alpha_composite(Image.alpha_composite(img.convert("RGBA"), shadow), layer)
    out.convert("RGB").save(path, quality=92)


# ---- 映像 ---------------------------------------------------------------

def schedule(total, n_comp):
    """何秒にどの構図か。(開始, 構図番号) のリスト。"""
    s, t, k = [], 0.0, 0
    while t < total:
        s.append((t, k % n_comp))
        t += CUT
        k += 1
    return s


def render(scene, comps, total, start, dur, wav, ass, out_path):
    sched = schedule(total, len(comps))
    vf = (f"subtitles={ass}:fontsdir={FONT_DIR},"
          f"fade=t=in:st=0:d=3,fade=t=out:st={max(dur - 5, 0):.2f}:d=5,format=yuv420p")
    cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
           "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{V.W}x{V.H}", "-r", str(V.FPS), "-i", "-",
           "-ss", f"{start:.3f}", "-t", f"{dur:.3f}", "-i", str(wav),
           "-vf", vf, "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-tune", "film",
           "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-shortest", str(out_path)]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    dither = (np.random.default_rng(0).random((V.H, V.W, 1)).astype(np.float32) - 0.5) / 255
    n = int(round(dur * V.FPS))
    t0 = time.time()
    for i in range(n):
        t = start + i / V.FPS
        idx = max(j for j, (ts, _) in enumerate(sched) if ts <= t)
        ts, k = sched[idx]
        f = comps[k].frame(t)
        if idx > 0 and t - ts < DISSOLVE:  # 前のカットから溶けるように切り替え
            a = float(V.smooth(0, 1, (t - ts) / DISSOLVE))
            f = comps[sched[idx - 1][1]].frame(t) * (1 - a) + f * a
        p.stdin.write(V.to_u8(f + dither).tobytes())
        if i % (V.FPS * 30) == 0:
            el = time.time() - t0
            print(f"  {scene}: {i / V.FPS:6.0f}s / {dur:.0f}s  ({el / 60:.1f}分経過)", flush=True)
    p.stdin.close()
    p.wait()
    if p.returncode:
        raise SystemExit(f"ffmpeg failed ({p.returncode})")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("scene", choices=list(V.SCENES))
    ap.add_argument("--short", action="store_true", help="3分版（台本の「台本（3分版）」を使う）")
    ap.add_argument("--start", type=float, default=0.0)
    ap.add_argument("--duration", type=float, default=None)
    a = ap.parse_args()

    OUT.mkdir(exist_ok=True)
    md = HERE.parent / f"{a.scene}.md"
    heading = "## 台本（3分版）" if a.short else "## 台本（10分版）"
    tag = a.scene + ("_3min" if a.short else "")

    print(f"[{tag}] ナレーション")
    voice, events, chapters = narration.build(md, heading)
    total = len(voice) / SR
    print(f"[{tag}] 環境音（{total:.0f}秒）")
    amb = ambience.SCENES[a.scene](total + 1)
    raw = OUT / f"{tag}_mix_raw.wav"
    wav = OUT / f"{tag}_mix.wav"
    write_wav(raw, mix(voice, amb))
    loudnorm(raw, wav)
    raw.unlink()

    start = a.start
    dur = a.duration or (total - start)
    ass = OUT / f"{tag}.ass"
    write_ass(ass, events, TITLE[a.scene], offset=start,
              end_note="続きは10分版で" if a.short else None, total=total)
    if not a.short and a.duration is None:
        ch = write_chapters(OUT / f"{a.scene}_chapters.txt", chapters, a.scene)
        print("\n".join("  " + c for c in ch))

    print(f"[{tag}] 構図を描く")
    kw = {}
    if a.scene == "riverside":
        leaf = [e["start"] for e in events if "葉っぱが一枚" in e["text"]]
        rest = [t for t, l in chapters if l.startswith("余韻")]
        kw["leaf_times"] = tuple(leaf + [t + 3 for t in rest]) or (8.0,)
    comps = [V.SCENES[a.scene](k, **kw) for k in range(3)]
    if not a.short and a.start == 0 and a.duration is None:
        thumbnail(comps[0], md, OUT / f"{a.scene}_thumbnail.jpg")

    suffix = "" if a.duration is None else f"_preview{int(start)}"
    out_path = OUT / f"{tag}{suffix}.mp4"
    print(f"[{tag}] 書き出し → {out_path.name}")
    render(tag, comps, total, start, dur, wav, ass, out_path)
    print(f"[{tag}] 完了 {out_path}")


if __name__ == "__main__":
    main()
