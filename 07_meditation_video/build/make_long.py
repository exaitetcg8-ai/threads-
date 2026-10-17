"""1時間版を作る。

使い方
  python3 make_long.py forest            # 60分
  python3 make_long.py shrine --minutes 30

最初の約9分は10分版と同じ流れ（導入→呼吸→場所→アファメーション→余韻）。
そのあとはアファメーションを1つずつ、約80秒おきにくり返す。
最後は起こす言葉を入れず「このまま、もう少し休んでいても、大丈夫です。」でしめる（作業用、寝る前用）。

映像は1時間ぶん毎フレーム描くと時間がかかりすぎるので、
継ぎ目のない5分30秒のループ映像を描いて、字幕と音声を重ねながら長さぶん流す。
"""
import argparse
import subprocess
import time

import numpy as np

import ambience
import make_video as MV
import narration
import visuals as V

LOOP = MV.CUT * 6  # 3つの構図を2回ずつ（330秒）


def render_loop(comps, out_path, label):
    """最後の4秒で最初のフレームへ溶けて戻る、つなぎ目のない映像。"""
    sched = MV.schedule(LOOP, len(comps))
    cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
           "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{V.W}x{V.H}", "-r", str(V.FPS), "-i", "-",
           "-c:v", "libx264", "-preset", "fast", "-crf", "14", "-pix_fmt", "yuv420p", str(out_path)]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    dither = (np.random.default_rng(0).random((V.H, V.W, 1)).astype(np.float32) - 0.5) / 255
    n = int(round(LOOP * V.FPS))
    t0 = time.time()
    for i in range(n):
        t = i / V.FPS
        idx = max(j for j, (ts, _) in enumerate(sched) if ts <= t)
        ts, k = sched[idx]
        f = comps[k].frame(t)
        if idx > 0 and t - ts < MV.DISSOLVE:
            a = float(V.smooth(0, 1, (t - ts) / MV.DISSOLVE))
            f = comps[sched[idx - 1][1]].frame(t) * (1 - a) + f * a
        if t > LOOP - MV.DISSOLVE:  # ループの頭（構図0、t=0）へ溶ける
            a = float(V.smooth(0, 1, (t - (LOOP - MV.DISSOLVE)) / MV.DISSOLVE))
            f = f * (1 - a) + comps[0].frame(t - LOOP) * a
        p.stdin.write(V.to_u8(f + dither).tobytes())
        if i % (V.FPS * 30) == 0:
            print(f"  {label} ループ映像: {t:5.0f}s / {LOOP:.0f}s  ({(time.time() - t0) / 60:.1f}分経過)", flush=True)
    p.stdin.close()
    p.wait()
    if p.returncode:
        raise SystemExit("ffmpeg failed (loop)")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("scene", choices=list(V.SCENES))
    ap.add_argument("--minutes", type=int, default=60)
    a = ap.parse_args()
    total = a.minutes * 60.0
    length = "1時間" if a.minutes == 60 else f"{a.minutes}分"
    tag = f"{a.scene}_{a.minutes}min"
    MV.OUT.mkdir(exist_ok=True)
    md = MV.HERE.parent / f"{a.scene}.md"

    print(f"[{tag}] ナレーション")
    voice, events, chapters = narration.build_long(md, total)
    print(f"[{tag}] 環境音（{len(voice) / narration.SR:.0f}秒）")
    amb = ambience.long(a.scene, len(voice) / narration.SR + 1)
    raw, wav = MV.OUT / f"{tag}_mix_raw.wav", MV.OUT / f"{tag}_mix.wav"
    MV.write_wav(raw, MV.mix(voice, amb))
    del amb
    MV.loudnorm(raw, wav)
    raw.unlink()
    dur = len(voice) / narration.SR

    ass = MV.OUT / f"{tag}.ass"
    MV.write_ass(ass, events, MV.TITLE[a.scene], total=dur)
    ch = MV.write_chapters(MV.OUT / f"{tag}_chapters.txt", chapters, a.scene)
    print("\n".join("  " + c for c in ch))

    print(f"[{tag}] 構図を描く")
    kw = {}
    if a.scene == "riverside":
        leaf = [e["start"] % LOOP for e in events if "葉っぱが一枚" in e["text"]]
        kw["leaf_times"] = tuple(leaf) or (60.0,)
    comps = [V.SCENES[a.scene](k, **kw) for k in range(3)]
    MV.thumbnail(comps[0], md, MV.OUT / f"{tag}_thumbnail.jpg", length=length)

    loop = MV.OUT / f"{a.scene}_loop.mp4"
    if not loop.exists():
        render_loop(comps, loop, tag)

    out = MV.OUT / f"{tag}.mp4"
    print(f"[{tag}] 書き出し → {out.name}")
    vf = (f"subtitles={ass}:fontsdir={MV.FONT_DIR},"
          f"fade=t=in:st=0:d=3,fade=t=out:st={dur - 8:.2f}:d=8,format=yuv420p")
    subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-stats_period", "60", "-stats",
                    "-stream_loop", "-1", "-i", str(loop), "-i", str(wav), "-map", "0:v", "-map", "1:a",
                    "-t", f"{dur:.3f}", "-vf", vf, "-c:v", "libx264", "-preset", "medium", "-crf", "21",
                    "-tune", "film", "-r", str(V.FPS), "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart",
                    str(out)], check=True)
    print(f"[{tag}] 完了 {out}")


if __name__ == "__main__":
    main()
