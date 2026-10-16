"""index.html + style.css + data.js + game.js を1ファイルにまとめる（Artifact公開用）。"""
import pathlib, re, sys
d = pathlib.Path(__file__).parent
html = (d / 'index.html').read_text()
head = re.search(r'<!--ARTIFACT-HEAD-START-->(.*?)<!--ARTIFACT-HEAD-END-->', html, re.S).group(1).strip()
body = re.search(r'<!--ARTIFACT-BODY-START-->(.*?)<!--ARTIFACT-BODY-END-->', html, re.S).group(1).strip()
css = (d / 'style.css').read_text()
js = (d / 'data.js').read_text() + '\n' + (d / 'game.js').read_text()
out = f"{head}\n<style>\n{css}</style>\n{body}\n<script>\n{js}</script>\n"
dest = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else d / 'hikari_hime_single.html'
dest.write_text(out)
print(dest, len(out))
