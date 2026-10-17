#!/usr/bin/env bash
# 動画生成に必要なものをそろえる（初回だけ）
set -euo pipefail
cd "$(dirname "$0")"

pip install --break-system-packages -q numpy scipy pillow pyopenjtalk-plus

mkdir -p assets
# 声：Open JTalk の男性音声 m001（修正BSDライセンス、名古屋工業大学）を高さを上げて中性的にして使う
if [ ! -f assets/m001/nitech_jp_atr503_m001.htsvoice ]; then
  curl -sSL -o assets/m001.tar.gz https://downloads.sourceforge.net/open-jtalk/hts_voice_nitech_jp_atr503_m001-1.05.tar.gz
  tar xzf assets/m001.tar.gz -C assets
  mv assets/hts_voice_nitech_jp_atr503_m001-1.05 assets/m001
  rm assets/m001.tar.gz
fi
# 字幕フォント：Zen Maru Gothic（SIL Open Font License 1.1）
if [ ! -f assets/fonts/ZenMaruGothic-Regular.ttf ]; then
  mkdir -p assets/fonts
  curl -sSL -o assets/fonts/ZenMaruGothic-Regular.ttf https://raw.githubusercontent.com/google/fonts/main/ofl/zenmarugothic/ZenMaruGothic-Regular.ttf
  curl -sSL -o assets/fonts/OFL.txt https://raw.githubusercontent.com/google/fonts/main/ofl/zenmarugothic/OFL.txt
fi
echo "ready"
